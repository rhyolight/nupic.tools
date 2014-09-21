// Load everything for code coverage
var utils = require('../utils/general');
utils.initializeModulesWithin('./handlers');
utils.initializeModulesWithin('./validators');
utils.initializeModulesWithin('./utils');
require('../utils/logger').initialize(null, 'error');
