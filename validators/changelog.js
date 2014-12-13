var _ = require('underscore'),
    log = require('../utils/logger').logger,
    NAME = 'CHANGELOG Validator',
    CHANGELOG_WIKI = 'https://github.com/numenta/nupic/wiki/CHANGELOG-Guidelines',
    HEAD = 'HEAD';

function changelogWasUpdated(updatedFiles) {
    var changelog = _.find(updatedFiles, function(file) {
        return file.filename == 'CHANGELOG.md';
    });
    return !! changelog && changelog.status == 'modified';
}

function validator(sha, githubUser, repoClient, callback) {
    var response = {};
    log.info('Validating CHANGELOG was updated between %s and %s ...', HEAD, sha);
    repoClient.compareCommits(HEAD, sha, function(err, comparison) {
        if (err) return callback(err);
        response.target_url = CHANGELOG_WIKI;
        if (changelogWasUpdated(comparison.files)) {
            response.state = 'success';
            response.description = '"CHANGELOG.md" was updated';
        } else {
            response.state = 'pending';
            response.description = 'Update CHANGELOG.md if necessary';
        }
        callback(null, response);
    });
}

module.exports.validate = validator;
module.exports.name = NAME;
