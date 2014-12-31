var fixesNumberRegex =
        /fixes:? #[\d]*/i
  , fixesUrlRegex =
        /fixes:? https?:\/\/github.com\/([\da-z\.-]+)\/([\da-z\.-]+)\/issues\/\d{1,10}/i
  , log = require('../utils/logger').logger
  , NAME = 'Fixes Issue Validator'
  ;

function hasFixLinkToIssue(text) {
    return !! (text.match(fixesNumberRegex) || text.match(fixesUrlRegex));
}


function validator(sha, githubUser, repoClient, callback) {
    var searchString = sha + '+state:open'
      , response = {
          state: 'failure'
        , description: 'This PR must be linked to an issue.'
        , target_url: 'https://github.com/numenta/nupic/wiki/Development-Process'
      };
    log.info('Validating that PR fixes an issue');
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
        fixMatch = hasFixLinkToIssue(pr.body);
        if (fixMatch) {
            response.state = 'success';
            response.description = 'PR is properly linked to an issue';
        }
        callback(null, response);
    });
}

module.exports.validate = validator;
module.exports.name = NAME;
