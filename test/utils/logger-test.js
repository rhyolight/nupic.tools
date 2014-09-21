var expect = require('chai').expect,
    proxyquire = require('proxyquire'),
    tk = require('timekeeper');

function clearLoggerRequireCache() {
    delete require.cache[require.resolve('../../utils/logger')]
}


describe('logger when initialized', function() {
    var now = new Date(),
        expectedLogFileName = now.toISOString() + '.log',
        Logger, mockPathJoin, mockFs, mockWinston;

    mockPathJoin = function(logDir, logFile) {
        expect(logDir).to.equal('log-dir');
        expect(logFile).to.equal(expectedLogFileName);
        return 'joined-path';
    };
    mockFs = {
        existsSync: function(dir) {
            expect(dir).to.equal('log-dir');
            return false;
        },
        mkdirSync: function(dir) {
            expect(dir).to.equal('log-dir');
        }
    };
    mockWinston = {
        remove: function() {},
        add: function() {},
        info: function() {},
        transports: {
            Console: {},
            File: {}
        }
    };

    function initLogger() {
        Logger = proxyquire('../../utils/logger', {
            path: {
                join: mockPathJoin
            },
            fs: mockFs,
            winston: mockWinston
        });
    }

    // For Datetime work, freezing time to now.
    tk.freeze(now);

    it('should default to debug log level', function() {
        var addCalled = false;
        clearLoggerRequireCache();
        mockWinston.add = function(transport, config) {
            expect(config).to.be.instanceOf(Object);
            expect(config).to.have.property('level');
            expect(config.level).to.equal('debug');
            if (transport == mockWinston.transports.File) {
                expect(config).to.have.property('filename');
                expect(config.filename).to.equal('joined-path');
            }
            addCalled = true;
        };
        initLogger();
        Logger.initialize('log-dir');
        expect(addCalled).to.equal(true);
    });

    it('should use log level passed by use if exists', function() {
        var addCalled = false;
        clearLoggerRequireCache();
        initLogger();
        mockWinston.add = function(transport, config) {
            expect(config).to.be.instanceOf(Object);
            expect(config).to.have.property('level');
            expect(config.level).to.equal('my-log-level');
            addCalled = true;
        };
        Logger.initialize('log-dir', 'my-log-level');
        expect(addCalled).to.equal(true);
    });
});
