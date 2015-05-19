var assert = require('assert')
  , proxyquire = require('proxyquire')
  ;

describe('pull_request github webhook event handler', function() {

    it('triggers CI builds when PR is closed by merging', function(done) {
        var triggerCalled = false
          , handler = proxyquire('../../../webhooks/event-handlers/pull_request', {
                '../../utils/sha-validator': {
                    triggerBuildsOnAllOpenPullRequests: function(client, cb) {
                        assert.equal(client, 'mock repo client', 'Triggering wrong repo client to build CI.');
                        triggerCalled = true;
                        cb();
                    }
                }
            })
          , mockPayload = {
                action: 'closed'
              , pull_request: {
                    merged: true
                  , head: { sha: 'PR HEAD sha' }
                  , user: {
                        login: 'gh user'
                    }
                }
            }
          , mockRepoClient = 'mock repo client'
          , mockConfig = null
          , mockValidators = null
          ;

        handler(mockPayload, mockConfig, mockRepoClient, mockValidators, function() {
            assert(triggerCalled);
            done();
        });

    });

    it('ignores PRs closed without merging', function(done) {
        var prHandler = proxyquire('../../../webhooks/event-handlers/pull_request', {})
          , mockPayload = {
                action: 'closed'
              , pull_request: {
                    head: { sha: 'PR HEAD sha' }
                  , user: {
                        login: 'gh user'
                    }
                }
            }
          , mockRepoClient = 'mock repo client'
          , mockConfig = null
          , mockValidators = null
          ;

        prHandler(mockPayload, mockConfig, mockRepoClient, mockValidators, function() {
            done();
        });

    });

    it('ignores labeled action', function(done) {
        var prHandler = proxyquire('../../../webhooks/event-handlers/pull_request', {})
          , mockPayload = {
                action: 'labeled'
              , pull_request: {
                    head: { sha: 'PR HEAD sha' }
                  , user: {
                        login: 'gh user'
                    }
                }
            }
          , mockRepoClient = 'mock repo client'
          , mockConfig = null
          , mockValidators = null
          ;

        prHandler(mockPayload, mockConfig, mockRepoClient, mockValidators, function() {
            done();
        });
    });

    it('validates pull request HEAD SHA on any other action when last status was external', function(done) {

        var mockValidators = 'mock validators'
          , validationPerformed = false
          , prHandler = proxyquire('../../../webhooks/event-handlers/pull_request', {
                '../../utils/sha-validator': {
                    performCompleteValidation: function(sha, user, client, validators, postStatus, cb) {
                        assert.equal(sha, 'PR HEAD sha', 'Wrong PR SHA used for validation');
                        assert.equal(user, 'gh user', 'Wrong github user used for validation');
                        assert.equal(client, 'mock repo client', 'Wrong repo client used for validation');
                        assert.equal(validators, 'mock validators', 'Wrong validators used for validation');
                        assert.equal(true, postStatus, 'should force posting status to github');
                        validationPerformed = true;
                        cb();
                    }
                }
              , '../../utils/general': {
                    lastStatusWasExternal: function(client, sha, cb) {
                        assert.equal(client, 'mock repo client', 'Wrong repo client used for external check');
                        assert.equal(sha, 'PR HEAD sha', 'Wrong PR SHA used for external check');
                        cb(true);
                    }
                }
            })
          , mockPayload = {
                action: 'other'
              , pull_request: {
                    head: { sha: 'PR HEAD sha' }
                  , user: {
                        login: 'gh user'
                    }
                }
            }
          , mockRepoClient = 'mock repo client'
          , mockConfig = null
          ;

        prHandler(mockPayload, mockConfig, mockRepoClient, mockValidators, function() {
            assert(validationPerformed);
            done();
        });
    });

    it('ignores pull requests when last status was not external', function(done) {

        var mockValidators = 'mock validators'
          , prHandler = proxyquire('../../../webhooks/event-handlers/pull_request', {
                '../../utils/general': {
                    lastStatusWasExternal: function(client, sha, cb) {
                        cb(false);
                    }
                }
            })
          , mockPayload = {
                action: 'other'
              , pull_request: {
                    head: { sha: 'PR HEAD sha' }
                  , user: {
                        login: 'gh user'
                    }
                }
            }
          , mockRepoClient = 'mock repo client'
          , mockConfig = null
          ;

        prHandler(mockPayload, mockConfig, mockRepoClient, mockValidators, function() {
            done();
        });
    });

});
