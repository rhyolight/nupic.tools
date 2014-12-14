var fs = require('fs')
  , url = require('url')
  , qs = require('querystring')
  , _ = require('underscore')
  , tmpl = require('../utils/template')
  , AnsiConverter = require('ansi-to-html')
  , converter = new AnsiConverter()
  , log = require('../utils/logger').logger
  ;

function logViewer(req, res) {
    var linesToRead = 100
      , reqUrl = url.parse(req.url)
      , query = qs.parse(reqUrl.query)
      ;
    if (query.lines) {
        linesToRead = query.lines;
    }
    log.query({
        limit: linesToRead
      , order: 'desc'
    }, function(err, results) {
        var ansiLines = undefined
          , htmlOut = undefined;
        if (err) throw err;
        ansiLines = _.map(results.file, function(line) {
            line.message = converter.toHtml(line.message);
            return line;
        });
        htmlOut = tmpl('logs.html', { logs: ansiLines });
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Length', htmlOut.length);
        res.end(htmlOut);
    });
}

logViewer.title = 'Log Viewer';
logViewer.description = 'Provides an HTML display of the nupic.tools server '
    + 'logs. Defaults to display the most recent log file.';
logViewer.url = '/logs';

module.exports = {
    '/logs*': function() {
        return logViewer;
    }
};