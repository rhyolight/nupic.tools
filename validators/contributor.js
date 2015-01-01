var contribUtil = require('../utils/contributors')
  , log = require('../utils/logger').logger
  , NAME = 'Contributor Validator'
  , WHITELIST = ['numenta-ci']
  ;

function isContributor(name, roster) {
    if (name == null || name == undefined) return false;
    if (name === false) return true; // explicit false means ignore
    return roster.map(function(p) { return p.Github; })
                 .reduce(function(prev, curr) {
                    if (prev) return prev;
                    return curr == name;
                 }, false);
}

function validator(sha, githubUser, repoClient, callback) {
    log.info('Validating contributor "%s" for %s...', githubUser, sha);
    // If github user is on the whitelist, we approve.
    if (WHITELIST.indexOf(githubUser) > -1) {
        return callback(null, {
            state: 'success'
          , description: githubUser + ' is whitelisted as a contributor.'
          , target_url: 'https://github.com/' + githubUser
        });
    }
    contribUtil.getAll(repoClient.contributorsUrl, function(err, contributors) {
        var response = {};
        // If there's an error, we'll handle it like a validation failure.
        if (err) {
            response.state = 'failure';
            response.description = 'Error running ' + NAME + ': ' + err;
        } else if (isContributor(githubUser, contributors)) {
            response.state = 'success';
            response.description = githubUser + ' signed the Contributor License';
            response.target_url = 'http://numenta.org/contributors/';
        } else {
            response.state = 'failure';
            response.description = githubUser 
                + ' must sign the Contributor License';
            response.target_url = 'http://numenta.org/licenses/cl/';
        }
        log.debug(response);
        callback(null, response);
    });
}

module.exports.validate = validator;
module.exports.name = NAME;
