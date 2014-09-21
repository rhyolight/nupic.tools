var assert = require('assert'),
    path = require('path'),
    proxyquire = require('proxyquire'),
    utilStub,
    configReaderStub;

utilStub = {
    sterilizeConfig: function(cfg) {
        return cfg;
    },
    constructRepoClients: function() {}
};
configReaderStub = {
    read: function(path, callback) {
        callback(null, {host: 'host', port: 666});
    }
};

describe('main program', function() {
    describe('when initially loaded', function() {
        it('sends the right config file to configReader', function() {
            proxyquire('./../program', {
                './utils/general': utilStub,
                './utils/config-reader': {read: function(configPath) {
                    assert.equal(configPath, path.join(__dirname, '..', 'conf/config.yaml'), 'Wrong default configuration path.');
                    return {host: 'host', port: 666};
                }}
            });
        });
        it('constructs a proper github webhook url', function() {
            utilStub.constructRepoClients = function(prWebhook, cfg) {
                assert.equal(prWebhook, 'http://host:666/github-hook', 'Bad Github web hook url created');
            };
            proxyquire('./../program', {
                './utils/general': utilStub,
                './utils/config-reader': configReaderStub
            });
        });
    });
});
