var assert = require('assert')
  , proxyquire = require('proxyquire')
  ;

describe('push github webhook event handler', function() {

    it('executes push hook command on push to master', function(done) {
        var executedCommands = []
          , handler = proxyquire('../../utils/hook-handlers/push', {
                '../general': {
                    getHooksForMonitorForType: function(type, repoClient) {
                        assert.equal(repoClient, 'mock-repoClient');
                        if (type == 'push') return ['push-hook'];
                        if (type == 'tag') return ['tag-hook'];
                        assert.fail('unknown monitor type "' + type + '"');
                    }
                  , executeCommand: function(cmd) {
                        executedCommands.push(cmd);
                    }
                }
            })
          , mockPayload = {
                repository: { full_name: 'mock-repo' }
              , ref: 'refs/heads/master'
            }
          , mockRepoClient = 'mock-repoClient'
          , mockConfig = null
          , mockValidators = null
          ;

        handler(mockPayload, mockConfig, mockRepoClient, mockValidators, function() {
            assert(executedCommands.length == 1);
            assert.equal(executedCommands[0], 'push-hook');
            done();
        });
    });

    it('does nothing on pushes to non-master branches', function(done) {
        var executedCommands = []
          , handler = proxyquire('../../utils/hook-handlers/push', {
                '../general': {
                    getHooksForMonitorForType: function(type, repoClient) {
                        assert.equal(repoClient, 'mock-repoClient');
                        if (type == 'push') return ['push-hook'];
                        if (type == 'tag') return ['tag-hook'];
                        assert.fail('unknown monitor type "' + type + '"');
                    }
                  , executeCommand: function(cmd) {
                        executedCommands.push(cmd);
                    }
                }
            })
          , mockPayload = {
                repository: { full_name: 'mock-repo' }
              , ref: 'refs/heads/feature-branch'
            }
          , mockRepoClient = 'mock-repoClient'
          , mockConfig = null
          , mockValidators = null
          ;

        handler(mockPayload, mockConfig, mockRepoClient, mockValidators, function() {
            assert(executedCommands.length == 0);
            done();
        });

    });

    it('executes tag hook commands on push to tag', function(done) {
        var executedCommands = []
          , handler = proxyquire('../../utils/hook-handlers/push', {
                '../general': {
                    getHooksForMonitorForType: function(type, repoClient) {
                        assert.equal(repoClient, 'mock-repoClient');
                        if (type == 'push') return ['push-hook'];
                        if (type == 'tag') return ['tag-hook'];
                        assert.fail('unknown monitor type "' + type + '"');
                    }
                  , executeCommand: function(cmd) {
                        executedCommands.push(cmd);
                    }
                }
            })
          , mockPayload = {
                repository: { full_name: 'mock-repo' }
              , ref: 'refs/tags/sometag'
            }
          , mockRepoClient = 'mock-repoClient'
          , mockConfig = null
          , mockValidators = null
          ;

        handler(mockPayload, mockConfig, mockRepoClient, mockValidators, function() {
            assert(executedCommands.length == 1);
            assert.equal(executedCommands[0], 'tag-hook');
            done();
        });
    });

});
