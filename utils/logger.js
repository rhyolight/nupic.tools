var fs = require('fs'),
    path = require('path'),
    winston = require('winston'),
    initialized = false;

function initializeLogger(logDirectory, logLevel) {
    var logFileName = new Date().toISOString() + '.log',
        logPath;
    if (! initialized) {
        if (! logDirectory) {
            logDirectory = path.join(__dirname, 'logs');
        }
        if (! logLevel) {
            logLevel = 'debug';
        }
        logPath = path.join(logDirectory, logFileName);
        if (! fs.existsSync(logDirectory)) {
            fs.mkdirSync(logDirectory);
        }
        winston.remove(winston.transports.Console);
        winston.add(winston.transports.Console, {
            level: logLevel,
            colorize: true,
            handleExceptions: false
        });
        winston.add(winston.transports.File, {
            filename: logPath,
            level: logLevel,
            handleExceptions: false
        });
        winston.info('Winston logger initialized at level "%s", writing to %s', logLevel, logPath);
        initialized = true;
    }
    return winston;
}

module.exports = {
    logger: winston,
    initialize: initializeLogger
};
