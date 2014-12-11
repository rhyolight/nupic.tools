var assert = require('chai').assert,
    expect = require('chai').expect,
    shaValidator = require('./../utils/sha-validator.js'),
    repoClientStub = {
        'validators': {
            'excludes': []
        }
    },
    validatorsStub = [
        {
            'name': 'FirstValidator',
            'priority': 1,
            'validate': function(sha, githubUser, repoClient, callback) {
                assert.equal(sha, 'testSHA', 'in FirstValidator.validate :  wrong sha!');
                assert.equal(githubUser, 'carlfriess', 'in FirstValidator.validate :  wrong githubUser!');
                callback(null, {
                    'state': 'success',
                    'description': 'firstDescription',
                    'target_url': 'firstTargetUrl'
                });
             }
        },
        {
            'name': 'SecondValidator',
            'priority': 0,
            'validate': function(sha, githubUser, repoClient, callback) {
                assert.equal(sha, 'testSHA', 'in SecondValidator.validate :  wrong sha!');
                assert.equal(githubUser, 'carlfriess', 'in SecondValidator.validate :  wrong githubUser!');
                callback(null, {
                    'state': 'success',
                    'description': 'secondDescription',
                    'target_url': 'secondTargetUrl'
                });
             }
        }
    ];

describe('shaValidator test', function() {
    it('performs multiple validations', function(done) {
        shaValidator.performCompleteValidation('testSHA', 'carlfriess', repoClientStub, validatorsStub, false, function(err, sha, output, repoClient) {
            expect(err).to.not.exist;
            expect(sha).to.equal('testSHA');
            expect(output).to.be.instanceOf(Object);
            expect(output).to.have.keys('FirstValidator', 'SecondValidator');
            expect(output['FirstValidator']).to.have.keys(['state', 'description', 'target_url']);
            expect(output['SecondValidator']).to.have.keys(['state', 'description', 'target_url']);
            expect(output['FirstValidator'].state).to.equal('success');
            expect(output['SecondValidator'].state).to.equal('success');
            expect(output['FirstValidator'].description).to.equal('firstDescription');
            expect(output['SecondValidator'].description).to.equal('secondDescription');
            expect(output['FirstValidator'].target_url).to.equal('firstTargetUrl');
            expect(output['SecondValidator'].target_url).to.equal('secondTargetUrl');
            done();
        });
    });

    it('posts to github status API', function(done) {
        var mockSha = 'mockSha',
            mockContext = 'test-context',
            mockStatusDetails = {
                'state': 'success',
                'target_url': 'secondTargetUrl',
                'description': 'description'
            },
            statusPosted = null,
            mockClient = {
                github: {
                    statuses: {
                        create: function (statusObj) {
                            statusPosted = statusObj;
                        }
                    }
                }
            };

        shaValidator.postNewNupicStatus(mockContext, mockSha, mockStatusDetails, mockClient);

        assert(statusPosted, 'status should be posted');
        assert.equal(statusPosted.state, mockStatusDetails.state, 'posted wrong state!');
        assert.equal(statusPosted.target_url, mockStatusDetails.target_url, 'posted wrong target_url!');
        assert.equal(statusPosted.description, 'NuPIC Status: ' + mockStatusDetails.description, 'posted wrong state!');

        done();
    });
});