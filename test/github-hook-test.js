var assert = require('chai').assert
  , expect = require('chai').expect
  , proxyquire = require('proxyquire')
  , logCache = {
        debug: []
      , info: []
      , warn: []
      , error: []
    }
  , mockLogger = {
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

    it('logs a warning and closes response when unrecognized repository', function() {
        var githubHook = proxyquire('./../github-hook', {
            './utils/github-hook-handlers': {}
          , './utils/general': {
                initializeModulesWithin: function() {
                    return 'validators to be used';
                }
            }
          , './utils/logger': {
                logger: mockLogger
            }
        })
      , mockClients = {'numenta/experiments': {
            hooks: {
                build: 'build hook'
            }
          , getCommit: function() {}
          , github: {
                statuses: {
                    create: function (statusObj) {
                        validationPosted = statusObj;
                    }
                }
            }
        }}
      , mockPayload = {
            repository: {
                full_name: 'does-not-exist'
            }
        }
      , mockRequest = {
            headers: {
                'x-github-event': 'push'
            }
          , body: {
                payload: JSON.stringify(mockPayload)
            }
        }
      , endCalled = false
      , mockResponse = {
            end: function() {
                endCalled = true;
            }
        }
      , handler = githubHook.initializer(mockClients, 'mockConfig')
      ;
        clearLogCache();

        handler(mockRequest, mockResponse);

        assert(logCache.warn[0]);
        assert.equal(1, logCache.warn.length);
        assert.equal(logCache.warn[0], 'Ignoring GitHub hook event "push" because does-not-exist is not being monitored.');
        assert(endCalled, 'response was not closed');
    });

    it('logs a warning and closes response when unrecognized event', function() {
        var githubHook = proxyquire('./../github-hook', {
            './utils/github-hook-handlers': {}
          , './utils/general': {
                initializeModulesWithin: function() {
                    return 'validators to be used';
                }
            }
          , './utils/logger': {
                logger: mockLogger
            }
        })
      , mockClients = {'numenta/experiments': {
            hooks: {
                build: 'build hook'
            }
          , getCommit: function() {}
          , github: {
                statuses: {
                    create: function (statusObj) {
                        validationPosted = statusObj;
                    }
                }
            }
        }}
      , mockPayload = {
            repository: {
                full_name: 'numenta/experiments'
            }
        }
      , mockRequest = {
            headers: {
                'x-github-event': 'unknown-event'
            }
          , body: {
                payload: JSON.stringify(mockPayload)
            }
        }
      , endCalled = false
      , mockResponse = {
            end: function() {
                endCalled = true;
            }
        }
      , handler = githubHook.initializer(mockClients, 'mockConfig')
      ;
        clearLogCache();

        handler(mockRequest, mockResponse);

        assert(logCache.warn[0]);
        assert.equal(1, logCache.warn.length);
        assert.equal(logCache.warn[0], 'Ignoring GitHub hook event "unknown-event" on numenta/experiments because there is no event handler for this event type.');
        assert(endCalled, 'response was not closed');
    });

    it('calls pull_request handler when sent a pull_request event', function() {
        var prHandlerCalled = false
          , endCalled = false
          , githubHook = proxyquire('./../github-hook', {
                './utils/github-hook-handlers': {
                    pull_request: function(payload, config, repoClient, validators, callback) {
                        expect(payload).to.deep.equal(mockPayload);
                        expect(config).to.equal('mock config');
                        expect(repoClient).to.equal('mock repo-client');
                        expect(validators).to.equal('validators to be used');
                        prHandlerCalled = true;
                        callback();
                    }
                }
              , './utils/general': {
                    initializeModulesWithin: function() {
                        return 'validators to be used';
                    }
                }
            })
          , mockClients = {'numenta/experiments': 'mock repo-client'}
          , mockPayload = {
                repository: {
                    full_name: 'numenta/experiments'
                }
            }
          , mockRequest = {
                headers: {
                    'x-github-event': 'pull_request'
                }
              , body: {
                    payload: JSON.stringify(mockPayload)
                }
            }
          , mockResponse = {
                end: function() {
                    endCalled = true;
                }
            }
          , handler = githubHook.initializer(mockClients, 'mock config')
          ;

        handler(mockRequest, mockResponse);

        assert(endCalled, 'response was not closed');
        assert(prHandlerCalled, 'pr handler was not called');
    });
    
    it('calls push handler when sent a push event', function() {
        var prHandlerCalled = false
            , endCalled = false
            , githubHook = proxyquire('./../github-hook', {
                './utils/github-hook-handlers': {
                    push: function(payload, config, repoClient, validators, callback) {
                        expect(payload).to.deep.equal(mockPayload);
                        expect(config).to.equal('mock config');
                        expect(repoClient).to.equal('mock repo-client');
                        expect(validators).to.equal('validators to be used');
                        prHandlerCalled = true;
                        callback();
                    }
                }
                , './utils/general': {
                    initializeModulesWithin: function() {
                        return 'validators to be used';
                    }
                }
            })
            , mockClients = {'numenta/experiments': 'mock repo-client'}
            , mockPayload = {
                repository: {
                    full_name: 'numenta/experiments'
                }
            }
            , mockRequest = {
                headers: {
                    'x-github-event': 'push'
                }
                , body: {
                    payload: JSON.stringify(mockPayload)
                }
            }
            , mockResponse = {
                end: function() {
                    endCalled = true;
                }
            }
            , handler = githubHook.initializer(mockClients, 'mock config')
            ;

        handler(mockRequest, mockResponse);

        assert(endCalled, 'response was not closed');
        assert(prHandlerCalled, 'pr handler was not called');
    });

    it('calls status handler when sent a status event', function() {
        var prHandlerCalled = false
            , endCalled = false
            , githubHook = proxyquire('./../github-hook', {
                './utils/github-hook-handlers': {
                    status: function(payload, config, repoClient, validators, callback) {
                        expect(payload).to.deep.equal(mockPayload);
                        expect(config).to.equal('mock config');
                        expect(repoClient).to.equal('mock repo-client');
                        expect(validators).to.equal('validators to be used');
                        prHandlerCalled = true;
                        callback();
                    }
                }
                , './utils/general': {
                    initializeModulesWithin: function() {
                        return 'validators to be used';
                    }
                }
            })
            , mockClients = {'numenta/experiments': 'mock repo-client'}
            , mockPayload = {
                repository: {
                    full_name: 'numenta/experiments'
                }
            }
            , mockRequest = {
                headers: {
                    'x-github-event': 'status'
                }
                , body: {
                    payload: JSON.stringify(mockPayload)
                }
            }
            , mockResponse = {
                end: function() {
                    endCalled = true;
                }
            }
            , handler = githubHook.initializer(mockClients, 'mock config')
            ;

        handler(mockRequest, mockResponse);

        assert(endCalled, 'response was not closed');
        assert(prHandlerCalled, 'pr handler was not called');
    });

    it('calls gollum handler when sent a gollum event', function() {
        var prHandlerCalled = false
            , endCalled = false
            , githubHook = proxyquire('./../github-hook', {
                './utils/github-hook-handlers': {
                    gollum: function(payload, config, repoClient, validators, callback) {
                        expect(payload).to.deep.equal(mockPayload);
                        expect(config).to.equal('mock config');
                        expect(repoClient).to.equal('mock repo-client');
                        expect(validators).to.equal('validators to be used');
                        prHandlerCalled = true;
                        callback();
                    }
                }
                , './utils/general': {
                    initializeModulesWithin: function() {
                        return 'validators to be used';
                    }
                }
            })
            , mockClients = {'numenta/experiments': 'mock repo-client'}
            , mockPayload = {
                repository: {
                    full_name: 'numenta/experiments'
                }
            }
            , mockRequest = {
                headers: {
                    'x-github-event': 'gollum'
                }
                , body: {
                    payload: JSON.stringify(mockPayload)
                }
            }
            , mockResponse = {
                end: function() {
                    endCalled = true;
                }
            }
            , handler = githubHook.initializer(mockClients, 'mock config')
            ;

        handler(mockRequest, mockResponse);

        assert(endCalled, 'response was not closed');
        assert(prHandlerCalled, 'pr handler was not called');
    });

});
