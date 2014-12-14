var GitHubApi = require('github')
  , _ = require('underscore')
  , async = require('async')
  , json = require('../utils/json')
  , COMMITTER_TEAM_ID = 418155
  , gh = undefined
  ;

function getGitHubUser(username, callback) {
    gh.user.getFrom({user: username}, callback);
}

function requestHandler(req, res) {
    var jsonpCallback = req.query.callback;
    gh.orgs.getTeamMembers({id: COMMITTER_TEAM_ID}, function(err, members) {
        var userFetchers;
        if (err) {
            json.renderErrors(err, res);
        } else {
            userFetchers = _.map(members, function(member) {
                return function(callback) {
                    getGitHubUser(member.login, callback);
                };
            });
            async.parallel(userFetchers, function(err, users) {
                if (err) {
                    json.renderErrors(err, res, jsonpCallback);
                } else {
                    json.render(users, res, jsonpCallback);
                }
            });
        }
    });
}

function initializer(_repoClients, _httpHandlers, config, activeValidators) {
    var ghUsername = config.monitors[_.keys(config.monitors)[0]].username
      , ghPassword = config.monitors[_.keys(config.monitors)[0]].password;
    gh = new GitHubApi({
        version: '3.0.0'
      , timeout: 5000
    });
    gh.authenticate({
        type: 'basic'
      , username: ghUsername
      , password: ghPassword
    });
    return requestHandler;
}

requestHandler.title = 'Committer Reporter';
requestHandler.description = 'Reports committer details.';
requestHandler.url = '/committers';

module.exports = {
    '/committers*': initializer
};
