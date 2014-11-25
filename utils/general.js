var fs = require('fs'),
    path = require('path'),
    _ = require('underscore'),
    RepositoryClient = require('./repo-client'),
    NUPIC_STATUS_PREFIX = 'NuPIC Status:',
    log = require('./logger').logger;

/* Logs error and exits. */
function die(err) {
    log.error(err);
    process.exit(-1);
}

var arrayUnique = function(a) {
    return a.reduce(function(p, c) {
        if (p.indexOf(c) < 0) p.push(c);
        return p;
    }, []);
};

/**
 * Reads all the JavaScript files within a directory, assuming they are all
 * proper node.js modules, and loads them.
 * @return {Array} Modules loaded.
 */
function initializeModulesWithin(dir, exclusions) {
    var output = [];
    var fullDir = path.join(__dirname, '..', dir);
    fs.readdirSync(fullDir).forEach(function(fileName) {
        var moduleName = fileName.split('.').shift(),
            excluded = false;
        if (exclusions != undefined && exclusions.indexOf(moduleName) > -1) {
            excluded = true;
        }
        if(! excluded &&
                fileName.charAt(0) != "."
                && fileName.substr(fileName.length - 3) == ".js")   {
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
    var repoClients = {},
        uncheckedClients = [],
        globalValidatorConfig = config.validators,
        monitorKeys = _.keys(config.monitors),
        count = 0;

    // Set up one github client for each repo target in config.
    _.each(monitorKeys, function(monitorKey) {
        var monitorConfig = config.monitors[monitorKey],
            keyParts = monitorKey.split('/'),
            org = keyParts.shift(),
            repo = keyParts.shift(),
            repoClient;

        monitorConfig.organization = org;
        monitorConfig.repository = repo;

        if (! monitorConfig.validators) {
            monitorConfig.validators = {};
        }
        if (! monitorConfig.validators.exclude) {
            monitorConfig.validators.exclude = [];
        }
        if (globalValidatorConfig && globalValidatorConfig.exclude) {
            monitorConfig.validators.exclude
                = arrayUnique(monitorConfig.validators.exclude.concat(globalValidatorConfig.exclude));
        }

        repoClient = new RepositoryClient(monitorConfig);
        log.log('RepositoryClient created for '
            + monitorConfig.username.magenta + ' on '
            + repoClient.toString().magenta);

        uncheckedClients.push(repoClient);

    });

    // Check the rate limit before making any real calls.
    uncheckedClients[0].rateLimit(function(err, rateLimit) {
        log.debug(rateLimit.rate);
        log.debug('GitHub API calls remaining before rate limit exceeded: %s.', rateLimit.rate.remaining);
        log.debug('Github API rate limit resets at %s.', new Date(rateLimit.rate.reset * 1000).toString());
        if (rateLimit.rate.remaining == 0) {
            throw Error('Github API Rate Limit Exceeded!');
        }

        // Now confirm all webhooks are ready.
        _.each(uncheckedClients, function(repoClient, i) {
            var monitorKey = monitorKeys[i];
            repoClient.confirmWebhookExists(prWebhookUrl, config.githooks, function(err, hook) {
                if (err) {
                    log.error('Error during webhook confirmation for ' + repoClient.toString());
                    die(err);
                } else {
                    if (hook) {
                        log.warn('Webhook created on ' + repoClient.toString() + ':\n'
                            + '\tfor "' + hook.events.join(', ') + '"\n'
                            + '\ton ' + hook.config.url);
                    } else {
                        log.log('Webhook exists for ' + repoClient.toString());
                    }
                    count++;
                }
                repoClients[monitorKey] = repoClient;
                if (count == (Object.keys(config.monitors).length))  {
                    callback(repoClients);
                }
            });
        });
    });

}

/* Sorts github statuses by created_at time */
function sortStatuses(statuses) {
    return statuses.sort(function(a, b) {
        var aDate = new Date(a.created_at),
            bDate = new Date(b.created_at);
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

/**
 * Some old statuses have old redundant prefixes due to previous processing errors
 * that list "Nupic Status: " multiple times before the actual status message.
 * This will clean those up so there is only one.
 */
function normalizeStatusDescription(description) {
    var output = description;
    // First, we'll remove any existing NuPIC Status prefixes
    while (output.indexOf(NUPIC_STATUS_PREFIX) == 0) {
        output = output.substr(NUPIC_STATUS_PREFIX.length + 1);
    }
    // Finally, add the one true prefix.
    return NUPIC_STATUS_PREFIX + ' ' + output;
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

module.exports = {
    initializeModulesWithin: initializeModulesWithin,
    constructRepoClients: constructRepoClients,
    sterilizeConfig: sterilizeConfig,
    sortStatuses: sortStatuses,
    normalizeStatusDescription: normalizeStatusDescription,
    lastStatusWasExternal: lastStatusWasExternal,
    __module: module // for unit testing and mocking require()
};
