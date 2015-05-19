var fs = require('fs')
  , path = require('path')
  , exec = require('child_process').exec
  , _ = require('lodash')
  , RepositoryClient = require('./repo-client')
  , NUPIC_STATUS_PREFIX = 'NuPIC Status:'
  , log = require('./logger').logger
  ;

/* Logs error and exits. */
function die(err) {
    log.error(err);
    process.exit(-1);
}

/**
 * Reads all the JavaScript files within a directory, assuming they are all
 * proper node.js modules, and loads them.
 * @return {Array} Modules loaded.
 */
function initializeModulesWithin(dir) {
    var output = []
      , fullDir = path.join(__dirname, '..', dir)
      ;
    fs.readdirSync(fullDir).forEach(function(fileName) {
        var moduleName = fileName.split('.').shift();
        if(fileName.charAt(0) != "."
                && fileName.substr(fileName.length - 3) == ".js") {
            output.push(require('../' + dir + '/' + moduleName));
        }
    });
    return output;
}

/**
 * Given the entire merged app configuration, constructs a map of RepositoryClient
 * objects, properly registering Github webhook handlers for each if they don't
 * have them yet.
 *
 * If an error occurs during communication with Github, the application startup
 * will fail.
 *
 * @param {String} Pull request web hook URL to register with Github.
 * @param {Object} Application configuration.
 * @param {Function} Callback, to be sent a map of RepositoryClient objects,
 * constructed using the "monitors" part of the configuration, keyed by Github
 * "org/repo".
 */
function constructRepoClients(prWebhookUrl, config, callback) {
    var repoClients = {}
      , uncheckedClients = []
      , monitorKeys = _.keys(config.monitors)
      , count = 0
      ;

    // Set up one github client for each repo target in config.
    _.each(monitorKeys, function(monitorKey) {
        var monitorConfig = config.monitors[monitorKey]
          , keyParts = monitorKey.split('/')
          , org = keyParts.shift()
          , repo = keyParts.shift()
          , repoClient
          ;

        monitorConfig.organization = org;
        monitorConfig.repository = repo;
        monitorConfig.type = _.find(config.repos, function(r) {
            return r.slug == org + '/' + repo;
        }).type || 'unknown';

        if (! monitorConfig.validators) {
            monitorConfig.validators = {};
        }
        repoClient = new RepositoryClient(monitorConfig);
        log.info('RepositoryClient created for '
            + monitorConfig.username.magenta + ' on '
            + repoClient.toString().magenta);

        uncheckedClients.push(repoClient);
    });

    // Check the rate limit before making any real calls.
    uncheckedClients[0].rateLimit(function(err, rateLimit) {
        log.debug(rateLimit.rate);
        log.debug('GitHub API calls remaining before rate limit exceeded: %s.',
            rateLimit.rate.remaining);
        log.debug('Github API rate limit resets at %s.', 
            new Date(rateLimit.rate.reset * 1000).toString());
        if (rateLimit.rate.remaining == 0) {
            throw Error('Github API Rate Limit Exceeded!');
        }

        // Now confirm all webhooks are ready.
        _.each(uncheckedClients, function(repoClient, i) {
            var monitorKey = monitorKeys[i];
            repoClient.confirmWebhookExists(
                prWebhookUrl
              , config.githooks
              , function(err, hook) {
                    if (err) {
                        log.error('Error during webhook confirmation for ' 
                            + repoClient.toString());
                        die(err);
                    } else {
                        count++;
                    }
                    repoClients[monitorKey] = repoClient;
                    if (count == (Object.keys(config.monitors).length))  {
                        callback(repoClients);
                    }
                }
            );
        });
    });

}

/* Sorts github statuses by created_at time */
function sortStatuses(statuses) {
    return statuses.sort(function(a, b) {
        var aDate = new Date(a.created_at)
          , bDate = new Date(b.created_at)
          ;
        if (aDate > bDate) {
            return -1;
        } else if (aDate < bDate) {
            return 1;
        }
        return 0;
    });
}

/**
 * Checks to see if the latest status in the history for this SHA was created by
 * the nupic.tools server or was externally created.
 */
function lastStatusWasExternal(repoClient, sha, callback) {
    repoClient.getAllStatusesFor(sha, function(err, statusHistory) {
        var latestStatus
          , external = false;

        if (statusHistory.length) {
            latestStatus = sortStatuses(statusHistory).shift();
            if (latestStatus.description.indexOf(NUPIC_STATUS_PREFIX) != 0) {
                external = true;
            }
        }

        if (callback) {
            callback(external);
        }
    });
}

/* Removes the passwords from the config for logging. */
function sterilizeConfig(config) {
    var out = JSON.parse(JSON.stringify(config));
    Object.keys(out.monitors).forEach(function(k) {
        if (out.monitors[k].password) {
            out.monitors[k].password = '<hidden>';
        }
    });
    return out;
}

function executeCommand(command) {
    log.warn('Executing hook command "%s"', command);
    exec(command, function (error, stdout, stderr) {
        log.debug(stdout);
        if (stderr) { log.warn('STDERR: %s', stderr); }
        if (error) {
            log.error('Command execution error: %s', error);
        }
    });
}

function getHooksForMonitorForType(type, repoClient) {
    var hooks = [];
    if (repoClient && repoClient.hooks && repoClient.hooks[type]) {
        // Could be a strong or an array of strings.
        if (typeof(repoClient.hooks[type]) == 'string') {
            hooks.push(repoClient.hooks[type]);
        } else {
            hooks = repoClient.hooks[type];
        }
    }
    return hooks;
}

module.exports = {
    initializeModulesWithin: initializeModulesWithin
  , constructRepoClients: constructRepoClients
  , sterilizeConfig: sterilizeConfig
  , sortStatuses: sortStatuses
  , lastStatusWasExternal: lastStatusWasExternal
  , executeCommand: executeCommand
  , getHooksForMonitorForType: getHooksForMonitorForType
  , __module: module // for unit testing and mocking require()
};
