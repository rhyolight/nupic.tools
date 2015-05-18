var exec = require('child_process').exec
  , _ = require('lodash')
  , log = require('./logger').logger
  , utils = require('./general')
  , gollumHandler = require('./hook-handlers/gollum')
  , issueCommentHandler = require('./hook-handlers/issue_comment')
  , pullRequestHandler= require('./hook-handlers/pull_request')
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
        if (stderr) { log.warn('STDERR: %s', stderr); }
        if (error) {
            log.error('Command execution error: %s', error);
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
                return callback(
                    new Error('No commit author specified for sha: ' + sha)
                );
            }
            shaValidator.performCompleteValidation(
                sha
              , commit.author.login
              , repoClient
              , validators
              , true
              , callback
            );
        });
    } else {
        log.info('Ignoring state change.');
        callback();
    }
}

module.exports = function(repositoryClients, dynamicValidators, appConfig) {
    repoClients = repositoryClients;
    config = appConfig;
    validators = dynamicValidators;
    return {
        gollum: gollumHandler
      , issue_comment: issueCommentHandler
      , pull_request: pullRequestHandler
      , push: pushHandler
      , status: statusHandler
    };
};
