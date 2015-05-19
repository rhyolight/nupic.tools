var _ = require('lodash')
  , sendMail = require('../mailman')
  ;


function gollumHandler(payload, config, repoClient, validators, callback) {
    var notificationSettings = config.notifications;
    if (notificationSettings && notificationSettings.gollum) {
        var to = notificationSettings.gollum
          , repo = payload.repository.full_name
          , editor = payload.sender.login
          , subject = '[wiki-change] ' + repo + ' updated by ' + editor
          , body = ''
          ;
        _.each(payload.pages, function(page) {
            body += page.title + ' was ' + page.action + ': ' + page.html_url + '\n\n';
        });
        sendMail(to, subject, body, callback);
    } else {
        // Do nothing if no notfication settings for email address.
        callback();
    }
}

module.exports = gollumHandler;