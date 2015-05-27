var CronJob = require('cron').CronJob
  , _ = require('lodash')
  , moment = require('moment')
  , async = require('async')
  , sendMail = require('../utils/mailman')
  , log = require('../utils/logger').logger
  , repos = [
        'numenta/nupic', 'numenta/nupic.core'
      , 'numenta/nupic-linux64', 'numenta/nupic-darwin64'
    ]
  , readyLabel = 'status:ready'
  , inProgressLabel = 'status:in progress'
  , helpWantedLabel = 'status:help wanted'
  , prReviewerEmail
  ;

function sendPrReviewReminder(prs) {
    var to = prReviewerEmail
      , subject = prs.length + ' NuPIC Pull Requests need review'
      , body = ''
      ;

    if (! to) {
        log.error('No one to email PR review emails to!');
        return;
    }

    body += 'Hello NuPIC Committers! Here is a list of pull requests awaiting\n'
          + 'review:\n\n';

    _.each(prs, function(pr) {
        body += '- ' + pr.title + ' --- ' + pr.html_url + '\n';
    });

    body += '\nThese pull requests have been ready for review for over a\n'
          + 'week! Please make it a priority to review these contributions\n'
          + 'or discuss reasons why they cannot be merged.\n\n';

    sendMail(to, subject, body, function(error) {
        if (error) {
            log.error('Error running cron job ' +
                '"Pull Request Reviewer" (sending mail).');
            log.error(error);
        } else {
            log.debug('Mail sent successfully.');
        }
    });
}

function processAllOpenPrs(prs) {
    var warn = []
      , close = []
      , email = []
      ;
    log.info('Found %s open pull requests.', prs.length);
    _.each(prs, function(pr) {
        var labels = _.pluck(pr.labels, 'name')
          , updated = new Date(pr.updated_at)
          , sevenDaysAgo = moment().subtract(7, 'days')
          , almostMonthAgo= moment().subtract(25, 'days')
          , monthAgo = moment().subtract(1, 'month')
          ;
        if (_.contains(labels, readyLabel)) {
            // This PR is "ready".
            if (moment(updated).isBefore(sevenDaysAgo)) {
                email.push(pr);
            }
        } else if (_.contains(labels, inProgressLabel)
                || _.contains(labels, helpWantedLabel)) {
            if (moment(updated).isBefore(monthAgo)) {
                close.push(pr);
            } else if (moment(updated).isBefore(almostMonthAgo)) {
                warn.push(pr);
            }
        }
    });
    if (email.length) {
        sendPrReviewReminder(email);
    }
}


function reviewPullRequests(config, repoClients) {
    var job;
    prReviewerEmail = config.notifications.pr_review;
    job = new CronJob('* * */24 * * *', function() {
        var prFetchers = []
          , prs = [];
        log.info('Starting open PR review...');
        _.each(repos, function(repo) {
            var repoClient = repoClients[repo];
            prFetchers.push(function(callback) {
                repoClient.getAllOpenPullRequests(
                    {includeLabels: true}, callback
                );
            });
        });

        async.parallel(prFetchers, function(error, prLists) {
            if (error) {
                log.error('Error running cron job "%s"!', job.name);
                log.error(error);
            } else {
                _.each(prLists, function(prList) {
                    prs = prs.concat(prList);
                });
                processAllOpenPrs(prs);
            }
        });
    }, null, false, "America/Los_Angeles");

    job.name = 'Pull Request Reviewer';
    job.description = 'Looks for PRs that match certain criteria and takes ' +
        'actions to keep them up-to-date.';
    job.runNow = false;

    return job;
}


module.exports = reviewPullRequests;