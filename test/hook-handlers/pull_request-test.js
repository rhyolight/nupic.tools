var assert = require('assert')
  , proxyquire = require('proxyquire')
  ;

describe('pull request hook event handler', function() {

    it('triggers CI builds when PR is closed by merging', function(done) {
        var triggerCalled = false
          , prHandler = proxyquire('../../utils/hook-handlers/pull_request', {
                '../sha-validator': {
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
          ;

        prHandler(mockPayload, function() {
            assert(triggerCalled);
            done();
        }, mockConfig, mockRepoClient);

    });

    it('ignores PRs closed without merging', function(done) {
        var prHandler = proxyquire('../../utils/hook-handlers/pull_request', {})
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
          ;

        prHandler(mockPayload, function() {
            done();
        }, mockConfig, mockRepoClient);

    });

    it('ignores labeled action', function(done) {
        var prHandler = proxyquire('../../utils/hook-handlers/pull_request', {})
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
          ;

        prHandler(mockPayload, function() {
            done();
        }, mockConfig, mockRepoClient);
    });

    it('validates pull request HEAD SHA on any other action when last status was external', function(done) {

        var mockValidators = 'mock validators'
          , validationPerformed = false
          , prHandler = proxyquire('../../utils/hook-handlers/pull_request', {
                '../sha-validator': {
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
              , '../general': {
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

        prHandler(mockPayload, function() {
            assert(validationPerformed);
            done();
        }, mockConfig, mockRepoClient, mockValidators);
    });

    it('ignores pull requests when last status was not external', function(done) {

        var mockValidators = 'mock validators'
          , prHandler = proxyquire('../../utils/hook-handlers/pull_request', {
                '../general': {
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

        prHandler(mockPayload, function() {
            done();
        }, mockConfig, mockRepoClient, mockValidators);
    });

});
