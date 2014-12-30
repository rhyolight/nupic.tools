var fixesRegex = /fixes #[\d]*/i
  , log = require('../utils/logger').logger
  , NAME = 'Fixes Issue Validator'
  ;

function hasFixLinkToIssue(text) {
    return text.match(fixesRegex);
}


function validator(sha, githubUser, repoClient, callback) {
    var response = {
        target_url: 'https://github.com/numenta/nupic/wiki/Development-Process'
    };
    log.info('Validating that PR fixes an issue');
    repoClient.searchIssues(sha, function(err, prs) {
        var pr, fixMatch;
        if (err) {
            return callback(err);
        }

        if (prs.total_count > 1) {
            // What to do?
            log.warn('Found a SHA linked to more than one PR!', prs);
        }

        pr = prs.items[0];
        fixMatch = hasFixLinkToIssue(pr.body)
        if (fixMatch) {
            response.state = 'success';
            response.description = 'Found "' + fixMatch[0] + '".';
        } else {
            response.state = 'failured';
            response.description = 'This PR must be linked to an issue.'
        }
        callback(null, response);
    });
}

module.exports.validate = validator;
module.exports.name = NAME;
