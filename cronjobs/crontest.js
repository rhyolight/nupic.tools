var CronJob = require('cron').CronJob,
    log = require('../utils/logger').logger;
var job = new CronJob('* 0-23 * * * *', function(){
    log.info('You will see this message every hour');
}, null, false, "America/Los_Angeles");

job.name = 'Cron Test';
job.description = 'Prints a message every second.';

module.exports = job;