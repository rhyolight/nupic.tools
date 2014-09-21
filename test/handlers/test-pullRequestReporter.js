var assert = require('assert'),
    RepositoryClient = require('../../utils/repo-client'),
    proxyquire = require('proxyquire'),
    sinon = require('sinon'),
    jsonUtils = require('../../utils/json'),
    jsonMock = {},
    urlMap = proxyquire('../../handlers/pull-request-reporter', {
        '../utils/json': jsonMock
    });

describe('pull request report handler url mapping', function() {
    it('has an entry for the /prStatus* URL', function() {
        assert(Object.keys(urlMap).indexOf('/prStatus*') > -1,
            'handler does not have proper url mapping');
    });
});

describe('/prStatus* URL handler', function() {
    var initializer = urlMap['/prStatus*'];
    var mockRepos = {
        'repoOne': sinon.createStubInstance(RepositoryClient),
        'repoTwo': sinon.createStubInstance(RepositoryClient)
    };

    it('is a function with title and description', function() {
        var handler = initializer(mockRepos);
        var title = 'Pull Request Reporter';
        var description = 
            'Returns a report of all open pull requests for each monitored repository. ' +
            'Supports JSON and JSONP. When no "repo" query parameter is supplied ' +
            '(which should be "organization/repository"), returns all open pull ' +
            'requests for every repository the server is monitoring, keyed by ' + 
            '"organization/repository". When a "repo" is specified, simply returns an ' +
            'array of pull requests with no key.';

        assert.equal(typeof handler, 'function', 'handler initializer does not return function');
        assert.equal(title, handler.title, 'bad handler title');
        assert(typeof description, 'string', 'bad handler description string');
    });

    describe('gets pull requests', function() {
        var handler = initializer(mockRepos),
            prFetchCount = 0;
        it('for all prs when no "repo" param exists', function() {
            var requestStub = {
                url: '/'
            };
            var repoApi = {
                getAllOpenPullRequests: function(cb) {
                    prFetchCount++;
                    cb(null, [{
                        head: {sha: 'dummy-' + prFetchCount}
                    }])
                },
                getAllStatusesFor: function(sha, cb) {
                    cb(null, [{created_at: new Date().toString()}]);
                }
            };

            mockRepos.repoOne = repoApi;
            mockRepos.repoTwo = repoApi;

            handler(requestStub);

            assert.equal(prFetchCount, 2, 'wrong number of repos queried for default params');

        });
    });

});
