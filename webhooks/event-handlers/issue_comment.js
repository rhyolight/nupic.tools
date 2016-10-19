var log = require('../../utils/logger').logger,
    shaValidator = require('../../utils/sha-validator');

function issueCommentHandler(payload, config, repoClient, validators, callback) {
    var prNumber = payload.issue.number;

    // Ignore comments on issues, we only want to take action on pull requests.
    if (! payload.issue.pull_request) {
        return callback();
    }

    repoClient.getLastCommitOnPullRequest(prNumber, function(err, commit) {
        log.debug(commit);
        var committer = commit.committer;
        var login = undefined;
        if (! committer) {
            log.warn('Missing commit committer!');
            log.warn(commit);
            return;
        }
        login = committer.login;
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

module.exports = issueCommentHandler;
