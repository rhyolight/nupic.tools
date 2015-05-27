var fs = require('fs')
  , _ = require('lodash')
  , request = require('request')
  , log = require('./logger').logger
  , yaml = require('js-yaml')
  , GH_USERNAME = process.env.GH_USERNAME
  , GH_PASSWORD = process.env.GH_PASSWORD
    // TODO: This smells bad because any time someone wants to add a new config
    // value and they want the user to be able to override it, they have to add
    // the key name to this array.
  , OVERRIDE_PARAMS = [
        'host', 'port', 'logDirectory', 'logLevel'
      , 'githooks', 'skip_webhook_registration'
    ]
  ;

function readConfigFileIntoObject(path) {
    log.info('Reading config from %s...', path);
    var raw, obj;
    if (! fs.existsSync(path)) {
        log.warn('Config file "' + path + '" does not exist!');
        return;
    }
    raw = fs.readFileSync(path, 'utf-8');
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
            username: GH_USERNAME
          , password: GH_PASSWORD
          , contributors: contributors
        };
        // Skip repos explicitly marked as "monitor: false"
        if (typeof(repo.monitor) == 'boolean' && ! repo.monitor) {
            return;
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
    var username
      , configSplit = configFile.split('.')
      , userFile
      , config = readConfigFileIntoObject(configFile)
      , userConfig = null
      ;

    if (process.env.USER) {
        username = process.env.USER.toLowerCase();
        userFile = configSplit.slice(
                0, configSplit.length - 1
            ).join('.') + '-' + username + '.yaml';
        userConfig = readConfigFileIntoObject(userFile);
    }

    function processReposConfig(repos) {
        config.repos = repos;

        if (userConfig) {
            OVERRIDE_PARAMS.forEach(function(key) {
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
            config.hooks, config.contributors
        );
        callback(null, config);
    }

    // A local repos config overrides the URL to a global one (for testing)
    if (config.repos) {
        processReposConfig(config.repos);
    } else {
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
            processReposConfig(repos);
        });
    }

}

// Fail fast.
if (! GH_USERNAME || ! GH_PASSWORD) {
    throw Error('Both GH_USERNAME and GH_PASSWORD environment variables are '
        + 'required for nupic.tools to run.' +
        '\nThese are necessary for making Github API calls.');
}

module.exports.read = read;
