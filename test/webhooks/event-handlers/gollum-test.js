var assert = require('assert')
  , proxyquire = require('proxyquire')
  ;

describe('gollum github webhook event handler', function() {

    it('sends emails when received', function(done) {
        var sendMailCalled = false
          , handler = proxyquire('../../../webhooks/event-handlers/gollum', {
                '../../utils/mailman': function(to, subject, body, callback) {
                    assert.equal(to, 'to-email');
                    assert.equal(subject, '[wiki-change] repo name updated by some-dude');
                    assert.equal(body, 'mock page title was mocked: mock link\n\n');
                    sendMailCalled = true;
                    callback();
                }
            })
          , mockPayload = {
                repository: {
                    full_name: 'repo name'
                }
              , sender: { login: 'some-dude' }
              , pages: [{
                    title: 'mock page title'
                  , action: 'mocked'
                  , html_url: 'mock link'
                }]
            }
          , mockRepoClient = null
          , mockConfig = {
                notifications: {
                    gollum: 'to-email'
                }
            }
          , mockValidators = null
          ;

        handler(mockPayload, mockConfig, mockRepoClient, mockValidators, function() {
            assert(sendMailCalled);
            done();
        });

    });

    it('sends does nothing with notification settings are nonexistent', function(done) {
        var handler = proxyquire('../../../webhooks/event-handlers/gollum', {})
          , mockPayload = {
                repository: {
                    full_name: 'repo name'
                }
              , sender: { login: 'some-dude' }
              , pages: [{
                    title: 'mock page title'
                  , action: 'mocked'
                  , html_url: 'mock link'
                }]
            }
          , mockRepoClient = null
          , mockConfig = {}
          , mockValidators = null
          ;

        handler(mockPayload, mockConfig, mockRepoClient, mockValidators, function() {
            done();
        });

    });


});
