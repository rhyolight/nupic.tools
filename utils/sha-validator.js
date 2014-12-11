var _ = require('underscore'),
    async = require('async'),
    utils = require('./general'),
    log = require('./logger').logger;

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
    log.info(sha + ': Posting new NuPIC Status ('
        + coloredStatus(statusDetails.state) + ') to github');
    var payload = {
        user: repoClient.org,
        repo: repoClient.repo,
        sha: sha,
        state: statusDetails.state,
        context: statusContext,
        description: statusDetails.description,
        target_url: statusDetails.target_url
    };
    log.debug(payload);
    repoClient.github.statuses.create(payload);
}

function triggerTravisBuildsOnAllOpenPullRequests(repoClient, callback) {
    repoClient.getAllOpenPullRequests(function(err, prs) {
        var count = 0,
            errors = null;
        log.info('Found ' + prs.length + ' open pull requests...');
        prs.map(function(pr) { return pr.number; }).forEach(function(pr_number) {
            repoClient.triggerTravisForPullRequest(pr_number, function(err, success) {
                count++;
                if (err) {
                    if (! errors) {
                        errors = [];
                    }
                    errors.push(err);
                }
                if (count == prs.length) {
                    if (callback) {
                        callback(errors);
                    }
                }
            });
        });
    });
}

function performCompleteValidation(sha, githubUser, repoClient, validators, postStatus, cb) {
    var callback = cb, validationFunctions = {};
    // default dummy callback for simpler code later
    if (! cb) {
        callback = function() {};
    }

    log.debug('VALIDATING ' + repoClient.toString() + ' at ' + sha);

    _.each(validators, function(validator) {
        validationFunctions[validator.name] = function(asyncCallback) {
            log.debug(sha + ': Running commit validator: ' + validator.name);
            validator.validate(sha, githubUser, repoClient, function(err, validationResult) {
                if (postStatus) {
                    postNewNupicStatus(validator.name, sha, validationResult, repoClient);
                }
                asyncCallback(err, validationResult);
            });
        };
    });

    async.parallel(validationFunctions, function(err, results) {
        callback(null, sha, results, repoClient);
    });

}

module.exports = {
    performCompleteValidation: performCompleteValidation,
    triggerTravisBuildsOnAllOpenPullRequests: triggerTravisBuildsOnAllOpenPullRequests,
    postNewNupicStatus: postNewNupicStatus // for testing
};
