var updateNupicModule = require('./update-nupic-module');

module.exports = function(payload, callback) {
    updateNupicModule(
        'numenta'
      , 'nupic.research'
      , payload.after
      , 'Automated update of nupic master sha to ' + payload.after + '.'
      , callback
    );
};