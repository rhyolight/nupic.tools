var fs = require('fs'),
    _ = require('underscore'),
    request = require('request'),
    log = require('./logger').logger,
    yaml = require('js-yaml'),
    GH_USERNAME = process.env.GH_USERNAME,
    GH_PASSWORD = process.env.GH_PASSWORD;

function readConfigFileIntoObject(path) {
    if (! fs.existsSync(path)) {
        log.warn('Config file "' + path + '" does not exist!');
        return;
    }
    var raw = fs.readFileSync(path, 'utf-8');
    var obj;
    try {
        obj = yaml.safeLoad(raw);
    } catch(e) {
        throw new Error('Config file "' + path + '" is invalid YAML!');
    }
    return obj;
}

function createMonitorConfigurations(repos, hooks, contributors) {
    var monitors = {};
    repos.forEach(function(repo) {
        var monitor = {
            username: GH_USERNAME,
            password: GH_PASSWORD,
            contributors: contributors
        };
        // Skip repos explicitly marked as "monitor: false"
        if (typeof(repo.monitor) == 'boolean' && ! repo.monitor) {
            return;
        }
        // Only enable the Travis Validator for repos with travis enabled.
        if (! repo.travis) {
            monitor.validators = {
                exclude: ["Travis Validator"]
            };
        }
        // Put hooks in place if they are defined for this repo.
        if (hooks[repo.slug]) {
            monitor.hooks = hooks[repo.slug];
        }
        monitors[repo.slug] = monitor;
    });
    return monitors;
}

function read(configFile, callback) {
    var username = process.env.USER.toLowerCase(),
        configSplit = configFile.split('.'),
        userFile = configSplit.slice(0, configSplit.length - 1).join('.') + '-' + username + '.yaml',
        config = readConfigFileIntoObject(configFile),
        userConfig = null;

    userConfig = readConfigFileIntoObject(userFile);
    // Fail now if there is no repos_url.
    if (! config.repos_url) {
        return callback(Error('Configuration is missing "repos_url".'));
    }

    request.get(config.repos_url, function(err, resp, body) {
        var repos;
        if (err) {
            return callback(err);
        }

        repos = yaml.safeLoad("---\n" + body).repos;
        config.repos = repos;

        if (userConfig) {
            ['host', 'port', 'logDirectory'].forEach(function(key) {
                if (userConfig[key] !== undefined) {
                    config[key] = userConfig[key];
                }
            });
            // If user specifies their own repos, use them instead of the global ones.
            if (userConfig.repos) {
                config.repos = userConfig.repos;
            }
        }

        config.monitors = createMonitorConfigurations(config.repos,
            config.hooks, config.contributors);

        callback(null, config);
    });
}

// Fail fast.
if (! GH_USERNAME || ! GH_PASSWORD) {
    throw Error('Both GH_USERNAME and GH_PASSWORD environment variables are required for nupic.tools to run.' +
        '\nThese are necessary for making Github API calls.');
}

module.exports.read = read;
