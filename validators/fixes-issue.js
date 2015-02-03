// See https://help.github.com/articles/closing-issues-via-commit-messages/#keywords-for-closing-issues.
var fixesNumberRegex =
        /(close[s|d]?|fix|fixes|resolve[s|d]?):? #[\d]*/i
  , fixesUrlRegex =
        /(close[s|d]?|fix|fixes|resolve[s|d]?):? https?:\/\/github.com\/([\da-z\.-]+)\/([\da-z\.-]+)\/issues\/\d{1,10}/i
  , log = require('../utils/logger').logger
  , NAME = 'Fixes Issue Validator'
  ;

function hasFixLinkToIssue(prNumber, text) {
    var numberMatch, urlMatch;
    if (! text) return false;
    numberMatch = text.match(fixesNumberRegex);
    urlMatch = text.match(fixesUrlRegex);
    // Make sure those sneaky contributors aren't linking to the PR itself.
    if (numberMatch && numberMatch[0].indexOf(prNumber) > -1) {
        numberMatch = false;
    }
    if (urlMatch && urlMatch[0].indexOf(prNumber) > -1) {
        urlMatch = false;
    }
    return (numberMatch || urlMatch);
}


function validator(sha, githubUser, repoClient, callback) {
    var searchString = sha + '+state:open'
      , response = {
          state: 'failure'
        , description: 'This PR must be linked to an issue.'
        , target_url: 'https://github.com/numenta/nupic/wiki/Development-Process'
      };
    log.info('Validating that the PR for %s fixes an issue', sha);
    // If this PR was created by this server using the ci account, we'll
    // automatically approve it.
    if (githubUser == 'numenta-ci') {
        response.state = 'success';
        response.description = 'This PR was created by nupic.tools.';
        return callback(null, response);
    }
    // Only apply this validator to 'primary' repositories.
    if (repoClient.type != 'primary') {
        response.state = 'success';
        response.description = repoClient.type
                               + ' repos don\'t require issues for PRs.';
        return callback(null, response);
    }
    repoClient.searchIssues(searchString, function(err, prs) {
        var pr, fixMatch;
        if (err) {
            return callback(err);
        }

        if (prs.total_count ==0) {
            // No PR for this commit, so what's the point?
            response.description = 'No PR for commit.';
            return callback(null, response);
        }

        if (prs.total_count > 1) {
            // What to do?
            log.warn('Found a SHA linked to more than one PR!');
            console.log(prs.items);
        }

        pr = prs.items[0];
        fixMatch = hasFixLinkToIssue(pr.number, pr.body);
        if (fixMatch) {
            response.state = 'success';
            response.description = 'PR is properly linked to an issue';
        }
        callback(null, response);
    });
}

module.exports.validate = validator;
module.exports.name = NAME;
