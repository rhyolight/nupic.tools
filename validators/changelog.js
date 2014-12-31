var _ = require('underscore')
  , log = require('../utils/logger').logger
  , NAME = 'CHANGELOG Validator'
  , CHANGELOG_WIKI = 'https://github.com/numenta/nupic/wiki/CHANGELOG-Guidelines'
  , HEAD = 'HEAD'
  ;

function getRepoChangelogFile(client, callback) {
    client.getContent('', function(err, rootContents) {
        var changelogFile
          , changelogName
          ;
        if (err) return callback(err);
        changelogFile = _.find(rootContents, function(file) {
            return file.name.indexOf('CHANGELOG') > -1;
        });
        if (changelogFile) {
            changelogName = changelogFile.name;
        }
        callback(null, changelogName);
    });
}

function changelogWasUpdated(updatedFiles, changelogName) {
    var changelog = _.find(updatedFiles, function(file) {
        return file.filename == changelogName;
    });
    return !! changelog && changelog.status == 'modified';
}

function validator(sha, githubUser, repoClient, callback) {
    var response = {
        target_url: CHANGELOG_WIKI
    };
    log.info('Validating CHANGELOG was updated between %s and %s ...', HEAD, sha);
    // If this PR was created by this server using the ci account, we'll
    // automatically approve it.
    if (githubUser == 'numenta-ci') {
        response.state = 'success';
        response.description = 'This PR was created by nupic.tools.'
        return callback(null, response);
    }
    getRepoChangelogFile(repoClient, function(err, changelogName) {
        repoClient.compareCommits(HEAD, sha, function(err, comparison) {
            if (err) return callback(err);
            if (! changelogName) {
                response.state = 'success';
                response.description = 'No CHANGELOG to update';
            } else if (changelogWasUpdated(comparison.files, changelogName)) {
                response.state = 'success';
                response.description = '"' + changelogName + '" was updated';
            } else {
                response.state = 'pending';
                response.description = 'Update ' + changelogName 
                    + ' if necessary';
            }
            callback(null, response);
        });
    });
}

module.exports.validate = validator;
module.exports.name = NAME;
