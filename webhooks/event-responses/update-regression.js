var updateNupicModule = require('./update-nupic-module');

module.exports = function(payload, callback) {
    updateNupicModule(
        'numenta',
        'nupic.regression',
        payload.sha,
        'Automated update of nupic master sha to ' + payload.sha + '.',
        callback
    );
};