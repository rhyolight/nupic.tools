var url = require('url')
  , _ = require('underscore')
  , json = require('../utils/json')
  , template = require('../utils/template')
  , repoClients = undefined
  , httpHandlers = undefined
  , config = undefined
  , validators = undefined
  ;

function generateOutputData(callback) {
    var handlers = httpHandlers.map(function(handlerConfig) {
        var urls = Object.keys(handlerConfig)
          , output = {};
        urls.forEach(function(url) {
            var handler = handlerConfig[url](
                repoClients
              , httpHandlers
              , config
              , validators
            );
            output[url] = {
                url: handler.url
              , title: handler.title
              , description: handler.description
              , disabled: handler.disabled
            };
        });
        return output;
    });
    // Grab one repoClient to get the current rateLimit.
    _.values(repoClients)[0].rateLimit(function(err, rateLimit) {
        callback(err, {
            monitors: Object.keys(repoClients)
          , validators: validators
          , handlers: handlers
          , rateLimit: rateLimit
        });
    });
}

function isJsonUrl(myUrl) {
    return url.parse(myUrl, false, true).pathname.split(".").pop() == "json";
}

function statusReporter(req, res) {
    generateOutputData(function(err, jsonOut) {
        var htmlOut;
        if (isJsonUrl(req.url)) {
            if(url.parse(req.url).query !== null) {
                json.renderJsonp(
                    jsonOut, url.parse(req.url, true).query.callback, res
                );
            } else {
                json.render(jsonOut, res);
            }
        } else {
            htmlOut = template('status.html', jsonOut);
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Content-Length', htmlOut.length);
            res.end(htmlOut);
        }
    });
}

function handler(_repoClients, _httpHandlers, _config, activeValidators) {
    repoClients = _repoClients;
    httpHandlers = _httpHandlers;
    config = _config;
    validators = activeValidators;
    return statusReporter;
}

statusReporter.title = 'Status Reporter';
statusReporter.description = 'Reports the repositories this tools server is monitoring.';
statusReporter.url = '/status';

module.exports = {
    '/status*': handler
};
