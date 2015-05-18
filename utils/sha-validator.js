var _ = require('lodash')
  , async = require('async')
  , utils = require('./general')
  , log = require('./logger').logger
  ;

function coloredStatus(status) {
    if (status == 'success') {
        return status.green;
    } else if (status == 'pending') {
        return status.yellow;
    } else {
        return status.red;
    }
}

function postNewNupicStatus(statusContext, sha, statusDetails, repoClient) {
    log.info('Posting new NuPIC Status ('
        + coloredStatus(statusDetails.state) + ') for ' + sha + ' to GitHub');
    var payload = {
        user: repoClient.org
      , repo: repoClient.repo
      , sha: sha
      , state: statusDetails.state
      , context: statusContext
      , description: statusDetails.description
      , target_url: statusDetails.target_url
    };
    log.debug(payload);
    repoClient.github.statuses.create(payload);
}

function triggerBuildsOnAllOpenPullRequests(repoClient, callback) {
    repoClient.getAllOpenPullRequests(function(err, prs) {
        var triggers = [];
        if (err) {
            return callback(err);
        }
        log.debug('Found ' + prs.length + ' open pull requests...');
        _.each(prs, function(pr) {
            triggers.push(function(localCallback) {
                repoClient.triggerTravisForPullRequest(pr.number, localCallback);
                repoClient.triggerAppVeyorForPullRequest(pr.number, localCallback);
            });
        });
        async.parallel(triggers, callback);
    });
}

function performCompleteValidation(sha
                                 , githubUser
                                 , repoClient
                                 , validators
                                 , postStatus
                                 , cb
                                 ) {
    var callback = cb
      , searchString = sha + '+state:open'
      ;
    // default dummy callback for simpler code later
    if (! cb) {
        callback = function() {};
    }

    repoClient.searchIssues(searchString, function(err, prs) {
        var validationFunctions = {};
        if (err) {
            return callback(err);
        }

        if (prs.total_count == 0) {
            // No PR for this commit, so no point in validating.
            err = new Error('Skipping validation of ' + sha
                + ' because it has no PR.');
            log.warn(err);
            return callback(err);
        }

        // There may be more than one PR associated with a commit SHA if someone
        // created one PR based on the changes presented in another PR. In this
        // case we will validate them all.
        _.each(prs.items, function(pr) {
            log.info('Validating %s at %s', pr.html_url, sha);
            _.each(validators, function(validator) {
                validationFunctions[pr.number + '-' + validator.name] =
                    function(asyncCallback) {
                        log.debug(sha + ': Running commit validator: '
                            + validator.name);
                        validator.validate(
                            sha
                            , githubUser
                            , repoClient
                            , function(err, validationResult) {
                                if (!err && postStatus) {
                                    postNewNupicStatus(
                                        validator.name, sha,
                                        validationResult, repoClient
                                    );
                                }
                                asyncCallback(err, validationResult);
                            }
                        );
                    };
            });
        });

        async.parallel(validationFunctions, function(err, results) {
            callback(null, sha, results, repoClient);
        });

    });


}

module.exports = {
    performCompleteValidation: performCompleteValidation,
    triggerBuildsOnAllOpenPullRequests: triggerBuildsOnAllOpenPullRequests,
    postNewNupicStatus: postNewNupicStatus // for testing
};
