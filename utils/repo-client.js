var GitHubApi = require('github')
  , Travis = require('travis-ci')
  , AppVeyor = require('appveyor-js-client')
  , _ = require('lodash')
  , async = require('async')
  , log = require('./logger').logger
  , RepositoryClient
  ;

/**
 * An interface to the Github repository. Uses the Github API.
 * @class
 * @module
 */
function RepositoryClient(config) {
    var me = this;
    this.user = config.username;
    this.password = config.password;
    this.org = config.organization;
    this.repo = config.repository;
    this.type = config.type;
    this.contributorsUrl = config.contributors;
    this.host = config.host;
    this._createNewWebhooks = ! config.skip_webhook_registration;

    // Set up GitHub API Client.
    this.github = new GitHubApi({
        version: '3.0.0'
      , timeout: 5000
    });
    this.github.authenticate({
        type: 'basic'
      , username: this.user
      , password: this.password
    });

    // Set up Travis-CI API Client.
    this.travis = new Travis({ version: '2.0.0' });
    this.travis.authenticate({
        username: this.user
      , password: this.password
    }, function() {});

    // Set up AppVeyor API Client.
    // APPVEYOR_API_TOKEN must be in the environment for the 'numenta-ci'
    // account.
    try {
        this.appveyor = new AppVeyor('numenta-ci');
        this.appveyor.getProjects(function(err, projects) {
            if (err) throw err;
            _.each(projects, function(project) {
                if (project.repoSlug == me.getRepoSlug()) {
                    me.appveyorProject = project;
                }
            });
            if (! me.appveyorProject) {
                log.warn('No AppVeyor builds for ' + me);
            } else {
                log.info('AppVeyor builds exist for ' + me);
            }
        });
    } catch(e) {
        log.warn(e.toString());
    }

    // Store configured validators.
    this.validators = config.validators;
    // Store configured hooks.
    if (config.hasOwnProperty('hooks')) {
        this.hooks = config.hooks;
    } else {
        this.hooks = {};
    }
}
module.exports = RepositoryClient;

/**
 * @method
 * @public
 */
RepositoryClient.prototype.merge = function(head, base, callback) {
    log.info('merging ' + head + ' into ' + base + '...');
    this.github.repos.merge({
        user: this.org
      , repo: this.repo
      , base: base
      , head: head
    }, callback);
};

/**
 * @method
 * @public
 */
RepositoryClient.prototype.isBehindMaster = function(sha, callback) {
    this.github.repos.compareCommits({
        user: this.org
      , repo: this.repo
      , base: 'master'
      , head: sha
    }, function(err, data) {
        if (err) {
            callback(err);
        } else {
            callback(err, data.behind_by > 0, data.behind_by);
        }
    });
};

/**
 * Create a new comment for a GitHub PullRequest or Issue
 * @alias createIssueComment
 * @method
 * @param {object} parent - GitHubAPI PullRequest or Issue object,
 *  to Create comment for.
 * @param {string} body - Text message body for newly created PR/Issue comment
 * @param {function} callback - Async callback: function (error) {}
 * @public
 */
RepositoryClient.prototype.createPullRequestComment = function (parent, body, callback) {
  this.github.issues.createComment(
    {
      number: parent.number,
      user:   parent.base.user.login,
      repo:   parent.head.repo.name,
      body:   body
    },
    callback
  );
};
RepositoryClient.prototype.createIssueComment = RepositoryClient.prototype.createPullRequestComment;

/**
 * Get all Comments for a specific GitHub PullRequest or Issue
 * @alias getIssueComments
 * @method
 * @param {object} parent - GitHubAPI PullRequest or Issue object, to
 *  load admin comments for.
 * @param {function} callback - Async callback: function (error, comments) {}
 * @public
 */
RepositoryClient.prototype.getPullRequestComments = function (parent, callback) {
  this.github.issues.getComments(
    {
      number: parent.number,
      repo:   parent.head.repo.name,
      user:   parent.base.user.login
    },
    function(error, results) {
      if(error) {
        callback(error);
        return;
      }
      if(results) {
        results = results.map(function(result) {
          // augment results with missing helpful info
          result.number = parent.number;
          result.repo = parent.head.repo.name;
          result.user = parent.base.user.login;
          return result;
        });
        callback(null, results);
      }
    }
  );
};
RepositoryClient.prototype.getIssueComments = RepositoryClient.prototype.getPullRequestComments;

/**
 * @method
 * @public
 */
RepositoryClient.prototype.getAllOpenPullRequests = function(params, callback) {
    var me = this, myCallback;
    if (typeof params == 'function') {
        myCallback = params;
        callback = params;
        params = {};
    } else {
        myCallback = callback;
    }

    function labelIntercept(error, prs) {
        var labelFetchers = {};
        if (error) return myCallback(error);

        _.each(prs, function(pr) {
            labelFetchers[pr.number] = function(labelCallback) {
                log.debug('fetching labels for %s', pr.number);
                me.github.issues.getIssueLabels({
                    user: me.org
                    , repo: me.repo
                    , number: pr.number
                }, labelCallback);
            };
        });

        async.parallel(labelFetchers, function(error, labels) {
            if (error) return myCallback(error);
            _.each(labels, function(labelData, prNumber) {
                log.debug('processing labels for PR #%s...', prNumber);
                var pr = _.find(prs, function(pr) {
                        return pr.number == prNumber;
                    })
                  ;
                if (! pr) {
                    return myCallback(
                        new Error('No labels found for PR #%s!', prNumber)
                    );
                }
                delete labelData.meta;
                pr.labels = labelData;
            });
            // Calling the original callback here or else we get caught in an
            // endless loop.
            callback(null, prs);
        });
    }

    if (params.includeLabels) {
        myCallback = labelIntercept;
    }

    this.github.pullRequests.getAll({
        user: this.org
      , repo: this.repo
      , state: 'open'
    }, myCallback);
};

/**
 * @method
 * @public
 */
RepositoryClient.prototype.getContributors = function(callback) {
    var me = this;
    me.github.repos.getContributors({
        user: me.org
      , repo: me.repo
    }, function(err, contributors) {
        if (err) {
            callback(err);
        } else {
            me._getRemainingPages(contributors, null, callback);
        }
    });
};

/**
 * @method
 * @public
 */
RepositoryClient.prototype.getCommits = function(callback) {
    var me = this;
    me.github.repos.getCommits({
        user: me.org
      , repo: me.repo
    }, function(err, commits) {
        if (err) {
            callback(err);
        } else {
            me._getRemainingPages(commits, null, callback);
        }
    });
};

/**
 * @method
 * @public
 */
RepositoryClient.prototype.getAllStatusesFor = function(sha, callback) {
    this.github.statuses.get({
        user: this.org
      , repo: this.repo
      , sha: sha
    }, function(err, statuses) {
        callback(err, (statuses || []));
    });
};

/**
 * @method
 * @public
 */
RepositoryClient.prototype.getCommit = function(sha, callback) {
    this.github.repos.getCommit({
        user: this.org
      , repo: this.repo
      , sha: sha
    }, callback);
};

/**
 * @method
 * @public
 */
RepositoryClient.prototype.compareCommits = function(base, head, callback) {
    this.github.repos.compareCommits({
        user: this.org
      , repo: this.repo
      , base: base
      , head: head
    }, callback);
};

/**
 * @method
 * @public
 */
RepositoryClient.prototype.getLastCommitOnPullRequest = function(prNumber, callback) {
    this.github.pullRequests.getCommits({
        user: this.org
      , repo: this.repo
      , number: prNumber
      , per_page: 100
    }, function(err, commits) {
        if (err) {
            callback(err);
        } else {
            callback(null, commits[commits.length - 1]);
        }
    });
};

/**
 * @method
 * @public
 */
RepositoryClient.prototype.searchIssues = function(query, callback) {
    this.github.search.issues({
        user: this.org
      , repo: this.repo
      , q: query
    }, callback);
};

/**
 * @method
 * @public
 */
RepositoryClient.prototype.getContent = function(path, callback) {
    this.github.repos.getContent({
        user: this.org
      , repo: this.repo
      , path: path
    }, callback);
};

/**
 * @method
 * @public
 */
RepositoryClient.prototype.rateLimit = function(callback) {
    this.github.misc.rateLimit({
        user: this.org
      , repo: this.repo
    }, callback);
};

/*
 * TODO: This is smelly because WTF is this repo client doing removing and
 * recreating GitHub web hooks? Seems out of scope of its responsibilities.
 * @method
 * @public
 */
RepositoryClient.prototype.confirmWebhookExists
= function(url, events, callback) {
    var me = this
      , slug = this.getRepoSlug()
      ;
    log.debug('Finding existing web hooks for %s...', slug);
    this.github.repos.getHooks({
        user: this.org
      , repo: this.repo
    }, function(err, hooks) {
        var hookRemovers = [];
        if (err) {
            log.error(err);
            return callback(err);
        }
        log.debug('Found %s webhooks for %s', hooks.length, slug);
        hooks.forEach(function(hook) {
            // If the hook URL contains this app's hostname, we should delete.
            if (hook.config && _.contains(hook.config.url, me.host)) {
                hookRemovers.push(function(hookRemovalCallback) {
                    // Remove the old webhook
                    log.warn('%s: Removing webhook %s for %s.'
                        , slug, hook.id, url);
                    me.github.repos.deleteHook({
                        user: me.org
                      , repo: me.repo
                      , id: hook.id
                    }, hookRemovalCallback);
                });
            }
        });
        // First, remove any stale webhooks we found.
        async.parallel(hookRemovers, function(err) {
            if (err) {
                return callback(err);
            }
            if (me._createNewWebhooks && events && events.length) {
                me.github.repos.createHook({
                    user: me.org,
                    repo: me.repo,
                    name: 'web',
                    config: {
                        url: url
                    },
                    events: events
                }, function(err, data) {
                    if (err) {
                        return callback(err);
                    }
                    log.warn(
                        '%s: created web hook %s for %s, '
                            + 'monitoring events "%s"'
                      , slug
                      , data.id
                      , data.config.url
                      , data.events.join(', ')
                    );
                    callback();
                });
            } else {
                callback();
            }
        });
    });
};

/**
 * This is a fire-and-forget function.
 * @method
 * @param prNumber
 * @public
 */
RepositoryClient.prototype.triggerTravisForPullRequest = function(prNumber) {
    var travis = this.travis
      , slug = this.getRepoSlug()
      , prUrl = 'https://github.com/' + slug + '/pull/' + prNumber
      ;
    log.debug('Finding builds for %s...', slug);
    travis.builds({
        slug: slug
      , event_type: 'pull_request'
    }, function(err, response) {
        var pr = _.find(response.builds, function(build) {
            return build.pull_request_number == prNumber;
        });
        if (pr) {
            log.debug('Triggering build for %s', prUrl);
            travis.builds.restart({ id: pr.id }, function() {});
        }
    });
};

/**
 * This is a fire-and-forget function.
 * @method
 * @param prNumber
 * @param callback
 * @public
 */
RepositoryClient.prototype.triggerAppVeyorForPullRequest = function(prNumber) {
    if (this.appveyorProject) {
        this.appveyorProject.startBuildOfPullRequest(prNumber);
    }
};

/**
 * @method
 * @private
 */
RepositoryClient.prototype._getRemainingPages
    = function(lastData, allDataOld, callback) {
    var me = this
      , allData = []
      ;
    if (allDataOld) {
        allData = allData.concat(allDataOld);
    }
    allData = allData.concat(lastData);
    me.github.getNextPage(lastData, function(error, newData){
        if (error) {
            callback(null, allData);
        } else {
            me._getRemainingPages(newData, allData, callback)
        }
    });
};

/**
 * @method
 * @public
 */
RepositoryClient.prototype.getRepoSlug = function() {
    return this.org + '/' + this.repo;
};

/**
 * @method
 * @public
 */
RepositoryClient.prototype.toString = function() {
    return this.getRepoSlug();
};
