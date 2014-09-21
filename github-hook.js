// This module provides a request handler for HTTP calls from Github web hooks.
var fs = require('fs'),
    _ = require('underscore'),
    log = require('./utils/logger').logger,
    utils = require('./utils/general'),
    contributors = require('./utils/contributors'),
    shaValidator = require('./utils/sha-validator'),
    exec = require('child_process').exec,
    VALIDATOR_DIR = 'validators',
    // All the validator modules
    dynamicValidatorModules = [],
    repoClients;

/**
 * Given the payload for a Github pull request notification and the associated
 * RepositoryClient object, this function either validates the PR, re-validates
 * all other open PRs (if the PR merged), or ignores it if not against 'master'.
 * @param action {string} Whether PR was opened, closed, etc.
 * @param pullRequest {object} the PR payload from Github.
 * @param repoClient {RepositoryClient} Repo client associated with this repo this
 *                                      PR was created against.
 * @param cb {function} Will be called when PR has been handled.
 */
function handlePullRequest(action, pullRequest, repoClient, cb) {
    var githubUser = pullRequest.user.login,
        head = pullRequest.head,
        base = pullRequest.base,
        sha = head.sha;

    log.log('Received pull request "' + action + '" from ' + githubUser);

    if (action == 'closed') {
        // If this pull request just got merged, we need to re-trigger the
        // Travis-CI jobs of all the other open pull requests.
        if (pullRequest.merged) {
            log.log('A PR just merged. Re-validating open pull requests...');
            contributors.getAll(repoClient.contributorsUrl,
                function(err, contributors) {
                    if (err) {
                        return cb(err);
                    }
                    shaValidator.triggerTravisBuildsOnAllOpenPullRequests(repoClient);
                }
            );
        } else {
            if (cb) { cb(); }
        }
    } else {

        utils.lastStatusWasExternal(repoClient, sha, function(external) {
            if (external) {
                // only runs validation if the PR is mergeable
                if(pullRequest.mergeable) {
                    shaValidator.performCompleteValidation(
                        sha,
                        githubUser,
                        repoClient,
                        dynamicValidatorModules,
                        true,
                        cb
                    );
                } else {
                    postStatusForNonMergeablePullRequest(sha, pullRequest, repoClient);
                    if (cb) { cb(); }
                }
            } else {
                // ignore statuses that were created by this server
                // TODO it should never get into this branch, but it's seen in production
                // just log it for further investigation
                log.warn('Ignoring status created by nupic.tools for ' + sha + '...');
                if (cb) { cb(); }
            }
        });

    }
}

/**
 * Given a request payload from Github, and the RepositoryClient object associated
 * with this repo, this function retrieves all the known statuses for the repo,
 * assures that this status did not originate from this server (nupic.tools), then
 * performs a complete validation of the repository.
 * @param sha {string} SHA of the tip of the PR.
 * @param state {string} State of the PR (opened, closed, merged, etc)
 * @param branches {Object[]} List of branches that came with the state change
 * @param repoClient {RepositoryClient} Repo client associated with this repo this
 *                                      PR was created against.
 * @param cb {function} Will be called when PR has been handled.
 */
function handleStateChange(sha, state, branches, repoClient, cb) {
    var isMaster,
        buildHooks = undefined;
    log.log('State of ' + sha + ' has changed to "' + state + '".');
    // A "success" state means that a build passed. If the build passed on the
    // master branch, we need to trigger a "build" hook, which might execute a
    // script to run in the /bin directory.
    isMaster = _.some(branches, function(branch) {
        return branch.name == 'master';
    });
    // If this was a successful build of the master branch, we want to trigger the
    // build success hook.
    if (state == 'success' && isMaster) {
        buildHooks = getBuildHooksForMonitor(repoClient);
        log.log('Github build success event on ' + repoClient + '/');
        // Only process when there is a build hook defined.

        _.each(buildHooks, function(hookCmd) {
            executeCommand(hookCmd);
        });
    }
    // Otherwise we process this as any other state change.
    else {
        repoClient.getCommit(sha, function(err, commit) {
            utils.lastStatusWasExternal(repoClient, sha, function(external) {
                var commitAuthor = undefined;
                // This is a temporary block until I figure out what is going on here.
                if (! commit.author) {
                    if (cb) { cb(new Error('PR has no author!')); }
                    return;
                }
                commitAuthor = commit.author.login;
                if (external) {

                    shaValidator.performCompleteValidation(
                        sha,
                        commitAuthor,
                        repoClient,
                        dynamicValidatorModules,
                        true,
                        cb
                    );

                } else {
                    // ignore statuses that were created by this server
                    log.warn('Ignoring "' + state + '" status created by nupic.tools.');
                    if (cb) { cb(); }
                }
            });
        });
    }
}

function executeCommand(command) {
    exec(command, function (error, stdout, stderr) {
        log.verbose(stdout);
        if (stderr) { log.warn(stderr); }
        if (error !== null) {
            log.error('command execution error: ' + error);
        }
    });
}

function getHooksForMonitorForType(type, monitorConfig) {
    var hooks = [];
    if (monitorConfig && monitorConfig.hooks && monitorConfig.hooks[type]) {
        // Could be a strong or an array of strings.
        if (typeof(monitorConfig.hooks[type]) == 'string') {
            hooks.push(monitorConfig.hooks[type]);
        } else {
            hooks = monitorConfig.hooks[type];
        }
    }
    return hooks;
}

function getPushHooksForMonitor(monitorConfig) {
    return getHooksForMonitorForType('push', monitorConfig);
}

function getBuildHooksForMonitor(monitorConfig) {
    return getHooksForMonitorForType('build', monitorConfig);
}

/**
 * Post status for non-mergeable pull request
 *
 */
function postStatusForNonMergeablePullRequest(sha, pullRequest, repoClient) {
    log.log('The PR is not mergeable, mergeable_state: ' + pullRequest.mergeable_state);

    var headBranch = pullRequest.head.label,
        baseBranch = pullRequest.base.label,
        warningMessage, targetUrl, statusDetails;

    // A warning message about the mergeable state of this PR.
    warningMessage = 'Please merge `' +
        baseBranch + '` into `' + headBranch + '` and resolve merge conflicts.';

    // Avoid "description is too long (maximum is 140 characters)"
    if (warningMessage.length >= 140) {
        warningMessage = "Please merge master into this pull request and resolve merge conflicts.";
    }

    // Construct a url to compare what's missing in this PR.
    targetUrl = pullRequest.base.repo.html_url +
        '/compare/' + headBranch + '...' + baseBranch +
        // jump to the commit log in the comparison,
        // skip the creating PR part to avoid confusion
        '#commits_bucket';

    statusDetails = {
        state: 'error',
        description: warningMessage,
        target_url: targetUrl
    };

    // Post the status banner on PR.
    // https://developer.github.com/v3/repos/statuses/#create-a-status
    shaValidator.postNewNupicStatus(sha, statusDetails, repoClient);
}

/**
 * Handles an event from Github that indicates that a PR has been merged into one
 * of the repositories. This could trigger a script to run locally in response,
 * called a "push hook", which are defined in the configuration of each repo as
 * hooks.push = 'path/to/script'.
 * @param payload {object} Full Github payload from the API.
 * @param config {object} Application configuration (used to extract the
 *                        repository monitor configuration and push hook).
 */
function handlePushEvent(payload, config) {
    var repoSlug = payload.repository.organization
            + '/' + payload.repository.name,
        branch = payload.ref.split('/').pop(),
        monitorConfig = config.monitors[repoSlug],
        pushHooks = getPushHooksForMonitor(monitorConfig);
    log.log('Github push event on ' + repoSlug + '/' + branch);
    // Only process pushes to master, and only when there is a push hook defined.
    if (branch == 'master') {
        _.each(pushHooks, function(hookCmd) {
            executeCommand(hookCmd);
        });
    }
}

/**
 * Given all the RepositoryClient objects, this module initializes all the dynamic
 * validators and returns a request handler function to handle all Github web hook
 * requests, including status updates and pull request notifications.
 * @param clients {RepositoryClient[]} Every RepositoryClient for each repo
 *                                     being monitored.
 * @param config {object} Application configuration.
 */
function initializer(clients, config) {
    var validatorExclusions = [];
    repoClients = clients;
    if (config.validators && config.validators.exclude) {
        validatorExclusions = config.validators.exclude;
    }
    dynamicValidatorModules = utils.initializeModulesWithin(VALIDATOR_DIR, validatorExclusions);
    /**
     * This is the actual request handler, which is returned after the initializer
     * is called. Handles every hook call from Github.
     */
    return function(req, res) {
        // Get what repository Github is telling us about
        var payload = JSON.parse(req.body.payload),
            sha, repoName, repoClient, repoSlug, branch, pushHook;

        if (payload.name) {
            repoName = payload.name;
        } else if (payload.repository && payload.repository.full_name) {
            repoName = payload.repository.full_name;
        } else if (payload.repository) {
            // Probably a push event.
            repoName = payload.repository.owner.name + '/' + payload.repository.name;
        } else {
            log.error('Cannot understand github payload!\n')
            log.warn(req.body.payload);
            return res.end();
        }

        repoClient = repoClients[repoName];

        // If this application is not monitoring the repo Github is telling us
        // about, just ignore it.
        if (! repoClient) {
            log.warn('No repository client available for ' + repoName);
            return res.end();
        }

        log.verbose("Github hook executing for " + repoClient.toString().magenta);

        function whenDone(err) {
            if (err) {
                log.error(err);
                log.log(payload);
            }
            res.end();
        }

        // If the payload has a 'state', that means this is a state change.
        if (payload.state) {
            sha = payload.sha;
            log.debug('** Handle State Change **');
            // Ignore state changes on closed pull requests
            if (payload.pullRequest && payload.pullRequest.state == 'closed') {
                log.warn('Ignoring status of closed pull request (' + sha + ')');
                whenDone();
            } else {
                handleStateChange(
                    sha, payload.state, payload.branches, repoClient, whenDone
                );
            }
        }
        // If the payload has a 'pull_request', well that means this is a pull
        // request.
        else if (payload.pull_request) {
            log.debug('** Handle Pull Request Update **');
            handlePullRequest(
                payload.action,
                payload.pull_request,
                repoClient,
                whenDone
            );
        }
        // Assuming everything else is a push event.
        else if (payload.ref) {
            log.debug('** Handle Push Event **')
            handlePushEvent(payload, config);
            whenDone();
        } else {
            log.error('** Unknown GitHub Webhook Payload! **');
            log.error(payload);
            whenDone();
        }
    };
}

module.exports = {
    initializer: initializer,
    getValidators: function() {
        return dynamicValidatorModules.map(function(v) {
            return v.name;
        });
    }
};
