var updateNupicModule = require('./update-nupic-module');

module.exports = function(sha, callback) {
    updateNupicModule(
        'numenta'
      , 'nupic.regression'
      , sha
      , 'Automated update of nupic master sha to ' + sha + '.'
      , callback
    );
};