var utils = require('./general'),
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

function postNewNupicStatus(sha, statusDetails, repoClient) {
    log.info(sha + ': Posting new NuPIC Status ('
        + coloredStatus(statusDetails.state) + ') to github');
    // If the old status was created by nupic.tools, it will start with
    // "NuPIC Status:". But if it was created by Travis-CI, we want to add that
    // little prefix to the description string.
    var statusDescription = utils.normalizeStatusDescription(
        statusDetails.description
    );
    log.info(statusDescription);
    repoClient.github.statuses.create({
        user: repoClient.org,
        repo: repoClient.repo,
        sha: sha,
        state: statusDetails.state,
        description: statusDescription,
        target_url: statusDetails.target_url
    });
}

function triggerTravisBuildsOnAllOpenPullRequests(repoClient, callback) {
    repoClient.getAllOpenPullRequests(function(err, prs) {
        var count = 0,
            errors = null;
        log.log('Found ' + prs.length + ' open pull requests...');
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
    var callback = cb;
    // default dummy callback for simpler code later
    if (! cb) {
        callback = function() {};
    }
    // if we should post the status to github, we'll wrap the callback with our
    // status posting logic
    if (postStatus) {
        callback = function() {
            var args = Array.prototype.slice.call(arguments),
                err = args.shift();
            if (! err) {
                postNewNupicStatus.apply(this, args);
            }
            if (cb) {
                cb.apply(this, arguments);
            }
        };
    }

    log.debug('VALIDATING ' + sha);

    repoClient.getAllStatusesFor(sha, function(err, statusHistory) {
        if (err) {
            return cb(new Error('Error communicating with Github API.'));
        }

        // clone of the global validators array
        var commitValidators = validators.slice(0),
            validationFailed = false,
            target_url,
            highestPriority = -1,
            validatorsRun = [],
            validatorsSkipped = [],
            skippedMSG;

        function runNextValidation() {
            var validator,
                priority;
            if (validationFailed) return;
            validator = commitValidators.shift();
            if (validator) {
                log.log(sha + ': Running commit validator: ' + validator.name);
                validatorsRun.push(validator);
                validator.validate(sha, githubUser, statusHistory, repoClient, function(err, result) {
                    if (err) {
                        console.error('Error running commit validator "' + validator.name + '"');
                        console.error(err);
                        return callback(null, sha, {
                            state: 'error',
                            description: 'Error running commit validator "' + validator.name + '": ' + err.message
                        }, repoClient);
                    }
                    log.log(sha + ': ' + validator.name + ' result was ' + coloredStatus(result.state));
                    if (result.state !== 'success') {
                        // Upon failure, we set a flag that will skip the
                        // remaining validators and post a failure status.
                        validationFailed = true;
                        callback(null, sha, result, repoClient);
                    }
                    // This code is just allowing the different validators to
                    // fight over which one will provide the "Details" URL
                    // that gets displayed on the Github PR.
                    if (validator.hasOwnProperty('priority')) {
                        priority = validator.priority;
                    } else {
                        priority = 0;
                    }
                    if (priority >= highestPriority) {
                        highestPriority = priority;
                        if (result.hasOwnProperty('target_url')) {
                            target_url = result.target_url;
                        }
                    };
                    log.log(sha + ': ' + validator.name + ' complete.');
                    runNextValidation();
                });
            } else {
                log.log(sha + ': Validation complete.');
                // No more validators left in the array, so we can complete the
                // validation successfully.
                if (validatorsSkipped.length > 0) {
                    skippedMSG = ' [' + validatorsSkipped.length + ' skipped])';
                } else {
                    skippedMSG = ')';
                }
                callback(null, sha, {
                    state: 'success',
                    description: 'All validations passed (' + validatorsRun.map(function(v) { return v.name; }).join(', ') + skippedMSG,
                    target_url: target_url
                }, repoClient);
            }
        }

        runNextValidation();

    });
}

module.exports = {
    performCompleteValidation: performCompleteValidation,
    triggerTravisBuildsOnAllOpenPullRequests: triggerTravisBuildsOnAllOpenPullRequests,
    postNewNupicStatus: postNewNupicStatus
};
