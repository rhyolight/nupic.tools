var assert = require('assert'),
    proxyquire = require('proxyquire').noCallThru();

describe('when triggering a new travis build', function() {
    var MockGithubApi = undefined,
        MockTravisApi = undefined,
        mockDependencies = undefined,
        RepoClient = undefined,
        repoClient = undefined,
        mockBuildResponse = undefined,
        mockRestartResponse = undefined;
    
    MockGithubApi = function() {
        var me = this;
        this.authenticate = function(cfg) {
            me.username = cfg.username;
            me.password = cfg.password;
        };
    };

    mockBuildResponse = { 
        id: 25741462,
        repository_id: 1010164,
        commit_id: 7436847,
        number: '150',
        pull_request: true,
        pull_request_title: 'Whatever',
        pull_request_number: 50,
        config: { 
            script: 'sleep 3; echo $TRAVIS_COMMIT',
            '.result': 'configured',
            language: 'ruby',
            os: 'linux' 
        },
        state: 'passed',
        started_at: '2014-05-21T23:04:42Z',
        finished_at: '2014-05-21T23:05:02Z',
        duration: 20,
        job_ids: [ 25741463 ] 
    };

    mockRestartResponse = { 
        result: true,
        flash: [ { notice: 'The build was successfully restarted.' } ] 
    };

    MockTravisApi = function() {
        var me = this;
        this.authenticate = function(cfg) {
            me.username = cfg.username;
            me.password = cfg.password;
        };
        this.builds = function(cfg, cb) {
            assert.equal(cfg.slug, 'mockorg/mockrepo', 'Travis given wrong slug.');
            assert.equal(cfg.event_type, 'pull_request', 'Travis given wrong event_type.');
            cb(null, {builds: [mockBuildResponse]});
        };
        this.builds.restart = function(cfg, cb) {
            assert.equal(cfg.id, 25741462, 'Travis given wrong build number.');
        };
    };
    mockDependencies = {
        'github': MockGithubApi,
        'travis-ci': MockTravisApi
    };
    RepoClient = proxyquire('../../utils/repo-client', mockDependencies);
    repoClient = new RepoClient({
        username: 'mockuser',
        password: 'mockpass',
        organization: 'mockorg',
        repository: 'mockrepo'
    });
    
    describe('for one repository', function() {
        it('calls the travis-ci api properly', function(done) {
            repoClient.triggerTravisForPullRequest(50);
            done();
        });
    });
});
