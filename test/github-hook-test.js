var assert = require('assert')
  , proxyquire = require('proxyquire')
  , logCache = {
        debug: []
      , info: []
      , warn: []
      , error: []
    }
  ;

function clearLogCache() {
    logCache = {
        debug: []
      , info: []
      , warn: []
      , error: []
    };
}

describe('github hook handler', function() {
    var validationPerformed = false
      , executedHookCommands = []
      , logs = {
            debug: []
          , info: []
          , warn: []
          , error: []
        }
      , validatedSHA
      , validatedUser
      , validatorsUsed
      , validationPosted
      , githubHookHandlers = proxyquire('./../utils/github-hook-handlers', {
            './general': {
                lastStatusWasExternal: function (repoClient, sha, cb) {
                    cb(true);
                }
            }
          , './sha-validator': {
                performCompleteValidation: function (sha, githubUser, _, validators, postStatus, cb) {
                    validationPerformed = true;
                    validatedSHA = sha;
                    validatedUser = githubUser;
                    validatorsUsed = validators;
                    validationPosted = postStatus;
                    cb();
                }
            }
          , 'child_process': {
                exec: function(cmd, cb) {
                    executedHookCommands.push(cmd);
                    cb(null, 'stdout', 'stderr');
                }
            }
        });
        githubHook = proxyquire('./../github-hook', {
            './utils/github-hook-handlers': githubHookHandlers,
            './utils/general': {
                initializeModulesWithin: function() {
                    return 'validators to be used';
                }
            },
            './utils/logger': {
                logger: {
                    debug: function(msg) {
                        logCache.debug.push(msg);
                    }
                  , info: function(msg) {
                        logCache.info.push(msg);
                    }
                  , warn: function(msg) {
                        logCache.warn.push(msg);
                    }
                  , error: function(msg) {
                        logCache.error.push(msg);
                    }
                }
            }
        });
        mockClients = {'numenta/experiments': {
            hooks: {
                build: 'build hook'
            },
            getCommit: function() {},
            github: {
                statuses: {
                    create: function (statusObj) {
                        validationPosted = statusObj;
                    }
                }
            }
        }};
        handler = githubHook.initializer(mockClients, 'mockConfig');

    clearLogCache();

    it('logs a warning and closes response when unrecognized repository', function() {
        var mockPayload = {
                repository: {
                    full_name: 'does-not-exist'
                }
            },
            mockRequest = {
                headers: {
                    'x-github-event': 'push'
                },
                body: {
                    payload: JSON.stringify(mockPayload)
                }
            },
            endCalled = false,
            mockResponse = {
                end: function() {
                    endCalled = true;
                }
            };

        clearLogCache();

        handler(mockRequest, mockResponse);
        assert(logCache.warn[0]);
        assert.equal(1, logCache.warn.length);
        assert.equal(logCache.warn[0], 'Ignoring GitHub hook event "push" because does-not-exist is not being monitored.');
        assert(endCalled, 'response was not closed');
    });

    it('logs a warning and closes response when unrecognized event', function() {
        var mockPayload = {
                repository: {
                    full_name: 'numenta/experiments'
                }
            },
            mockRequest = {
                headers: {
                    'x-github-event': 'unknown-event'
                },
                body: {
                    payload: JSON.stringify(mockPayload)
                }
            },
            endCalled = false,
            mockResponse = {
                end: function() {
                    endCalled = true;
                }
            };

        clearLogCache();

        handler(mockRequest, mockResponse);
        assert(logCache.warn[0]);
        assert.equal(1, logCache.warn.length);
        assert.equal(logCache.warn[0], 'Ignoring GitHub hook event "unknown-event" on numenta/experiments because there is no event handler for this event type.');
        assert(endCalled, 'response was not closed');
    });

    //it('calls pr handler when sent a mergeable pull_request event', function() {
    //    var mockPayload = {
    //            pull_request: {
    //                action: 'closed',
    //                user: {login: 'login'},
    //                head: {sha: 'sha'},
    //                base: {label: 'label', ref: 'master'},
    //                // a travis passing and mergeable PR:
    //                merged: false,
    //                mergeable: true,
    //                mergeable_state: "clean"
    //            },
    //            repository: {
    //                full_name: 'numenta/experiments'
    //            }
    //        },
    //        mockRequest = {
    //            headers: {
    //                'x-github-event': 'pull_request'
    //            },
    //            body: {
    //                payload: JSON.stringify(mockPayload)
    //            }
    //        },
    //        endCalled = false,
    //        mockResponse = {
    //            end: function() {
    //                endCalled = true;
    //            }
    //        };
    //
    //    validationPerformed = false;
    //
    //    handler(mockRequest, mockResponse);
    //
    //    assert(validationPerformed, 'validation against PR was not performed');
    //    assert.equal(validatedSHA, 'sha', 'validated wrong SHA');
    //    assert.equal(validatedUser, 'login', 'validated wrong user');
    //    assert.equal(validatorsUsed, 'validators to be used', 'used wrong validators');
    //    assert(validationPosted, 'validation status was not posted');
    //    assert(endCalled, 'response was not closed');
    //
    //    // Reset just in case further tests use them.
    //    validationPerformed = undefined;
    //    validatedSHA = undefined;
    //    validatedUser = undefined;
    //    validatorsUsed = undefined;
    //    validationPosted = undefined;
    //});
    
    // it('calls push handler when sent a push event', function() {});
    
    // it('calls status handler when sent a status event', function() {});

    it('calls one build hook command on master build success status event', function() {
        var mockPayload = require('./github_payloads/status_master_build_success'),
            mockRequest = {
                headers: {
                    'x-github-event': 'status'
                },
                body: {
                    payload: JSON.stringify(mockPayload)
                }
            };

        handler(mockRequest);

        assert(!validationPerformed, 'validation against PR should not be performed on successful master build.');
        assert(!validationPosted, 'validation status should not be posted on successful master build.');
        assert.equal(executedHookCommands.length, 1, 'Wrong number of hook commands executed.');
        assert.equal(executedHookCommands[0], 'build hook', 'Wrong hook command executed on master build success.');
        // Reset just in case further tests use them.
        validationPerformed = undefined;
        validatedSHA = undefined;
        validatedUser = undefined;
        validatorsUsed = undefined;
        validationPosted = undefined;
        executedHookCommands = [];

    });

    it('does NOT call build hook commands on non-master build success status event', function() {
        var mockPayload = require('./github_payloads/status_non-master_build_success'),
            mockRequest = {
                headers: {
                    'x-github-event': 'status'
                },
                body: {
                    payload: JSON.stringify(mockPayload)
                }
            };

        handler(mockRequest);

        assert(executedHookCommands.length == 0, 'build hook should NOT have been executed for non-master build success.');

        // Reset just in case further tests use them.
        validationPerformed = undefined;
        validatedSHA = undefined;
        validatedUser = undefined;
        validatorsUsed = undefined;
        validationPosted = undefined;
        executedHookCommands = [];
    });

    it('calls multiple hook commands on master build success status event', function() {
        mockClients = {'numenta/experiments': {
            hooks: {
                build: ['build hook 1', 'build hook 2']
            },
            getCommit: function() {}
        }};
        handler = githubHook.initializer(mockClients, 'mockConfig');
        var mockPayload = require('./github_payloads/status_master_build_success'),
            mockRequest = {
                headers: {
                    'x-github-event': 'status'
                },
                body: {
                    payload: JSON.stringify(mockPayload)
                }
            };

        handler(mockRequest);

        assert(!validationPerformed, 'validation against PR should not be performed on successful master build.');
        assert(!validationPosted, 'validation status should not be posted on successful master build.');
        assert.equal(executedHookCommands.length, 2, 'Wrong number of hook commands executed.');
        assert.equal(executedHookCommands[0], 'build hook 1', 'Wrong hook command executed on master build success.');
        assert.equal(executedHookCommands[1], 'build hook 2', 'Wrong hook command executed on master build success.');

        // Reset just in case further tests use them.
        validationPerformed = undefined;
        validatedSHA = undefined;
        validatedUser = undefined;
        validatorsUsed = undefined;
        validationPosted = undefined;
        executedHookCommands = [];
    });

    it('calls one build hook command on tag event', function(done) {
        mockClients = {'numenta/experiments': {
            hooks: {
                tag: 'tag hook'
            }
        }};
        handler = githubHook.initializer(mockClients, 'mockConfig');

        var mockPayload = require('./github_payloads/experiments_tag'),
            mockRequest = {
                headers: {
                    'x-github-event': 'push'
                },
                body: {
                    payload: JSON.stringify(mockPayload)
                }
            };

        handler(mockRequest, {end: done});

        assert(!validationPerformed, 'validation against PR should not be performed on successful master build.');
        assert(!validationPosted, 'validation status should not be posted on successful master build.');
        assert.equal(executedHookCommands.length, 1, 'Wrong number of hook commands executed.');
        assert.equal(executedHookCommands[0], 'tag hook', 'Wrong hook command executed on master build success.');

        // Reset just in case further tests use them.
        validationPerformed = undefined;
        validatedSHA = undefined;
        validatedUser = undefined;
        validatorsUsed = undefined;
        validationPosted = undefined;
        executedHookCommands = [];

    });


});
