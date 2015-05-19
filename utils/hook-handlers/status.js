var _ = require('lodash')
  , utils = require('../general')
  , log = require('../logger').logger
  , shaValidator = require('../sha-validator')
  , TRAVIS_CONTEXT = 'continuous-integration/travis-ci'
  ;


function isExternalContext(context, validators) {
    return ! _.contains(_.map(validators, function(validator) {
        return validator.name;
    }), context);
}

/*
 * Given a request payload from Github, and the RepositoryClient object associated
 * with this repo, this function retrieves all the known statuses for the repo,
 * assures that this status did not originate from this server (nupic.tools), then
 * performs a complete validation of the repository.
 */
function statusHandler(payload, config, repoClient, validators, callback) {
    var sha = payload.sha
      , state = payload.state
      , branches = payload.branches
      , context = payload.context
      , isMaster = undefined
      , buildHooks = undefined
      ;

    log.info('State of %s has changed to "%s" for "%s".', sha, state, context);
    // A "success" state means that a build passed. If the build passed on the
    // master branch, we need to trigger a "build" hook, which might execute a
    // script to run in the /bin directory.
    isMaster = _.some(branches, function(branch) {
        return branch.name == 'master';
    });

    // If this was a successful build of the master branch, we want to trigger the
    // build success hook.
    if (state == 'success' && isMaster && context.indexOf(TRAVIS_CONTEXT) == 0) {
        buildHooks = utils.getHooksForMonitorForType('build', repoClient);
        log.info('Github build success event on %s', repoClient.toString());
        // Only process when there is a build hook defined.
        _.each(buildHooks, function(hookCmd) {
            utils.executeCommand(hookCmd);
        });
        callback();
    }
    // Only process state changes caused by external services (not this server).
    else if (isExternalContext(context, validators)) {
        shaValidator.performCompleteValidation(
            sha
          , payload.commit.committer.login
          , repoClient
          , validators
          , true
          , callback
        );
    } else {
        log.info('Ignoring state change.');
        callback();
    }
}

module.exports = statusHandler;