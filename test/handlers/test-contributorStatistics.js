var assert = require('assert'),
    RepositoryClient = require('../../utils/repo-client'),
    proxyquire = require('proxyquire'),
    sinon = require('sinon'),
    jsonUtils = require('../../utils/json'),
    jsonMock = {},
    urlMap = proxyquire('../../handlers/contributor-statistics', {
        '../utils/json': jsonMock
    });

function resetJsonMock() {
    jsonMock.render = undefined;
    jsonMock.renderErrors = undefined;
}

describe('contributor handler url mapping', function() {
    it('has an entry for the /contribStats* URL', function() {
        assert(Object.keys(urlMap).indexOf('/contribStats*') > -1,
            'handler does not have proper url mapping');
    });
});

describe('/contribStats request handler initializer', function() {
    it('throws appropriate error when initialized without repo clients', function() {
        var initializer = urlMap['/contribStats*'];
        try {
            initializer();
            assert.fail('initializer should have thrown an error');
        } catch (err) {
            assert.equal(err.message, 'Cannot initialize handler without RepositoryClient objects');
        }
    });
});

describe('/contribStats URL handler', function() {
    var initializer = urlMap['/contribStats*'];
    var mockRepos = {
        'repoOne': sinon.createStubInstance(RepositoryClient),
        'repoTwo': sinon.createStubInstance(RepositoryClient)
    };

    it('is a function with title and description', function() {
        var handler = initializer(mockRepos);
        assert.equal(typeof handler, 'function', 'handler initializer does not return function');
        assert.equal('Contribution Reporter', handler.title, 'bad handler title');
        assert(typeof handler.description, 'string', 'bad handler description string');
    });

    describe('gets contributors', function() {
        var handler = initializer(mockRepos);
        it('from a single repo when "repo" param specified', function()  {
            var requestStub = {
                url: '/?repo=repoOne'
            };
            var getContribCount = 0,
                getCommitsCount = 0;
            var repoApi = {
                getContributors: function(cb) {
                    getContribCount++;
                    cb(null, [{
                        login: 'dummy',
                        contributions: 666
                    }]);
                },
                getCommits: function(cb) {
                    getCommitsCount++;
                    cb(null, [{
                        committer: {
                            login: 'dummy'
                        }
                    }]);
                }
            };
            
            jsonMock.render = function(data) {
                assert.equal(data.repoOne.length, 1, 'wrong length of output data array');
                assert.equal(data.repoOne[0].login, 'dummy', 'wrong login name for committer');
                assert.equal(data.repoOne[0].contributions, 666, 'wrong contribution number');
                assert.equal(data.repoOne[0].commits, 1, 'wrong commit count');
            };
            jsonMock.renderErrors = function(errs) {
                assert.fail(errs.join(', '));
            };

            mockRepos.repoOne = repoApi;

            handler(requestStub);

            assert.equal(getContribCount, 1, 'getContributors called wrong number of times');
            assert.equal(getCommitsCount, 1, 'getCommits called wrong number of times');

            resetJsonMock();
        });
    });
});
