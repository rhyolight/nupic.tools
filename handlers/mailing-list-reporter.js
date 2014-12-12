var jsdom = require("jsdom"),
    nodeURL = require("url"),
    jsonUtils = require('../utils/json'),
    log = require('../utils/logger').logger,
    template = require('../utils/template'),
    monthNames = [ "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"],
    path = require('path'),
    q = require('q'),
    config;

function buildUrlObjectsSince(archiveUrl, month, year) {
    var now = new Date(),
        thisYear = now.getFullYear(),
        thisMonth = now.getMonth(),
        nowRounded = new Date(thisYear, thisMonth),
        // we are assuming that the config file will be filled out with an 
        // integer 1-12, and not 0-11, which is what the Date object uses.        
        currentMonth = month - 1, 
        currentYear = year,
        arrayPos = 0,
        urls = [];
    while (new Date(currentYear, currentMonth) <= nowRounded) {
        urls.push({
            "url": archiveUrl + currentYear + "-" + monthNames[currentMonth] + "/date.html",
            "month": currentMonth++,
            "year": currentYear,
            "arrayPos": arrayPos++
        });
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
    }
    return urls;
}

function mailingListReporter (request, response) {
    var screenScrapes = [];
    var data = {
        mailingLists: [],
        totalSubscribers : 0,
        totalMessages : 0
    };
    config.mailinglists.forEach(function(mailingList) {
        getMailingList(mailingList,screenScrapes,data.mailingLists);
    });
    q.all(screenScrapes).then(function(){
        data.mailingLists.forEach(function(ml){
            data.totalSubscribers += ml.subscribers;
            data.totalMessages += ml.messages.total;
        });
        buildOutput(request, response, data);
    });
}

function getMailingList (mailingList,screenScrapes,data) {

        var numberSubsHTML;
        var numberSubsNoDigest;
        var numberSubsDigest;
        var rosterUrl = mailingList.rosterUrl;

        var mailingListData = {
            name: mailingList.name,
            messages: {
                byMonth : [],
                total: 0
            }
        };

        var urls = buildUrlObjectsSince(mailingList.archiveUrl, mailingList.startmonth, mailingList.startyear);

        log.debug('Fetching ML data from %s', rosterUrl);

        // Get subscribers
        var deferredRoster = q.defer();
        jsdom.env(rosterUrl, ["http://code.jquery.com/jquery.js"], function (errors, window) {
            log.debug('Received data from %s', rosterUrl);
            numberSubsHTML = window.$("center b font");
            numberSubsNoDigest = parseInt((numberSubsHTML[0]).innerHTML.split(" ").shift());
            numberSubsDigest = parseInt((numberSubsHTML[1]).innerHTML.split(" ").shift());
            mailingListData.subscribers = numberSubsNoDigest + numberSubsDigest;
            deferredRoster.resolve(true);
        });
        screenScrapes.push(deferredRoster.promise);
        urls.forEach(function(url) {
            var deferred = q.defer();
            log.debug('Fetching ML data from %s', url.url);
            jsdom.env(url.url,["http://code.jquery.com/jquery.js"], function (errors, window) {
                log.debug('Received data from %s', url.url);
                var temp = {};
                temp.name = monthNames[url.month] + " " + url.year;
                temp.month = url.month;
                temp.year = url.year;
                // TODO: Sometimes jquery is not loaded in the window, and I don't know why. -- Matt
                if (window.$) {
                    temp.number = (window.$("a").length-10)/2;
                    temp.number = (temp.number < 0) ? 0 : temp.number;
                    mailingListData.messages.byMonth[url.arrayPos] = temp;
                    mailingListData.messages.total += (window.$("a").length-10)/2;
                }
                deferred.resolve(true);
            });
            screenScrapes.push(deferred.promise);
        });

        data.push(mailingListData);
}

function buildOutput (request, response, data)  {
    var htmlOut, templateData,
        templateName = 'mailing-list-report.html';
    if (nodeURL.parse(request.url,false,true).pathname.split(".").pop() == "json") {
        if(nodeURL.parse(request.url).query !== null)   {
            jsonUtils.renderJsonp(data, nodeURL.parse(request.url, true).query.callback, response);
        }   else    {
            jsonUtils.render(data, response);
        }
    } else {
        htmlOut = template(templateName, data);
        response.end(htmlOut);
//        response.write("<!DOCTYPE html><html><head><title>NuPIC Mailing List Statistics</title><link href='//netdna.bootstrapcdn.com/bootstrap/3.1.1/css/bootstrap.min.css' rel='stylesheet' media='screen'><link rel='shortcut icon' type='image/x-icon' href='http://status.numenta.org/favicon.ico'><meta name='viewport' content='width=device-width, initial-scale=1.0'></head><body>");
//        response.write("<div class='container-fluid'><div class='jumbotron'><div class='row'><div class='col-md-8'><h1><img style='float:left;margin:0 20px 20px 0;' alt='Numenta logo' src='http://numenta.org/images/numenta-icon128.png'> NuPIC Mailing List Statistics</h1></div>");
//        response.write("<div class='col-md-4' style='padding-top:40px;'><h3>Total subscribers: "+data.totalSubscribers+"</h3><h3>Total messages: "+data.totalMessages+"</h3></div></div></div><table class='table'><tr>");
//        data.mailingLists.forEach(function(ml) {
//            response.write("<td>");
//            response.write("<h2>"+ml.name+"</h2>");
//            response.write("<h4>Total subscribers: "+ml.subscribers+"</h4>");
//            response.write("<table class='table'><tr><th>Month</th><th>Messages</th></tr>");
//            ml.messages.byMonth.forEach(function(nextMonthData) {
//                response.write("<tr><td>"+nextMonthData.name+"</td><td>"+nextMonthData.number+"</td></td>");
//            });
//            response.write("<tr><th>Total</th><td>"+ml.messages.total+"</td></tr></table></td>");
//        });
//        response.write("</tr></table></div></body></html>");
//        response.end();
    }
}

mailingListReporter.title = 'Mailing List Reporter';
mailingListReporter.description = 'Provides statistics about the mailing list. (Outputs HTML or JSON depending on extention [*.html or *.json]. For JASONP add query "callback" [ex.: ...?callback=foo].)';
mailingListReporter.url = '/maillist';

module.exports = {
    '/maillist*': function(_repoClients, _httpHandlers, _config, activeValidators) {
        config = _config;
        return mailingListReporter;
    }
};