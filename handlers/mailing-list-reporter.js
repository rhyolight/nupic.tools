var _ = require('lodash')
  , nodeURL = require('url')
  , jsonUtils = require('../utils/json')
  , log = require('../utils/logger').logger
  , template = require('../utils/template')
  , CRON_SOURCE = 'Mailing List Archive Scraper'
  ;

function isJsonUrl(url) {
    return nodeURL.parse(url, false, true).pathname.split(".").pop() == "json";
}

function mailingListReporter (request, response)  {
    var htmlOut
      , templateName = 'mailing-list-report.html'
      , data = global._CRON[CRON_SOURCE].data
      ;
    if (isJsonUrl(request.url)) {
        if(nodeURL.parse(request.url).query !== null) {
            jsonUtils.renderJsonp(
                data
              , nodeURL.parse(request.url, true).query.callback
              , response
            );
        } else {
            jsonUtils.render(data, response);
        }
    } else {
        htmlOut = template(templateName, data);
        response.end(htmlOut);
    }
}

mailingListReporter.title = 'Mailing List Reporter';
mailingListReporter.description = 'Provides statistics about the mailing list. '
    + '(Outputs HTML or JSON depending on extension [*.html or *.json]. For '
    + 'JSONP add query "callback" [ex.: ...?callback=foo].)';
mailingListReporter.url = '/maillist';

module.exports = {
    '/maillist*': function() {
        return mailingListReporter;
    }
};