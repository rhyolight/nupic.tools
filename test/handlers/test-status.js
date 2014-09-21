var assert = require('assert'),
    expect = require('chai').expect,
    path = require('path'),
    fs = require('fs'),
    urlMap = require('../../handlers/status');

describe('status reporter url mapping', function() {
    it('has an entry for the /status URL', function() {
        assert(Object.keys(urlMap).indexOf('/status*') > -1,
            'handler does not have proper url mapping');
    });
});

describe('/status URL handler', function() {
    var initializer = urlMap['/status*'];

    it('is a function with title and description', function() {
        var handler = initializer();
        assert.equal(typeof handler, 'function', 'handler initializer does not return function');
        assert.equal('Status Reporter', handler.title, 'bad handler title');
        assert(typeof handler.description, 'string', 'bad handler description string');
    });

});


describe('status reporter', function() {
    it('creates proper status report html', function() {
        var expectedHtml = fs.readFileSync(path.join(__dirname, '../mockData/mock-status.html'), 'utf-8');
        // Remove all whitespace for comparison.
        expectedHtml = expectedHtml.replace(/\s+/g, '');
        function mockRateLimit(cb) {
            cb(null, {rate: {remaining: 5000}});
        }
        var mockRepoClients = {
                'clientA': {rateLimit:mockRateLimit},
                'clientB': {rateLimit:mockRateLimit}
            },
            handlerA = function() {},
            handlerB = function() {},
            mockHttpHandlers = [{
                    "/handlerA*": function() { return handlerA; }
                }, {
                    "/handlerB*": function() { return handlerB; }
            }],
            mockConfig = {},
            mockValidators = ['validatorA', 'validatorB'],
            endCalled = false;
        handlerA.title = 'handlerA';
        handlerA.description = 'handlerA-description';
        handlerA.url = '/handlerA';
        handlerB.title = 'handlerB';
        handlerB.description = 'handlerB-description';
        handlerB.url = '/handlerB';
        var requestHandler = urlMap['/status*'](
            mockRepoClients, mockHttpHandlers, mockConfig, mockValidators
        );
        var mockRequest = {
            url: '/bluah/bluah/status*'
        };
        var mockResponse = {
            setHeader: function() {},
            end: function(htmlOut) {
                endCalled = true;
                // Compare strings after stripping whitespace.
                expect(htmlOut.replace(/\s+/g, '')).to.equal(expectedHtml);
            }
        };
        requestHandler(mockRequest, mockResponse);
        assert(endCalled, 'response was not closed');
    });
});

