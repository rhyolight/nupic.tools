var CronJob = require('cron').CronJob
  , mailingListScraper = require('../utils/mailing-list-scraper')
  , log = require('../utils/logger').logger
  ;


function scrapeMailingLists(config) {
    var job = new CronJob('5 0 * * *', function() {
        log.info('Starting mailing list scrape.... this will take awhile.');
        mailingListScraper(config, function(error, data) {
            if (error) {
                log.error('Error running cron job "%s"!', job.name);
                log.error(error);
            } else {
                log.info('Completed mailing list scrape!');
                global._CRON[job.name] = {
                    completedAt: new Date()
                  , data: data
                };
            }
        });
    }, null, false, "America/Los_Angeles");

    job.name = 'Mailing List Archive Scraper';
    job.description = 'Gathers statistics about NuPIC mailing lists once a day.';
    job.runNow = true;

    return job;
}

module.exports = scrapeMailingLists;