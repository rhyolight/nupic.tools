var assert = require('assert'),
    expect = require('chai').expect,
    path = require('path'),
    fs = require('fs'),
    urlMap = require('../../handlers/committers');

describe('committer reporter url mapping', function() {
    it('has an entry for the /committers URL', function() {
        assert(Object.keys(urlMap).indexOf('/committers*') > -1,
            'handler does not have proper url mapping');
    });
});

describe('/committer URL handler', function() {
    var initializer = urlMap['/committers*'];

    it('is a function with title and description', function() {
        var mockConfig = {
            monitors: {}
        };
        mockConfig.monitors['numenta/nupic'] = {
            username: 'mockusername',
            password: 'mockpassword'
        };
        var handler = initializer(null, null, mockConfig);
        assert.equal(typeof handler, 'function', 'handler initializer does not return function');
        assert.equal('Committer Reporter', handler.title, 'bad handler title');
        assert(typeof handler.description, 'string', 'bad handler description string');
    });

});
