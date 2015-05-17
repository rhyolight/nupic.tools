// This module provides a request handler for HTTP calls from Github web hooks.
var fs = require('fs')
  , _ = require('lodash')
  , log = require('./utils/logger').logger
  , utils = require('./utils/general')
  , contributors = require('./utils/contributors')
  , VALIDATOR_DIR = 'validators'
  , // All the validator modules
    dynamicValidatorModules = []
  , repoClients
  ;

var githubHookHandlerInitializer = require('./utils/github-hook-handlers')
  , githubHookHandlers = undefined
  , EVENT_HEADER_NAME = 'x-github-event'
  ;

/**
 * Given all the RepositoryClient objects, this module initializes all the dynamic
 * validators and returns a request handler function to handle all Github web hook
 * requests, including status updates and pull request notifications.
 * @param clients {RepositoryClient[]} Every RepositoryClient for each repo
 *                                     being monitored.
 * @param config {object} Application configuration.
 */
function initializer(clients, config) {
    dynamicValidatorModules = utils.initializeModulesWithin(VALIDATOR_DIR);
    githubHookHandlers = githubHookHandlerInitializer(
        clients,
        dynamicValidatorModules,
        config
    );

    return function(req, res) {
        var event
          , handler
          , headers = req.headers
          , payload
          ;

        event = headers[EVENT_HEADER_NAME];
        if (! event) {
            throw new Error('Cannot process GitHub web hook event that does ' +
                'not contain the ' + EVENT_HEADER_NAME + ' header to ' +
                'identify the event type!');
        }

        handler = githubHookHandlers[event];

        // If no event handler exists for the hook, just warn and ignore it.
        if (! handler) {
            log.warn('Ignoring GitHub hook event "' + event + '".');
            return res.end();
        }

        payload = JSON.parse(req.body.payload);

        log.info('Processing Github web hook "' + event + '"...');
        handler(payload, function(error) {
            if (error) {
                log.error('Error encountered when processing GitHub web hook event "' + event + '":');
                log.error(error.toString());
                log.debug('HEADERS:');
                log.debug(headers);
                log.debug('PAYLOAD:');
                log.debug(payload);
            } else {
                log.info('Completed GitHub web hook handling for "' + event
                    + '" event.');
            }
            res.end();
        });
    };

}

module.exports = {
    initializer: initializer,
    getValidators: function() {
        return dynamicValidatorModules.map(function(v) {
            return v.name;
        });
    }
};
