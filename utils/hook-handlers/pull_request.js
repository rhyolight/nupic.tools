var shaValidator = require('../sha-validator')
  , utils = require('../general')
  , log = require('../logger').logger
  ;

/* Handles pull_request events from GitHub. */
function pullRequestHandler(payload, config, repoClient, validators, callback) {
    var action = payload.action
      , pullRequest = payload.pull_request
      , githubUser = pullRequest.user.login
      , head = pullRequest.head
      , sha = head.sha
      ;

    log.info(
        'Pull Request %s was %s by %s', pullRequest.html_url, action, githubUser
    );

    if (action == 'closed') {
        // If this pull request just got merged, we need to re-trigger the
        // Travis-CI jobs of all the other open pull requests.
        if (pullRequest.merged) {
            log.debug('A PR just merged. Re-validating open pull requests...');
            shaValidator.triggerBuildsOnAllOpenPullRequests(repoClient
                                                          , callback);
        } else {
            callback();
        }
    } else if (action == 'labeled') {
        // Ignore labels for now.
        callback();
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
                callback();
            }
        });
    }
}

module.exports = pullRequestHandler;