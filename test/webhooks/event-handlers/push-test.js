var assert = require('chai').assert
  , expect = require('chai').expect
  , proxyquire = require('proxyquire')
  ;

describe('push github webhook event handler', function() {

    it('does nothing on pushes to non-master branches', function(done) {
        var executedCommands = []
          , handler = proxyquire('../../../webhooks/event-handlers/push', {
                '../../utils/general': {
                    getHooksForMonitorForType: function(type, repoClient) {
                        assert.equal(repoClient, 'mock-repoClient');
                        if (type == 'push') return ['push-hook.sh'];
                        if (type == 'tag') return ['tag-hook.sh'];
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
            expect(executedCommands).to.have.length(0);
            done();
        });

    });

    describe('with importable node scripts', function() {

        it('requires and calls push hook module on push to master', function(done) {
            var eventResponseCalled = false
              , handler = proxyquire('../../../webhooks/event-handlers/push', {
                    '../../utils/general': {
                        getHooksForMonitorForType: function(type, repoClient) {
                            assert.equal(repoClient, 'mock-repoClient');
                            if (type == 'push') return ['./webhooks/event-responses/update-regression'];
                            if (type == 'tag') return ['tag-hook.sh'];
                            assert.fail('unknown monitor type "' + type + '"');
                        }
                    }
                  , '../event-responses/update-regression': function(payload, callback) {
                        expect(payload).to.equal(mockPayload);
                        eventResponseCalled = true;
                        callback();
                    }
                })
              , mockPayload = {
                    after: 'mock-sha'
                  , repository: { full_name: 'mock-repo' }
                  , ref: 'refs/heads/master'
                }
              , mockRepoClient = 'mock-repoClient'
              , mockConfig = null
              , mockValidators = null
              ;

            handler(mockPayload, mockConfig, mockRepoClient, mockValidators, function() {
                assert.ok(eventResponseCalled);
                done();
            });
        });

    });

});
