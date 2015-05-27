// MAIN PROGRAM, start here.

// global libs
var assert = require('assert')
  , fs = require('fs')
  , path = require('path')
  , _ = require('lodash')
    // ExpressJS and associated middleware
  , express = require('express')
  , morgan = require('morgan')
  , bodyParser = require('body-parser')

  , logger = require('./utils/logger')
  , logStream

    // local libs
  , utils = require('./utils/general')
  , githubHookHandler = require('./github-hook')
  , configReader = require('./utils/config-reader')

    // This path is registered with Github as a webhook URL.
  , githubHookPath = '/github-hook'

    // This directory contains all the additional service
    // handlers that will be loaded dynamically and attached
    // to this web server.

  , HANDLER_DIR = 'handlers'
  , CRON_DIR = 'cronjobs'
  ;

// Making a global space for cron jobs to stash their data.
global._CRON = {};

// The configReader reads the given file, and merges it with any existing user
// configuration file.
configReader.read(path.join(__dirname, 'conf/config.yaml'), function(err, appConfig) {
    if (err) {
        throw (err);
    }

    var host = appConfig.host,
        port = appConfig.port || 8081,
        baseUrl,
        prWebhookUrl;

    if (process.env.PORT) {
        // Local env always overrides port.
        port = process.env.PORT;
        appConfig.port = port;
    }
    if (process.env.HOST) {
        // Local env always overrides host.
        host = process.env.HOST;
        appConfig.host = host;
    }

    baseUrl = 'http://' + host + ':' + port;
    prWebhookUrl = 'http://' + host + githubHookPath;

    logger = logger.initialize(appConfig.logDirectory, appConfig.logLevel);
    logger.info('nupic.tools server starting...');
    logger.info('nupic.tools will use the following configuration:');
    logger.debug('nupic.tools configuration:\n', utils.sterilizeConfig(appConfig));

    // enable web server logging; pipe those log messages through our logger
    logStream = {
        write: function(message){
            logger.debug(message);
        }
    };

    utils.constructRepoClients(prWebhookUrl, appConfig, function(repoClients) {
        var dynamicHttpHandlerModules
          , cronJobs
          , activeValidators
          , app = express()
          ;

        // Enable request/response logging.
        app.use(morgan({
            format: 'dev',
            stream: logStream
        }));

        // Auto body parsing is nice.
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));

        // This puts the Github webhook handler into place
        app.use(githubHookPath, githubHookHandler.initializer(repoClients, appConfig));

        logger.info('The following validators are active:');
        activeValidators = githubHookHandler.getValidators();
        activeValidators.forEach(function(v) {
            logger.info('\t==> ' + v);
        });

        dynamicHttpHandlerModules = utils.initializeModulesWithin(HANDLER_DIR);

        // Loads all the modules within the handlers directory, and registers the URLs
        // the declared, linked to their request handler functions.
        logger.info('The following URL handlers are active:');
        dynamicHttpHandlerModules.forEach(function(handlerConfig) {
            var urls = Object.keys(handlerConfig);
            urls.forEach(function(url) {
                var handler = handlerConfig[url](repoClients, dynamicHttpHandlerModules, appConfig, activeValidators),
                    name = handler.title,
                    msg = '\t==> ' + name + ' listening for url pattern: ' + url;
                if (! handler.disabled) {
                    logger.info(msg);
                    app.get(url, handler);
                }
            });
        });

        cronJobs = utils.initializeModulesWithin(CRON_DIR);
        appConfig.cronjobs = {};
        _.each(cronJobs, function(jobInitializer) {
            var job = jobInitializer(appConfig, repoClients);
            logger.info('Starting cron job "%s"', job.name);
            appConfig.cronjobs[job.name] = job.description;
            job.start();
            if (job.runNow) {
                job._callbacks[0]();
            }
        });


        app.listen(port, function() {
            logger.info('Server running at %s%s.', baseUrl, '/status');
        });

    });

});
