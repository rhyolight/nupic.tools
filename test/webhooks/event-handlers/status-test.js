var expect = require('chai').expect
  , assert = require('chai').assert
  , proxyquire = require('proxyquire')
  ;

describe('status github webhook event handler', function() {

    it('calls one build hook command on master build success status event', function(done) {
        var executedCommands = []
          , handler = proxyquire('../../../webhooks/event-handlers/status', {
                '../../utils/general': {
                    getHooksForMonitorForType: function(type, repoClient) {
                        expect(type).to.equal('build');
                        expect(repoClient).to.equal(mockRepoClient);
                        return ['build-hook-cmd.sh'];
                    }
                  , executeCommand: function(cmd) {
                        executedCommands.push(cmd);
                    }
                }
            })
          , mockPayload = require('../../github_payloads/status_master_build_success')
          , mockRepoClient = 'mock-repoClient'
          , mockConfig = null
          , mockValidators = null
          ;

        handler(mockPayload, mockConfig, mockRepoClient, mockValidators, function() {
            expect(executedCommands).to.have.length(1);
            expect(executedCommands[0]).to.equal('build-hook-cmd.sh');
            done();
        });
    });

    it('does NOT call build hook commands on non-master build success status event', function(done) {
        var executedCommands = []
          , handler = proxyquire('../../../webhooks/event-handlers/status', {
                '../../utils/general': {
                    getHooksForMonitorForType: function(type, repoClient) {
                        expect(type).to.equal('build');
                        expect(repoClient).to.equal(mockRepoClient);
                        return ['hook-cmd'];
                    }
                  , executeCommand: function(cmd) {
                        executedCommands.push(cmd);
                    }
                }
                , '../../utils/sha-validator': {
                    performCompleteValidation: function(sha, committer, repoClient, validators, postStatus, callback) {
                        callback();
                    }
                }
            })
          , mockPayload = require('../../github_payloads/status_non-master_build_success')
          , mockRepoClient = {
                getCommit: function(sha, callback) {
                    callback(null, { committer: { login: 'committer-login'} });
                }
            }
          , mockConfig = null
          , mockValidators = [{
                name: 'something'
            }]
          ;

        handler(mockPayload, mockConfig, mockRepoClient, mockValidators, function() {
            expect(executedCommands).to.have.length(0);
            done();
        });

    });

    it('requires and calls push hook module on push to master', function(done) {
        var eventResponseCalled = false
            , handler = proxyquire('../../../webhooks/event-handlers/status', {
                '../../utils/general': {
                    getHooksForMonitorForType: function(type, repoClient) {
                        expect(type).to.equal('build');
                        expect(repoClient).to.equal(mockRepoClient);
                        return ['./webhooks/event-responses/update-regression'];
                    }
                }
                , '../event-responses/update-regression': function(payload, callback) {
                    expect(payload).to.deep.equal(mockPayload);
                    eventResponseCalled = true;
                    callback();
                }
            })
            , mockPayload = require('../../github_payloads/status_master_build_success')
            , mockRepoClient = 'mock-repoClient'
            , mockConfig = null
            , mockValidators = null
            ;

        handler(mockPayload, mockConfig, mockRepoClient, mockValidators, function() {
            assert.ok(eventResponseCalled);
            done();
        });
    });


    it('validates commit SHA on non-master build success status event', function(done) {
        var validationPerformed = false
            , handler = proxyquire('../../../webhooks/event-handlers/status', {
                '../../utils/general': {
                    getHooksForMonitorForType: function(type, repoClient) {
                        expect(type).to.equal('build');
                        expect(repoClient).to.equal(mockRepoClient);
                        return ['hook-cmd'];
                    }
                    , executeCommand: function(cmd) {
                        executedCommands.push(cmd);
                    }
                }
                , '../../utils/sha-validator': {
                    performCompleteValidation: function(sha, committer, repoClient, validators, postStatus, callback) {
                        expect(sha).to.equal('d82fe0e69a7b4a8417fd84e093a0b6c02e6bfe20');
                        expect(committer).to.equal('rhyolight');
                        expect(repoClient).to.equal(mockRepoClient);
                        expect(validators).to.equal(mockValidators);
                        assert.ok(postStatus);
                        validationPerformed = true;
                        callback();
                    }
                }
            })
            , mockPayload = require('../../github_payloads/status_non-master_build_success')
            , mockRepoClient = 'mock repo client'
            , mockConfig = null
            , mockValidators = [{
                name: 'something'
            }]
            ;

        handler(mockPayload, mockConfig, mockRepoClient, mockValidators, function() {
            assert.ok(validationPerformed);
            done();
        });

    });

    it('ignores build success status event if internal context', function(done) {
        var handler = proxyquire('../../../webhooks/event-handlers/status', {})
            , mockPayload = require('../../github_payloads/status_non-master_build_success')
            , mockRepoClient = 'mock repo client'
            , mockConfig = null
            , mockValidators = [{
                name: 'Internal Validator'
            }]
            ;

        mockPayload.context = 'Internal Validator';

        handler(mockPayload, mockConfig, mockRepoClient, mockValidators, function() {
            done();
        });

    });


});
