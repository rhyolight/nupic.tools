var expect = require('chai').expect
  , assert = require('chai').assert
  , proxyquire = require('proxyquire')
  ;


describe('when creating a nupic.core update PR', function() {

    it('updates the SHA in new branch and creates a PR', function(done) {
        var mockGitData = {
                getBranch: function(name, callback) {
                    expect(name).to.equal('master');
                    callback(null, mockMasterBranch);
                }
            }
          , updater = proxyquire('../../../webhooks/event-responses/create-core-update-pr', {
                'github-data': function(user, token, org, repo) {
                    expect(user).to.equal('mock-user');
                    expect(token).to.equal('mock-token');
                    expect(org).to.equal('numenta');
                    expect(repo).to.equal('nupic');
                    return mockGitData;
                }
            })
          , mockUpdateBranch = {
                getFile: function(name, callback) {
                    expect(name).to.equal('.nupic_modules');
                    callback(null, mockGitFile);
                }
              , push: function(commit, callback) {
                    expect(commit).to.equal(mockCommit);
                    callback();
                }
              , createPullRequest: function(base, title, body, callback) {
                    expect(base).to.equal(mockMasterBranch);
                    expect(title).to.equal('Updates nupic.core to latest build SHA.');
                    expect(body).to.equal('See https://github.com/numenta/nupic.core/compare/2a06015a9579e24373380749f6cd9f8de10f7550...target-sha for details.');
                    callback(null, 'mock-pr');
                }
            }
          , mockMasterBranch = {
                createBranch: function(name, callback) {
                    expect(name).to.equal('core-update-target-sha');
                    callback(null, mockUpdateBranch);
                }
            }
          , mockCommit = 'mock-commit'
          , mockGitFile = {
                blob: {
                    getContents: function() {
                        return "# Default nupic.core dependencies (override in optional .nupic_config)\n"
                            + "NUPIC_CORE_REMOTE = 'git://github.com/numenta/nupic.core.git'\n"
                            + "NUPIC_CORE_COMMITISH = '2a06015a9579e24373380749f6cd9f8de10f7550'";
                    }
                  , setContents: function(content) {
                        var expected = "# Default nupic.core dependencies (override in optional .nupic_config)\n"
                            + "NUPIC_CORE_REMOTE = 'git://github.com/numenta/nupic.core.git'\n"
                            + "NUPIC_CORE_COMMITISH = 'target-sha'";
                        expect(content).to.equal(expected);
                    }
                }
              , commit: function(message, callback) {
                    expect(message).to.equal('Updates nupic.core to target-sha.');
                    callback(null, mockCommit);
                }
            }
          ;

        process.env.GH_USERNAME = 'mock-user';
        process.env.GH_PASSWORD = 'mock-token';

        updater({sha: 'target-sha'},function(err, pr) {
            assert.notOk(err);
            expect(pr).to.equal('mock-pr');
            done();
        });

    });


});