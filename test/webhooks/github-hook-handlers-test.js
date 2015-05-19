var proxyquire = require('proxyquire')
  , expect = require('chai').expect
  ;

describe('github hook handlers module', function() {

    it('exposes all 5 webhook handlers', function() {
        var handlers = proxyquire('../../webhooks/github-hook-handlers', {
            './event-handlers/gollum': 'gollum-handler'
          , './event-handlers/issue_comment': 'issue_comment-handler'
          , './event-handlers/pull_request': 'pull_request-handler'
          , './event-handlers/push': 'push-handler'
          , './event-handlers/status': 'status-handler'
        });

        expect(handlers.gollum).to.equal('gollum-handler');
        expect(handlers.issue_comment).to.equal('issue_comment-handler');
        expect(handlers.pull_request).to.equal('pull_request-handler');
        expect(handlers.push).to.equal('push-handler');
        expect(handlers.status).to.equal('status-handler');
    });

});