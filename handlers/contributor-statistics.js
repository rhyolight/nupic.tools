var cache = require('memory-cache'),
    jsonUtils = require('../utils/json'),
    nodeURL = require('url'),
    log = require('../utils/logger').logger,

    cacheTTL =      1000 * 60 * 60 * 24,    // 24 hour cache
    repoClients =   null;


/**
 * Shape all the Contributor and Commit data into useable stats output.
 */
function shapeStatistics(repoClient, allContributors, allCommits, callback) {
    var commitsPerPerson =  {},
        contributorsOut =   null,
        repoClientName =    repoClient.toString();

    log.debug('Received %s commits for %s.', allCommits.length, repoClientName);

    allCommits.forEach(function(nextCommit){
        if (nextCommit.committer) {
            if (!commitsPerPerson[nextCommit.committer.login]) {
                commitsPerPerson[nextCommit.committer.login] = 0;
            }
            commitsPerPerson[nextCommit.committer.login]++;
        }
    });

    contributorsOut = allContributors.map(function(nextContrib){
        var commits = 0;
        if (commitsPerPerson[nextContrib.login]) {
            commits = commitsPerPerson[nextContrib.login];
        }
        return {
            "login": nextContrib.login,
            "contributions": nextContrib.contributions,
            "commits": commits
        };
    });

    callback(null, contributorsOut);
}

/**
 * Get Commit data from cache or API
 */
function getCommitsFor(repoClient, allContributors, callback) {
    var cacheTag =          'commits/',
        allCommits =        null,
        repoClientName =    repoClient.toString();

    log.debug('Received %s contributors for %s.', allContributors.length, repoClientName);

    if(allCommits = cache.get(cacheTag + repoClientName)) {
        log.verbose('Reusing cached commits for %s...', repoClientName)
        shapeStatistics(repoClient, allContributors, allCommits, callback);
    }
    else {
        log.verbose('Fetching commits for %s...', repoClientName)
        repoClient.getCommits(function(error, allCommits) {
            if (error) {
                return callback(error);
            }
            log.debug('Received %s commits for %s.', allCommits.length, repoClientName);
            cache.put(cacheTag + repoClientName, allCommits, cacheTTL);
            shapeStatistics(repoClient, allContributors, allCommits, callback);
        });
    }
}

/**
 * Get Contributor data from cache or API
 */
function getContributorsFor(repoClient, callback) {
    var cacheTag =          'contributors/',
        allContributors =   null,
        repoClientName =    repoClient.toString();

    if(allContributors = cache.get(cacheTag + repoClientName)) {
        log.verbose('Reusing cached contributors for %s...', repoClientName);
        getCommitsFor(repoClient, allContributors, callback);
    }
    else {
        log.verbose('Fetching contributors for %s...', repoClientName);
        repoClient.getContributors(function(error, allContributors) {
            if (error) {
                return callback(error);
            }
            cache.put(cacheTag + repoClientName, allContributors, cacheTTL);
            getCommitsFor(repoClient, allContributors, callback);
       });
    }
}

/**
 * Get list of Contributors
 */
function extractContributorsFromRepositoryClients(clients, callback) {
    var repoNames = Object.keys(clients),
        contributorsOut = {},
        errors = [],
        responseCount = 0;

    repoNames.forEach(function(repoName) {
        getContributorsFor(repoClients[repoName], function(error, contributors) {
            responseCount++;
            if (error) {
                errors.push(error);
            } else {
                contributorsOut[repoName] = contributors;
            }
            if (responseCount == repoNames.length) {
                callback(errors, contributorsOut);
            }
        });
    });
}

/**
 * Write output response
 */
function writeResponse(response, errors, dataOut, jsonpCallback) {
    // Write out response
    if (errors.length) {
        jsonUtils.renderErrors(errors, response, jsonpCallback);
    } else {
        jsonUtils.render(dataOut, response, jsonpCallback)
    }
}

/**
 * Main function handles split between single or batch mode
 */
function contributorStatistics (request, response)    {
    var dataOut = {},
        errors = [],
        urlQuery = nodeURL.parse(request.url, true).query,
        jsonpCallback = urlQuery.callback,
        repo = urlQuery.repo || "all",
        repoClient;

    if(repo == "all")   {
        // Report on all repositories
        extractContributorsFromRepositoryClients(repoClients,
            function(errs, contributors) {
                if (errors) {
                    errors = errors.concat(errs);
                }
                writeResponse(response, errors, contributors, jsonpCallback);
            }
        );

    } else {
        // A single repository was specified

        if (repoClients[repo]) {
            repoClient = repoClients[repo];

            getContributorsFor(repoClient, function(error, contributors) {
                if (error) {
                    errors.push(error);
                } else {
                    dataOut[repo] = contributors;
                }
                writeResponse(response, errors, dataOut, jsonpCallback);
            });
        } else {
            errors.push(new Error("Not monitoring this repository '" + repo + "'"));
            writeResponse(response, errors, dataOut, jsonpCallback);
        }

    }

}


/**
 * Export
 */

contributorStatistics.title = "Contribution Reporter";
contributorStatistics.description = "Generates JSON/JSONP with all contributors "
    + "and how many contributions they made for all repositories or the "
    + "repository specified in a 'repo' parameter. For JSONP add a 'callback' "
    + "parameter.";
contributorStatistics.url = '/contribStats';

module.exports = {
    '/contribStats*': function(_repoClients) {
        if (! _repoClients) {
            throw new Error('Cannot initialize handler without RepositoryClient objects');
        }
        repoClients = _repoClients;
            return contributorStatistics;
    }
};
