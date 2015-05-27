var cheerio = require('cheerio')
  , _ = require('lodash')
  , request = require('request')
  //, nodeURL = require('url')
  , jsonUtils = require('./json')
  , log = require('./logger').logger
  , template = require('./template')
  , monthNames = [ 'January', 'February', 'March', 'April', 'May', 'June', 
        'July', 'August', 'September', 'October', 'November', 'December']
  , path = require('path')
  , async = require('async')
  , config
  ;

function buildUrlObjectsSince(archiveUrl, month, year) {
    var now = new Date()
      , thisYear = now.getFullYear()
      , thisMonth = now.getMonth()
      , nowRounded = new Date(thisYear, thisMonth)
      // we are assuming that the config file will be filled out with an 
      // integer 1-12, and not 0-11, which is what the Date object uses.        
      , currentMonth = month - 1
      , currentYear = year
      , arrayPos = 0
      , urls = {}
      ;
    while (new Date(currentYear, currentMonth) <= nowRounded) {
        urls[monthNames[currentMonth] + ' ' + currentYear] = {
            "url": archiveUrl + currentYear + "-" 
                + monthNames[currentMonth] + "/date.html"
          , "month": currentMonth++
          , "year": currentYear
          , "arrayPos": arrayPos++
        };
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
    }
    return urls;
}

function mailingListReporter (config, callback) {
    var totalSubscribers = 0
      , totalMessages = 0
      , rosterFetchers = {}
      ;

    config.mailinglists.forEach(function(mailingList) {
        rosterFetchers[mailingList.name] = function(callback) {
            var result = {
                    mailingLists: []
                }
              , rosterUrl = mailingList.rosterUrl;
            // Get subscribers
            request.get(rosterUrl, function(error, response) {
                if (error) return callback(error);
                var html = response.body
                  , $ = cheerio.load(html)
                  , subscribers = 0
                  , archiveUrls
                  , archiveFetchers = []
                  ;

                $('td center b font').each(function(i, el) {
                    subscribers += parseInt(
                        $(el).text().split(/\s+/).shift()
                    );
                });
                // Now we load all archive pages to count messages.
                archiveUrls = buildUrlObjectsSince(
                    mailingList.archiveUrl
                  , mailingList.startmonth
                  , mailingList.startyear
                );
                _.each(archiveUrls, function(url, name) {
                    archiveFetchers.push(function(archiveCallback) {
                        request.get(url.url, function(error, archiveResponse) {
                            if (error) return callback(error);
                            var html = archiveResponse.body
                              , $ = cheerio.load(html)
                                // Minus 4 cause page has 4 extra li elements that
                                // are not messages.
                              , messageCount = $('li').length - 4
                              ;
                            totalMessages += messageCount;
                            archiveCallback(null, {
                                name: name
                              , month: url.month
                              , year: url.year
                              , number: messageCount
                            });
                        });
                    });
                });

                async.parallel(archiveFetchers, function(error, messagesByMonth) {
                    if (error) return callback(error);
                    totalSubscribers += subscribers;
                    callback(null, {
                        name: mailingList.name
                      , messages: {
                            byMonth: messagesByMonth
                          , total: _.sum(_.pluck(messagesByMonth, 'number'))
                        }
                      , subscribers: subscribers
                    });
                });

            });
        };
    });
    async.parallel(rosterFetchers, function(error, data) {
        callback(error, {
            mailingLists: data
          , totalSubscribers: totalSubscribers
          , totalMessages: totalMessages
        });
    });
}

//function isJsonUrl(url) {
//    return nodeURL.parse(url, false, true).pathname.split(".").pop() == "json";
//}
//
//function buildOutput (request, response, data)  {
//    var htmlOut
//      , templateName = 'mailing-list-report.html'
//      ;
//    if (isJsonUrl(request.url)) {
//        if(nodeURL.parse(request.url).query !== null) {
//            jsonUtils.renderJsonp(
//                data
//              , nodeURL.parse(request.url, true).query.callback
//              , response
//            );
//        } else {
//            jsonUtils.render(data, response);
//        }
//    } else {
//        htmlOut = template(templateName, data);
//        response.end(htmlOut);
//    }
//}

module.exports = mailingListReporter;