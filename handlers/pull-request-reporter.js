var url = require('url'),
    qs = require('querystring'),
    utils = require('../utils/general'),
    jsonUtils = require('../utils/json'),
    repoClients;

function getPullRequestsFrom(ghClient, callback) {
    ghClient.getAllOpenPullRequests(function(err, prs) {
        // Attach current statuses to each request
        var out = [];

        if (err) {
            return callback(err);
        }

        function addNextPullRequestStatuses() {
            var pr = prs.pop();
            if (! pr) {
                // Done!
                callback(null, out);
            } else {
                ghClient.getAllStatusesFor(pr.head.sha, function(err, statuses) {
                    if (err) return callback(err);
                    pr.statuses = utils.sortStatuses(statuses);
                    out.push(pr);
                    addNextPullRequestStatuses();
                });
            }
        }

        addNextPullRequestStatuses();
    });
}

function prReporter(req, res) {
    var reqUrl = url.parse(req.url),
        query = qs.parse(reqUrl.query),
        allPrs = {},
        repoKeys = Object.keys(repoClients),
        totalReposToQuery = Object.keys(repoClients).length;

    if (query.repo) {
        if (! repoClients[query.repo]) {
            return jsonUtils.renderErrors(
                [new Error('Server is not monitoring repository identified by "' + query.repo + '".')], 
                res, query.callback
            );
        }
        repoKeys = [query.repo];
        totalReposToQuery = 1;
    }

    repoKeys.forEach(function(repoName) {
        var client = repoClients[repoName];

        getPullRequestsFrom(client, function(err, prs) {
            if (err) {
                return jsonUtils.renderErrors([err], res, query.callback);
            }
            allPrs[client.toString()] = prs;
            if (Object.keys(allPrs).length == totalReposToQuery) {
                // Done!
                var out = totalReposToQuery == 1 ? allPrs[Object.keys(allPrs)[0]] : allPrs;
                jsonUtils.render(out, res, query.callback);
            }
        });
    });
}

prReporter.title = 'Pull Request Reporter';
prReporter.description = 
    'Returns a report of all open pull requests for each monitored repository. ' +
    'Supports JSON and JSONP. When no "repo" query parameter is supplied ' +
    '(which should be "organization/repository"), returns all open pull ' +
    'requests for every repository the server is monitoring, keyed by ' + 
    '"organization/repository". When a "repo" is specified, simply returns an ' +
    'array of pull requests with no key.';
prReporter.url = '/prStatus';

module.exports = {
    '/prStatus*': function(_repoClients) {
        repoClients = _repoClients;
        return prReporter;
    }
};