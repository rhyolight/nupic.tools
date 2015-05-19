var expect = require('chai').expect
  , assert = require('chai').assert
  , proxyquire = require('proxyquire')
  , mockIssueCommentPayload = require('../github_payloads/events/issue_comment').payload
  , mockPrCommentPayload = require('../github_payloads/events/pull_request_comment').payload
  , mockPrCommits = require('../github_payloads/pr_commits')
  ;

describe('issue_comment github webhook event handler', function() {

    it('validates PR when someone comments on it', function(done) {
        var validationPerformed = false
          , handler = proxyquire('../../utils/hook-handlers/issue_comment', {
                '../sha-validator': {
                    performCompleteValidation: function(sha, login, repoClient,
                                                        validators, postStatus,
                                                        callback) {
                        expect(sha).to.equal('6dcb09b5b57875f334f61aebed695e2e4193db5e');
                        expect(login).to.equal('octocat-committer');
                        expect(repoClient).to.equal(mockRepoClient);
                        expect(validators).to.equal(mockValidators);
                        assert.ok(postStatus);
                        validationPerformed = true;
                        callback();
                    }
                }
            })
          , mockRepoClient = {
                getLastCommitOnPullRequest: function(prNumber, callback) {
                    expect(prNumber).to.equal(2);
                    callback(null, mockPrCommits[0]);
                }
            }
          , mockConfig = null
          , mockValidators = 'mock-validators'
          ;


        handler(mockPrCommentPayload, mockConfig, mockRepoClient, mockValidators, function() {
            assert.ok(validationPerformed);
            done();
        });
    });

    it('ignores comments on issues', function(done) {
        var handler = proxyquire('../../utils/hook-handlers/issue_comment', {})
          , mockConfig = null
          , mockRepoClient = null
          , mockValidators = 'mock-validators'
          ;


        handler(mockIssueCommentPayload, mockConfig, mockRepoClient, mockValidators, function() {
            done();
        });
    });

});
