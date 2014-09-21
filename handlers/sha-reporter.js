var url = require('url'),
    qs = require('querystring'),
    utils = require('../utils/general'),
    jsonUtils = require('../utils/json'),
    repoClients;

function shaReporter(req, res) {
    var reqUrl = url.parse(req.url),
        query = qs.parse(reqUrl.query),
        sha = query.sha,
        repo = query.repo,
        jsonPCallback = query.callback,
        repoClient = repoClients[repo],
        errors = [];

    if (! repo) {
        errors.push(new Error('Missing "repo" query parameter.'));
    }
    if (! sha) {
        errors.push(new Error('Missing "sha" query parameter.'));
    }
    if (errors.length) {
        return jsonUtils.renderErrors(errors, res, jsonPCallback);
    }

    repoClient.github.statuses.get({
        user: repoClient.org,
        repo: repoClient.repo,
        sha: sha
    }, function(err, statuses) {
        jsonUtils.render(utils.sortStatuses(statuses), res, jsonPCallback);
    });
}

shaReporter.title = 'SHA Reporter';
shaReporter.description = 
    'Returns the status of a SHA, give the "sha" and "repo" query parameters. ' + 
    'The repo should be "organization/repository".';
shaReporter.url = '/shaStatus';

module.exports = {
    '/shaStatus*': function(_repoClients) {
        repoClients = _repoClients;
        return shaReporter;
    }
};