var _ = require('lodash')
  , utils = require('../../utils/general')
  , log = require('../../utils/logger').logger
  ;

/*
 * Handles an event from Github that indicates that a PR has been merged into one
 * of the repositories. This could trigger a script to run locally in response,
 * called a "push hook", which are defined in the configuration of each repo as
 * hooks.push = 'path/to/script'.
 */
function pushHandler(payload, config, repoClient, validators, callback) {
    var repoSlug = payload.repository.full_name
      , ref = payload.ref.split('/')
      , refType = ref[1]
      , refName = ref[2]
      , branch = undefined
      , tag = undefined
      , pushHooks = utils.getHooksForMonitorForType('push', repoClient)
      , tagHooks = utils.getHooksForMonitorForType('tag', repoClient)
      ;

    if (refType == 'heads') {
        branch = refName;
    } else if (refType == 'tags') {
        tag = refName;
    }

    if (branch) {
        log.info('GitHub push event on %s:%s', repoSlug, branch);
        // Only process pushes to master, and only when there is a push hook
        // defined.
        if (branch == 'master') {
            _.each(pushHooks, function(hookCmd) {
                utils.executeCommand(hookCmd);
            });
        }
    } else if (tag) {
        log.info('Github tag event on %s:%s', repoSlug, tag);
        _.each(tagHooks, function(hookCmd) {
            utils.executeCommand(hookCmd);
        });
    }
    callback();
}

module.exports = pushHandler;