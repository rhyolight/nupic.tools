var assert = require('chai').assert,
    expect = require('chai').expect,
    mockContentWithChangelogMd =[{"name": "CHANGELOG.md"}],
    mockContentWithChangelogTxt =[{"name": "CHANGELOG.txt"}],
    mockContentWithChangelogNoExt =[{"name": "CHANGELOG"}],
    mockContentWithoutChangelog =[{"name": "NO-change-log"}],
    mockCompareWithChangelogMd = {
        files: [{
            filename: 'otherfile.txt',
            status: 'modified'
        }, {
            filename: 'CHANGELOG.md',
            status: 'modified'
        }]
    },
    mockCompareWithoutChangelog = {
        files: [{
            filename: 'otherfile.txt',
            status: 'modified'
        }]
    },
    mockCompareWithChangelogTxt = {
        files: [{
            filename: 'otherfile.txt',
            status: 'modified'
        }, {
            filename: 'CHANGELOG.txt',
            status: 'modified'
        }]
    },
    mockCompareWithChangelogNoExt = {
        files: [{
            filename: 'otherfile.txt',
            status: 'modified'
        }, {
            filename: 'CHANGELOG',
            status: 'modified'
        }]
    },
    changelogValidator = require('../../validators/changelog');

describe('changelog validator', function() {
    it('has a proper "name" property', function() {
        assert.equal(changelogValidator.name, 'CHANGELOG Validator', 'Wrong validator name');
    });

    describe('when repo has a CHANGELOG.md', function() {
        var mockSha = 'mock-sha',
            mockRepoClient = {
                getContent: function(path, callback) {
                    expect(path).to.be.equal('');
                    callback(null, mockContentWithChangelogMd);
                }
            };
        it('passes when comparison contains modified CHANGELOG.md', function() {
            mockRepoClient.compareCommits = function(base, head, callback) {
                expect(base).to.be.equal('HEAD');
                expect(head).to.be.equal(mockSha);
                callback(null, mockCompareWithChangelogMd);
            };
            changelogValidator.validate(mockSha, null, mockRepoClient, function(err, validationResponse) {
                expect(err).to.not.exist;
                expect(validationResponse).to.have.keys(['state', 'description', 'target_url']);
                expect(validationResponse.state).to.equal('success');
                expect(validationResponse.description).to.equal('"CHANGELOG.md" was updated');
                expect(validationResponse.target_url).to.equal('https://github.com/numenta/nupic/wiki/CHANGELOG-Guidelines');
            });
        });

        it('fails when comparison contains no modified CHANGELOG of any kind', function() {
            mockRepoClient.compareCommits = function(base, head, callback) {
                expect(base).to.be.equal('HEAD');
                expect(head).to.be.equal(mockSha);
                callback(null, mockCompareWithoutChangelog);
            };
            changelogValidator.validate(mockSha, null, mockRepoClient, function(err, validationResponse) {
                expect(err).to.not.exist;
                expect(validationResponse).to.have.keys(['state', 'description', 'target_url']);
                expect(validationResponse.state).to.equal('pending');
                expect(validationResponse.description).to.equal('Update CHANGELOG.md if necessary');
                expect(validationResponse.target_url).to.equal('https://github.com/numenta/nupic/wiki/CHANGELOG-Guidelines');
            });
        });

    });

    describe('when repo has a CHANGELOG.txt', function() {
        var mockSha = 'mock-sha',
            mockRepoClient = {
                getContent: function(path, callback) {
                    expect(path).to.be.equal('');
                    callback(null, mockContentWithChangelogTxt);
                }
            };
        it('passes when comparison contains modified CHANGELOG.txt', function() {
            mockRepoClient.compareCommits = function(base, head, callback) {
                expect(base).to.be.equal('HEAD');
                expect(head).to.be.equal(mockSha);
                callback(null, mockCompareWithChangelogTxt);
            };
            changelogValidator.validate(mockSha, null, mockRepoClient, function(err, validationResponse) {
                expect(err).to.not.exist;
                expect(validationResponse).to.have.keys(['state', 'description', 'target_url']);
                expect(validationResponse.state).to.equal('success');
                expect(validationResponse.description).to.equal('"CHANGELOG.txt" was updated');
                expect(validationResponse.target_url).to.equal('https://github.com/numenta/nupic/wiki/CHANGELOG-Guidelines');
            });
        });

        it('fails when comparison contains no modified CHANGELOG of any kind', function() {
            mockRepoClient.compareCommits = function(base, head, callback) {
                expect(base).to.be.equal('HEAD');
                expect(head).to.be.equal(mockSha);
                callback(null, mockCompareWithoutChangelog);
            };
            changelogValidator.validate(mockSha, null, mockRepoClient, function(err, validationResponse) {
                expect(err).to.not.exist;
                expect(validationResponse).to.have.keys(['state', 'description', 'target_url']);
                expect(validationResponse.state).to.equal('pending');
                expect(validationResponse.description).to.equal('Update CHANGELOG.txt if necessary');
                expect(validationResponse.target_url).to.equal('https://github.com/numenta/nupic/wiki/CHANGELOG-Guidelines');
            });
        });

    });

    describe('when repo has a CHANGELOG', function() {
        var mockSha = 'mock-sha',
            mockRepoClient = {
                getContent: function(path, callback) {
                    expect(path).to.be.equal('');
                    callback(null, mockContentWithChangelogNoExt);
                }
            };
        it('passes when comparison contains modified CHANGELOG', function() {
            mockRepoClient.compareCommits = function(base, head, callback) {
                expect(base).to.be.equal('HEAD');
                expect(head).to.be.equal(mockSha);
                callback(null, mockCompareWithChangelogNoExt);
            };
            changelogValidator.validate(mockSha, null, mockRepoClient, function(err, validationResponse) {
                expect(err).to.not.exist;
                expect(validationResponse).to.have.keys(['state', 'description', 'target_url']);
                expect(validationResponse.state).to.equal('success');
                expect(validationResponse.description).to.equal('"CHANGELOG" was updated');
                expect(validationResponse.target_url).to.equal('https://github.com/numenta/nupic/wiki/CHANGELOG-Guidelines');
            });
        });

        it('fails when comparison contains no modified CHANGELOG of any kind', function() {
            mockRepoClient.compareCommits = function(base, head, callback) {
                expect(base).to.be.equal('HEAD');
                expect(head).to.be.equal(mockSha);
                callback(null, mockCompareWithoutChangelog);
            };
            changelogValidator.validate(mockSha, null, mockRepoClient, function(err, validationResponse) {
                expect(err).to.not.exist;
                expect(validationResponse).to.have.keys(['state', 'description', 'target_url']);
                expect(validationResponse.state).to.equal('pending');
                expect(validationResponse.description).to.equal('Update CHANGELOG if necessary');
                expect(validationResponse.target_url).to.equal('https://github.com/numenta/nupic/wiki/CHANGELOG-Guidelines');
            });
        });

    });



    describe('when repository has no CHANGELOG', function() {
        var mockSha = 'mock-sha',
            mockRepoClient = {
                getContent: function(path, callback) {
                    expect(path).to.be.equal('');
                    callback(null, mockContentWithoutChangelog);
                }
            };
        it('always passes', function() {
            mockRepoClient.compareCommits = function(base, head, callback) {
                expect(base).to.be.equal('HEAD');
                expect(head).to.be.equal(mockSha);
                callback(null, mockCompareWithoutChangelog);
            };
            changelogValidator.validate(mockSha, null, mockRepoClient, function(err, validationResponse) {
                expect(err).to.not.exist;
                expect(validationResponse).to.have.keys(['state', 'description', 'target_url']);
                expect(validationResponse.state).to.equal('success');
                expect(validationResponse.description).to.equal('No CHANGELOG to update');
                expect(validationResponse.target_url).to.equal('https://github.com/numenta/nupic/wiki/CHANGELOG-Guidelines');
            });
        });

    });

});