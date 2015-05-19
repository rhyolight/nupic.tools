var proxyquire = require('proxyquire')
  , expect = require('chai').expect
  ;

describe('github hook handlers module', function() {

    it('exposes all 5 webhook handlers', function() {
        var handlers = proxyquire('../utils/github-hook-handlers', {
            './hook-handlers/gollum': 'gollum-handler'
          , './hook-handlers/issue_comment': 'issue_comment-handler'
          , './hook-handlers/pull_request': 'pull_request-handler'
          , './hook-handlers/push': 'push-handler'
          , './hook-handlers/status': 'status-handler'
        });

        expect(handlers.gollum).to.equal('gollum-handler');
        expect(handlers.issue_comment).to.equal('issue_comment-handler');
        expect(handlers.pull_request).to.equal('pull_request-handler');
        expect(handlers.push).to.equal('push-handler');
        expect(handlers.status).to.equal('status-handler');
    });

});