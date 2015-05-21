var expect = require('chai').expect
  , assert = require('chai').assert
  , proxyquire = require('proxyquire')
  ;


describe('when updating NuPIC SHA in nupic_sha.txt', function() {

    it('updates the SHA in text file with SHA from payload', function(done) {
        var blobContentSet = false
          , mockGitData = {
                getBranch: function(name, callback) {
                    expect(name).to.equal('master');
                    callback(null, mockMaster);
                }
            }
          , updater = proxyquire('../../../webhooks/event-responses/update-nupic-module', {
                'github-data': function(user, token, org, repo) {
                    expect(user).to.equal('mock-user');
                    expect(token).to.equal('mock-token');
                    expect(org).to.equal('mock-org');
                    expect(repo).to.equal('mock-repo');
                    return mockGitData;
                }
            })
          , mockMaster = {
                getFile: function(name, callback) {
                    expect(name).to.equal('nupic_sha.txt');
                    callback(null, mockGitFile);
                }
              , push: function(commit, callback) {
                    expect(commit).to.equal(mockCommit);
                    callback();
                }
            }
          , mockCommit = 'mock-commit'
          , mockGitFile = {
                blob: {
                    setContents: function(content) {
                        expect(content).to.equal('target-sha');
                        blobContentSet = true;
                    }
                }
              , commit: function(message, callback) {
                    expect(message).to.equal('commit-message');
                    callback(null, mockCommit);
                }
            }
          ;

        process.env.GH_USERNAME = 'mock-user';
        process.env.GH_PASSWORD = 'mock-token';
        updater('mock-org', 'mock-repo', 'target-sha', 'commit-message', function(err) {
            assert.notOk(err);
            assert.ok(blobContentSet);
            done();
        });

    });


});