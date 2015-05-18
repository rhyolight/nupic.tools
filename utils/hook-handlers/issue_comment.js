var shaValidator = require('../sha-validator');

function issueCommentHandler(payload, callback, config, repoClient, validators) {
    var prNumber = payload.issue.number;

    // Ignore comments on issues, we only want to take action on pull requests.
    if (! payload.issue.pull_request) {
        return callback();
    }

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

module.exports = issueCommentHandler;