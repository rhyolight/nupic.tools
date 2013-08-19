var jsonUtils = require('../utils/json');
var nodeURL = require("url");
var repoClients;

function getRemainingPages(repoClient, lastData, callback, allData_old) {
    var allData = [];
    if (allData_old) {
        allData = allData.concat(allData_old);
    }
    allData = allData.concat(lastData);
    repoClient.github.getNextPage(lastData, function(error,newData){
        if (error) {
            callback(null, allData);
        } else {
            getRemainingPages(repoClient, newData, callback, allData)
        }
    });
}

function getContributorsFor(repoClient, callback) {
    repoClient.getContributors(function(err, contributors) {
        getRemainingPages(repoClient, contributors, function(error, allContributors){
            var contributorsOut;
            if (err) {
                return callback(err);
            }
            repoClient.github.repos.getCommits({"user": repoClient.org, "repo": repoClient.repo, "per_page": 100}, function(error, data){
                getRemainingPages(repoClient, data, function(error, allCommits){
                    var commitsPerPerson = {};
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



                });
            });
        });
    });
}

function extractContributorsFromRepositoryClients(clients, callback) {
    var repoNames = Object.keys(clients),
        contributorsOut = {},
        errors = [],
        responseCount = 0;
        
    repoNames.forEach(function(repoName) {
        getContributorsFor(repoClients[repoName], function(err, contributors) {
            responseCount++;
            if (err) {
                errors.push(err);
            } else {
                contributorsOut[repoName] = contributors;
            }
            if (responseCount == repoNames.length) {
                callback(errors, contributorsOut);
            }
        });
    });
}

function writeResponse(response, errors, dataOut, jsonpCallback) {
    // Write out response
    if (errors.length) {
        jsonUtils.renderErrors(errors, response, jsonpCallback);
    } else {
        jsonUtils.render(dataOut, response, jsonpCallback)
    }
}

function contributorStatistics (request, response)    {

    var dataOut = {},
        repoNames = Object.keys(repoClients),
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

            getContributorsFor(repoClient, function(err, contributors) {
                if (err) {
                    errors.push(err);
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


contributorStatistics.name = "Contribution Reporter";
contributorStatistics.description = "Generates JSON/JSONP with all contributors "
    + "and how many contributions they made for all repositorys or the "
    + "repository specified in a 'repo' parameter. For JSONP add a 'callback' "
    + "parameter.";

module.exports = {
    '/contribStats': function(_repoClients) {
        repoClients = _repoClients;
        return contributorStatistics;
    }
};