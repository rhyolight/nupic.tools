var log = require('../../utils/logger').logger
  , GitData = require('github-data');

function updater(org, repo, sha, commitMessage, callback) {
    var gdata = new GitData(
            process.env.GH_USERNAME
          , process.env.GH_PASSWORD
          , org
          , repo
        );
    log.warn('Committing new NuPIC SHA "%s" to %s/%s...', sha, org, repo);
    gdata.getBranch('master', function(error, master) {
        if (error) { return callback(error); }
        master.getFile('nupic_sha.txt', function(error, file) {
            if (error) { return callback(error); }
            file.blob.setContents(sha);
            file.commit(commitMessage, function(error, commit) {
                if (error) { return callback(error); }
                master.push(commit, function(error) {
                    if (! error) {
                        log.warn('Committed new NuPIC SHA "%s" to %s/%s.',
                            sha, org, repo
                        );
                    }
                    callback(error);
                });
            });
        });
    });
}

module.exports = updater;