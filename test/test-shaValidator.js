var assert = require('assert'),
    shaValidator = require('./../utils/sha-validator.js'),
    repoClientStub = {
        'getAllStatusesFor': function(sha, callback) { callback(null, 'fakeStatusHistory'); },
        'validators': {
            'excludes': []
        }
    },
    validatorsStub = [
        {
            'name': 'FirstValidator',
            'priority': 1,
            'validate': function(sha, githubUser, statusHistory, repoClient, callback) {
                assert.equal(sha, 'testSHA', 'in FirstValidator.validate :  wrong sha!');
                assert.equal(githubUser, 'carlfriess', 'in FirstValidator.validate :  wrong githubUser!');
                assert.equal(statusHistory, 'fakeStatusHistory', 'in FirstValidator.validate :  wrong statusHistory!');
                callback(null, {
                    'state': 'success',
                    'target_url': 'correctTargetURL'
                });
             }
        },
        {
            'name': 'SecondValidator',
            'priority': 0,
            'validate': function(sha, githubUser, statusHistory, repoClient, callback) {
                assert.equal(sha, 'testSHA', 'in SecondValidator.validate :  wrong sha!');
                assert.equal(githubUser, 'carlfriess', 'in SecondValidator.validate :  wrong githubUser!');
                assert.equal(statusHistory, 'fakeStatusHistory', 'in SecondValidator.validate :  wrong statusHistory!');
                callback(null, {
                    'state': 'success',
                    'target_url': 'otherTargetURL'
                });
             }
        }
    ];

describe('shaValidator test', function() {
    it('Testing with two validators.', function(done) {
        shaValidator.performCompleteValidation('testSHA', 'carlfriess', repoClientStub, validatorsStub, false, function(err, sha, output, repoClient) {
            assert(!err, 'Should not be an error');
            assert.equal(sha, 'testSHA', 'in shaValidator.performCompleteValidation :  wrong sha in output!');
            assert.equal(output.state, 'success', 'in shaValidator.performCompleteValidation :  wrong state in output :  Not success!');
            assert.equal(output.description, 'All validations passed (FirstValidator, SecondValidator)', 'in shaValidator.performCompleteValidation :  wrong description in output!');
            done();
        });
    });

    it('Testing postNewNupicStatus', function(done) {
        var mockSha = 'mockSha',
        mockStatusDetails = {
            'state': 'success',
            'target_url': 'otherTargetURL',
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

        shaValidator.postNewNupicStatus(mockSha, mockStatusDetails, mockClient);

        assert(statusPosted, 'status should be posted');
        assert.equal(statusPosted.state, mockStatusDetails.state, 'posted wrong state!');
        assert.equal(statusPosted.target_url, mockStatusDetails.target_url, 'posted wrong target_url!');
        assert.equal(statusPosted.description, 'NuPIC Status: ' + mockStatusDetails.description, 'posted wrong state!');

        done();
    });
});