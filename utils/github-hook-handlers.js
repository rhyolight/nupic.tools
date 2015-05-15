var exec = require('child_process').exec
  , _ = require('lodash')
  , log = require('./logger').logger
  , utils = require('./general')
  , sendMail = require('./mailman')
  , shaValidator = require('./sha-validator')
  , TRAVIS_CONTEXT = 'continuous-integration/travis-ci'
    // All the validator modules
  , validators = []
  , repoClients
  , config
  ;

/******************************************************************************/
/* Utility Functions
/******************************************************************************/

function isExternalContext(context) {
    return ! _.contains(_.map(validators, function(validator) {
        return validator.name;
    }), context);
}

function executeCommand(command) {
    log.warn('Executing hook command "%s"', command);
    exec(command, function (error, stdout, stderr) {
        log.debug(stdout);
        if (stderr) { log.warn(stderr); }
        if (error !== null) {
            log.error('command execution error: %s', error);
        }
    });
}

function getHooksForMonitorForType(type, repoClient) {
    var hooks = [];
    if (repoClient && repoClient.hooks && repoClient.hooks[type]) {
        // Could be a strong or an array of strings.
        if (typeof(repoClient.hooks[type]) == 'string') {
            hooks.push(repoClient.hooks[type]);
        } else {
            hooks = repoClient.hooks[type];
        }
    }
    return hooks;
}

function getPushHooksForMonitor(repoClient) {
    return getHooksForMonitorForType('push', repoClient);
}

function getBuildHooksForMonitor(repoClient) {
    return getHooksForMonitorForType('build', repoClient);
}

function getTagHooksForMonitor(repoClient) {
    return getHooksForMonitorForType('tag', repoClient);
}

/******************************************************************************/
/* Event Handlers
/******************************************************************************/


function gollumHandler(payload, callback) {
    var notificationSettings = config.notifications;
    if (notificationSettings && notificationSettings.gollum) {
        var to = notificationSettings.gollum
          , repo = payload.repository.full_name
          , editor = payload.sender.login
          , subject = '[wiki-change] ' + repo + ' updated by ' + editor
          , body = ''
          ;
        _.each(payload.pages, function(page) {
            body += page.title + ' was ' + page.action + ': ' + page.html_url + '\n\n';
        });
        sendMail(to, subject, body, callback);
    }
}

function issueCommentHandler(payload, callback) {
    var prNumber = payload.issue.number
      , repoSlug = payload.repository.full_name
      , repoClient = repoClients[repoSlug]
      ;
    repoClient.getLastCommitOnPullRequest(prNumber, function(err, commit) {
        var login = undefined;
        if (! commit.author) {
            login = commit.commit.author.login || commit.commit.author.name;
        } else {
            login = commit.author.login || commit.author.name;
        }
        shaValidator.performCompleteValidation(
            commit.sha
          , login
          , repoClient
          , validators
          , true
          , callback
        );
    });
}

function issuesHandler(payload, callback) {}

/* Handles pull_request events from GitHub. */
function pullRequestHandler(payload, callback) {
    var action = payload.action
      , pullRequest = payload.pull_request
      , repoSlug = payload.repository.full_name
      , repoClient = repoClients[repoSlug]
      , githubUser = pullRequest.user.login
      , head = pullRequest.head
      , sha = head.sha
      ;

    log.info(
        'Received pull request "%s" on %s from %s',
        action, repoClient.toString(), githubUser
    );

    if (action == 'closed') {
        // If this pull request just got merged, we need to re-trigger the
        // Travis-CI jobs of all the other open pull requests.
        if (pullRequest.merged) {
            log.debug('A PR just merged. Re-validating open pull requests...');
            contributors.getAll(repoClient.contributorsUrl,
                function(err, contributors) {
                    if (err) return callback(err);
                    shaValidator.triggerBuildsOnAllOpenPullRequests(
                        repoClient
                    );
                }
            );
        } else {
            if (callback) callback();
        }
    } else {
        utils.lastStatusWasExternal(repoClient, sha, function(external) {
            if (external) {
                shaValidator.performCompleteValidation(
                    sha
                    , githubUser
                    , repoClient
                    , validators
                    , true
                    , callback
                );
            } else {
                // ignore statuses that were created by this server
                log.debug(
                    'Ignoring status created by nupic.tools for %s...', sha
                );
                if (callback) { callback(); }
            }
        });

    }
}

/*
 * Handles an event from Github that indicates that a PR has been merged into one
 * of the repositories. This could trigger a script to run locally in response,
 * called a "push hook", which are defined in the configuration of each repo as
 * hooks.push = 'path/to/script'.
 */
function pushHandler(payload, callback) {
    var repoSlug = payload.repository.full_name
      , repoClient = repoClients[repoSlug]
      , ref = payload.ref.split('/')
      , refType = ref[1]
      , refName = ref[2]
      , branch = undefined
      , tag = undefined
      , pushHooks = getPushHooksForMonitor(repoClient)
      , tagHooks = getTagHooksForMonitor(repoClient)
      ;
    if (refType == 'heads') {
        branch = refName;
    } else if (refType == 'tags') {
        tag = refName;
    }

    if (branch) {
        log.info('GitHub push event on %s:%s', repoSlug, branch);
        // Only process pushes to master, and only when there is a push hook
        // defined.
        if (branch == 'master') {
            _.each(pushHooks, function(hookCmd) {
                executeCommand(hookCmd);
            });
        }
    } else if (tag) {
        log.info('Github tag event on %s:%s', repoSlug, tag);
        _.each(tagHooks, function(hookCmd) {
            executeCommand(hookCmd);
        });
    }
    callback();
}

/*
 * Given a request payload from Github, and the RepositoryClient object associated
 * with this repo, this function retrieves all the known statuses for the repo,
 * assures that this status did not originate from this server (nupic.tools), then
 * performs a complete validation of the repository.
 */
function statusHandler(payload, callback) {
    var sha = payload.sha
      , state = payload.state
      , branches = payload.branches
      , context = payload.context
      , repoSlug = payload.repository.full_name
      , repoClient = repoClients[repoSlug]
      , cb = callback
      , isMaster = undefined
      , buildHooks = undefined
      ;

    log.info('State of %s has changed to "%s" for "%s".', sha, state, context);
    // A "success" state means that a build passed. If the build passed on the
    // master branch, we need to trigger a "build" hook, which might execute a
    // script to run in the /bin directory.
    isMaster = _.some(branches, function(branch) {
        return branch.name == 'master';
    });
    // If this was a successful build of the master branch, we want to trigger the
    // build success hook.
    if (state == 'success' && isMaster && context.indexOf(TRAVIS_CONTEXT) == 0) {
        buildHooks = getBuildHooksForMonitor(repoClient);
        log.info('Github build success event on %s', repoClient.toString());
        // Only process when there is a build hook defined.
        _.each(buildHooks, function(hookCmd) {
            executeCommand(hookCmd);
        });
    }
    // Only process state changes caused by external services (not this server).
    else if (isExternalContext(context)) {
        repoClient.getCommit(sha, function(err, commit) {
            if (! commit.author) {
                log.error('No commit author exists in the payload!', commit);
                return cb(
                    new Error('No commit author specified for sha: ' + sha)
                );
            }
            shaValidator.performCompleteValidation(
                sha
              , commit.author.login
              , repoClient
              , validators
              , true
              , cb
            );
        });
    } else {
        log.info('Ignoring state change.');
    }
}

module.exports = function(repositoryClients, dynamicValidators, appConfig) {
    repoClients = repositoryClients;
    config = appConfig;
    validators = dynamicValidators;
    return {
        gollum: gollumHandler
      , issue_comment: issueCommentHandler
      , issues: issuesHandler
      , pull_request: pullRequestHandler
      , push: pushHandler
      , status: statusHandler
    };
};
