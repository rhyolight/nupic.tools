var fs = require('fs'),
    _ = require('underscore'),
    assert = require('chai').assert,
    expect = require('chai').expect,
    should = require('chai').should(),
    proxyquire = require('proxyquire'),
    MOCK_CONFIG = 'mock-config.yaml',
    MOCK_CONFIG_REPOS_MISSING = 'mock-config-no-global-repos.yaml',
    MOCK_USER_CONFIG = 'mock-user-config.yaml',
    MOCK_GLOBAL_REPOS = 'mock-global-repos.yaml',
    mockConfig,
    mockConfigNoRepos,
    mockUserConfig,
    mockGlobalRepos,
    GH_USERNAME = process.env.GH_USERNAME,
    GH_PASSWORD = process.env.GH_PASSWORD,
    USER = process.env.USER;

// Prep the mock configs.
mockConfig = fs.readFileSync('test/mockData/' + MOCK_CONFIG, 'utf-8');
mockConfigNoRepos = fs.readFileSync('test/mockData/' + MOCK_CONFIG_REPOS_MISSING, 'utf-8');
mockUserConfig = fs.readFileSync('test/mockData/' + MOCK_USER_CONFIG, 'utf-8');
mockGlobalRepos = fs.readFileSync('test/mockData/' + MOCK_GLOBAL_REPOS, 'utf-8');

function clearConfigReaderRequireCache() {
    delete require.cache[require.resolve('../../utils/config-reader')]
}


describe('configuration reader', function() {

    describe('when required', function() {
        it('throws error if GH_USERNAME is unset', function() {
            clearConfigReaderRequireCache();
            delete process.env.GH_USERNAME;
            expect(function() {
                require('../../utils/config-reader');
            }).to.throw('Both GH_USERNAME and GH_PASSWORD environment variables are required for nupic.tools to run.\n' +
                    'These are necessary for making Github API calls.');
            process.env.GH_USERNAME = GH_USERNAME;
            clearConfigReaderRequireCache();
        });
        it('throws error if GH_PASSWORD is unset', function() {
            clearConfigReaderRequireCache();
            delete process.env.GH_PASSWORD;
            expect(function() {
                require('../../utils/config-reader');
            }).to.throw('Both GH_USERNAME and GH_PASSWORD environment variables are required for nupic.tools to run.\n' +
                    'These are necessary for making Github API calls.');
            process.env.GH_PASSWORD = GH_PASSWORD;
            clearConfigReaderRequireCache();
        });
    });

    describe('when reading config file', function() {
        clearConfigReaderRequireCache();
        process.env.GH_USERNAME = 'mockghusername';
        process.env.GH_PASSWORD = 'mockghpassword';
        var testUserString = '-testuser.yaml',
            mockFs = {
                existsSync: function(path) {
                    if (path == 'conf/' + MOCK_CONFIG
                        || path == 'conf/' + MOCK_CONFIG_REPOS_MISSING
                        || path.indexOf(testUserString) == path.length - testUserString.length) {
                        return true;
                    } else {
                        assert.fail(path, 'test config path', 'Incorrect config path.');
                    }
                },
                readFileSync: function(path) {
                    if (path == 'conf/' + MOCK_CONFIG) {
                        return mockConfig;
                    } else if (path == 'conf/' + MOCK_CONFIG_REPOS_MISSING) {
                        return mockConfigNoRepos;
                    } else if (path.indexOf(testUserString) == path.length - testUserString.length) {
                        return mockUserConfig;
                    } else {
                        assert.fail(path, 'test config path', 'Incorrect config path.');
                    }
                }
            },
            mockRequest = {
                get: function(url, callback) {
                    expect(url).to.equal("http://numenta.org/resources/repos.yaml");
                    callback(null, null, mockGlobalRepos);
                }
            },
            reader = proxyquire('../../utils/config-reader', {
                fs: mockFs,
                request: mockRequest
            });

        it('throws error if repos_url is not defined', function(done) {
            process.env.USER = 'testuser';
            reader.read('conf/' + MOCK_CONFIG_REPOS_MISSING, function(err) {
                expect(err).to.exist;
                expect(err.message).to.equal('Configuration is missing "repos_url".');
                process.env.USER = USER;
                done();
            });
        });

        it('fetches global repository listing', function(done) {
            process.env.USER = 'testuser';
            reader.read('conf/' + MOCK_CONFIG, function(err, config) {
                expect(err).to.not.exist;
                expect(config).to.have.property('repos');
                expect(config.repos).to.be.instanceOf(Array);
                expect(config.repos).to.have.length(20);
                process.env.USER = USER;
                done();
            });
        });

        it('injects Github username/password into monitor configurations', function(done) {
            process.env.USER = 'testuser';
            reader.read('conf/' + MOCK_CONFIG, function(err, config) {
                expect(err).to.not.exist;
                expect(config.monitors).to.include.keys(['numenta/nupic.core', 'numenta/nupic', 'numenta/nupic.tools']);
                // Two are marked as "monitor:false", so only 18 of the 20 in the global config
                // will be used.
                expect(_.keys(config.monitors)).to.have.length(18);
                _.each(['numenta/nupic.core', 'numenta/nupic', 'numenta/nupic.tools'], function(projectKey) {
                    expect(config.monitors[projectKey]).to.include.keys(['username', 'password']);
                    expect(config.monitors[projectKey].username).to.equal('mockghusername');
                    expect(config.monitors[projectKey].password).to.equal('mockghpassword');
                });
                process.env.USER = USER;
                done();
            });
        });

        it('creates configuration for each monitor', function(done) {
            process.env.USER = 'testuser';
            reader.read('conf/' + MOCK_CONFIG, function(err, config) {
                expect(err).to.not.exist;
                _.each(['numenta/nupic.cerebro2', 'numenta/nupic.cerebro2.server', 'numenta/nupic.cerebro'], function(projectKey) {
                    var monitorConfig = config.monitors[projectKey];
                    expect(monitorConfig).to.include.keys(['username', 'password', 'contributors']);
                    expect(monitorConfig.username).to.equal('mockghusername');
                    expect(monitorConfig.password).to.equal('mockghpassword');
                    expect(monitorConfig.contributors).to.equal('http://numenta.org/resources/contributors.csv');
                });
                process.env.USER = USER;
                done();
            });
        });

        process.env.USER = USER;
        process.env.GH_USERNAME = GH_USERNAME;
        process.env.GH_PASSWORD = GH_PASSWORD;
        clearConfigReaderRequireCache();
    });


});