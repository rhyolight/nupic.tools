var fs = require('fs')
  , path = require('path')
  , url = require('url')
  , qs = require('querystring')
  , _ = require('lodash')
  , shaValidator = require('../utils/sha-validator')
  , contributors = require('../utils/contributors')
  , jsonUtils = require('../utils/json')
  , VALIDATOR_DIR = 'validators'
  , validators = []
  , repoClients
  ;

function initializeValidators(dir) {
    var fullDir = path.join(__dirname, '..', dir);
    fs.readdirSync(fullDir).forEach(function(validator) {
        validators.push(
            require('./../' + dir + '/' + validator.split('.').shift())
        );
    });
}

function findClientFor(sha, callback) {
    var clients = Object.keys(repoClients)
      , found = false;
    function next() {
        var nextClient;
        if (found) return;
        nextClient = repoClients[clients.shift()];
        if (! nextClient) {
            return callback();
        }
        nextClient.getCommit(sha, function(err, commit) {
            if (! err && commit) {
                found = true;
                callback(nextClient, commit);
            } else {
                next();
            }
        });
    }
    next();
}

function validateSha(req, res) {

    var reqUrl = url.parse(req.url)
      , query = qs.parse(reqUrl.query)
      , sha = query.sha
      , postStatus
      , repo = query.repo
      , jsonPCallback = query.callback
      , repoClient = repoClients[repo]
      , errors = []
      ;

    postStatus = query.postStatus
        && (query.postStatus == '1' || query.postStatus.toLowerCase() == 'true');

    if (! sha) {
        errors.push(new Error('Missing "sha" query parameter.'));
    }
    if (repo && repoClient == undefined) {
        errors.push(new Error('No repo called "' + repo + '".'));
    }
    if (errors.length) {
        return jsonUtils.renderErrors(errors, res, jsonPCallback);
    }

    findClientFor(sha, function(client, payload) {
        var committer;
        if (! client) {
            errors.push(new Error(
                'No match for sha "' + sha + '" in any known repositories.'
            ));
            return jsonUtils.renderErrors(errors, res, jsonPCallback);
        }
        committer = payload.author ? payload.author.login : false;
        shaValidator.performCompleteValidation(sha, committer, client,
                                               validators, postStatus,
            function (err, sha, validationResponses, repoClient) {
                var htmlOut = '<html><body>\n<h1>SHA Validation report</h1>\n';
                htmlOut += '<h2>' + repoClient.toString() + '</h2>\n';
                htmlOut += '<h2>' + sha + '</h2>\n';
                _.each(validationResponses, 
                    function (statusDetails, validatorName) {
                        htmlOut += '<h3>' + validatorName + ': ' 
                            + statusDetails.state + '</h3>\n';
                        htmlOut += '<p>' + statusDetails.description + '</p>\n';
                        if (statusDetails.target_url) {
                            htmlOut += '<p><a href="' + statusDetails.target_url 
                                + '">Details</a></p>\n';
                        }
                    }
                );
                htmlOut += '\n</body></html>';
                res.setHeader('Content-Type', 'text/html');
                res.setHeader('Content-Length', htmlOut.length);
                res.end(htmlOut);
            }
        );
    });

}

initializeValidators(VALIDATOR_DIR);

validateSha.title = 'SHA Validator';
validateSha.description = 'Given a "sha" parameter, forces a complete ' +
    'validation and reports results. To post validation results to github, ' +
    'specify "postStatus=1" in URL params.';
validateSha.url = '/validate';

module.exports = {
    '/validate*': function(_repoClients) {
        repoClients = _repoClients;
        return validateSha;
    }
};
