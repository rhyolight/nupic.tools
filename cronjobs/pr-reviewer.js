/* -----------------------------------------------------------------------------
 * Copyright (C) 2015, Numenta, Inc.  Unless you have purchased from
 * Numenta, Inc. a separate commercial license for this software code, the
 * following terms and conditions apply:
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see http://www.gnu.org/licenses.
 *
 * http://numenta.org/licenses/
 * -------------------------------------------------------------------------- */


/**
 * NuPIC Pull Request Reviewer timed cron job
 * @desc Gathers metrics (status, age, etc) for Pull Requests and takes
 *  desired actions (emails, PR comments, status changes, etc.)
 * @exports {Object} module.exports reviewPullRequests()
 * @function
 * @module cronjobs/pr-reviewer
 * @public
 */

var CronJob = require('cron').CronJob
  , _ = require('lodash')
  , moment = require('moment')
  , async = require('async')
  , sendMail = require('../utils/mailman')
  , log = require('../utils/logger').logger
  , RepoClientStore = {}
  , repos = [
      //   'numenta/nupic'
      // , 'numenta/nupic.core'
      // , 'numenta/nupic-linux64'
      // , 'numenta/nupic-darwin64'
        'numenta/numenta.org'
      , 'brev/numenta.org'
      , 'GrokSolutions/numenta.com'
      , 'brev/numenta.com'
    ]
  , readyLabel = 'status:ready'
  , inProgressLabel = 'status:in progress'
  , helpWantedLabel = 'status:help wanted'
  , prReviewerEmail
  ;


/**
 * Got the Pull Requests, start processing on them now
 * @function
 * @param {Array} prs - List of Pull Request objects from GitHub API
 * @private
 */
var processAllOpenPrs = function (prs) {
  var fetchers = []
    , warn = []
    , close = []
    , email = []
    ;

  log.info('Found %s open pull requests. Counting admin comments.', prs.length);

  // queue fetchers for PR admin comments
  _.each(prs, function(pr) {
    var repo =    pr.head.repo.full_name
      , client =  RepoClientStore[repo]
      ;

    if(client) {
      fetchers.push(function(callback) {
        client.getPullRequestComments(pr, callback);
      });
    }
  });

  log.info('Fetching PR Admin Comments...');
  async.parallel(fetchers, function(error, prFetched) {
    if(error) throw error;

    _.each(prFetched, function(prComments) {
      _.each(prComments, function(prComment) {
        console.log('++', prComment.number);
      });
    });

    // queue PR actions
    _.each(prs, function(pr) {
      var labels = _.pluck(pr.labels, 'name')
        , created = moment(pr.created_at)
        , updated = moment(pr.updated_at).subtract(26, 'days')
        , fiveDaysAgo = moment().subtract(5, 'days')
        , sevenDaysAgo = moment().subtract(7, 'days')
        , almostMonthAgo= moment().subtract(25, 'days')
        , monthAgo = moment().subtract(1, 'month')
        ;

      if (_.contains(labels, readyLabel)) {
        // This PR is "ready".
        if (moment(updated).isBefore(sevenDaysAgo)) {
          email.push(pr);
        }
      }
      else if (
        _.contains(labels, inProgressLabel) ||
        _.contains(labels, helpWantedLabel)
      ) {
        if (
          moment(created).isBefore(monthAgo) &&
          moment(updated).isBefore(fiveDaysAgo)
        ) {
          // This PR is expired and "closing"
          close.push(pr);
        }
        else if (moment(updated).isBefore(almostMonthAgo)) {
          // This PR is getting warned about expiring soon
          warn.push(pr);
        }
      }
    }); // queue

    // execute queued PR actions
    if (email.length) {
      sendPrReviewReminder(email);
    }
    if (close.length) {
      closePrExpired(close);
    }
    if (warn.length) {
      warnPrExpiring(warn);
    }

  }); // async
};

/**
 * Add a comment to an old PR telling everyone it will be expired soon
 * @function
 * @param {Array} prs - List of Pull Request objects from GitHub API
 * @private
 */
var sendPrReviewReminder = function (prs) {
  var to = prReviewerEmail
    , subject = prs.length + ' NuPIC Pull Requests need review'
    , body = ''
    ;

  log.info('Sending Review Reminders for %s old open pull requests.', prs.length);

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
      log.error(
        'Error running cron job ' + '"Pull Request Reviewer" (sending mail).'
      );
      log.error(error);
    } else {
      log.debug('Mail sent successfully.');
    }
  });
};

/**
 * Close old expired Pull Requests (older than a month)
 * @function
 * @param {Array} prs - List of Pull Request objects from GitHub API
 * @private
 */
var closePrExpired = function (prs) {
  log.info('Closing %s expired open pull requests.', prs.length);

  _.each(prs, function(pr) {
    var repo = pr.head.repo.full_name;
    var client = RepoClientStore[repo];

    console.log('close!', pr.number);
  });
};

/**
 * Warn old expiring Pull Requests (older than 25 days)
 * @function
 * @param {Array} prs - List of Pull Request objects from GitHub API
 * @private
 */
var warnPrExpiring = function (prs) {
  log.info('Warning %s expiring open pull requests.', prs.length);

  _.each(prs, function(pr) {
    var repo = pr.head.repo.full_name;
    var client = RepoClientStore[repo];

    client.createPullRequestComment(
      pr,
      '**WARNING!** This Pull Request has been inactive for 25'
        + ' days, and will be **automatically closed in 5 days** if'
        + ' not updated before then. *This is an automated message.*',
      function(error) {
        if(error) throw error;
        log.info('Expiration Warning comment placed on PR #', pr.number);
      }
    );
  }); // each
};


/**
 * Main function that loops through all PRs
 * @function
 * @param {Object} config - Configuration object context
 * @param {Object} repoClients - Info about each code repository
 * @public
 * @returns {Object} - Individiual job entity
 */
var reviewPullRequests = function (config, repoClients) {
  var job;

  RepoClientStore = repoClients; // global
  prReviewerEmail = config.notifications.pr_review;

  job = new CronJob('*/1 * * * *', function() {   // @TODO reset to "5 0 * * *"
    var prFetchers = []
      , prs = [];

    log.info('Starting open PR review...');

    _.each(repos, function(repo) {
      var repoClient = repoClients[repo];

      if(repoClient) {
        prFetchers.push(function(callback) {
          repoClient.getAllOpenPullRequests({ includeLabels: true }, callback);
        });
      }
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
};

// Export
module.exports = reviewPullRequests;
