var path = require('path'),
    fs = require('fs'),
    assert = require('chai').assert,
    sinon = require('sinon'),
    logger = require('../../utils/logger').logger,
    proxyquire = require('proxyquire');

function clearRequireCache() {
    delete require.cache[require.resolve('../../utils/template')]
}

describe('template util', function() {
    describe('when required', function() {
        it('reads all files in template directory', function() {
            var mockFs = {
                    readdirSync: sinon.stub(),
                    readFileSync: sinon.stub()
                },
                tmpl;

            mockFs.readdirSync.withArgs(
                path.join(__dirname, '../../templates')
            ).returns(['a.html', 'b.html']);
            mockFs.readFileSync.withArgs(
                path.join(__dirname, '../../templates/a.html'), 'utf-8'
            ).returns('a contents');
            mockFs.readFileSync.withArgs(
                path.join(__dirname, '../../templates/b.html'), 'utf-8'
            ).returns('b contents');

            clearRequireCache();

            proxyquire('../../utils/template', {
                fs: mockFs
            });

        });
    });
    describe('when called', function() {
        it('uses cached file strings instead of re-reading files', function() {

        });
    });
});