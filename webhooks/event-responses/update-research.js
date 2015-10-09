var updateNupicModule = require('./update-nupic-module');

module.exports = function(payload, callback) {
    updateNupicModule(
        'numenta',
        'nupic.research',
        payload.sha,
        'Automated update of nupic master sha to ' + payload.sha + '.',
        callback
    );
};