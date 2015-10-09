var proxyquire = require('proxyquire')
  , expect = require('chai').expect
  , assert = require('chai').assert
  ;

describe('regression test SHA updater event response', function() {

    it('calls update-nupic-module with correct parameters', function(done) {
        var called = false
          , updateRegression = proxyquire('../../../webhooks/event-responses/update-regression', {
            './update-nupic-module': function(org, repo, sha, message, callback) {
                expect(org).to.equal('numenta');
                expect(repo).to.equal('nupic.regression');
                expect(message).to.equal('Automated update of nupic master sha to mock-sha.');
                expect(sha).to.equal('mock-sha');
                called = true;
                callback();
            }
        });

        updateRegression({sha: 'mock-sha'}, function(error) {
            assert.notOk(error);
            assert.ok(called);
            done();
        });
    });

});