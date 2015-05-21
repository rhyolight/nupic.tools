var updateNupicModule = require('./update-nupic-module');

module.exports = function(sha, callback) {
    updateNupicModule(
        'numenta'
      , 'nupic.research'
      , sha
      , 'Automated update of nupic master sha to ' + sha + '.'
      , callback
    );
};