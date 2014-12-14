var request = require('request')
  , monitors;

function csvToJson(csv) {
    var contributors = []
      , lines = csv.split('\n')
      , header = lines.shift().split(',')
      ;
    lines.forEach(function(line) {
        var obj = {},
            person = line.split(',');
        header.forEach(function(key, i) {
            if (person[i] == '0' || person[i] == '1') {
                obj[key] = parseInt(person[i]);
            } else {
                obj[key] = person[i];
            }
        });
        contributors.push(obj);
    });
    return JSON.stringify({contributors: contributors});
}

module.exports.getAll = function(csvUrl, callback) {
    request(csvUrl, function(err, _, body) {
        if (err) {
            return callback(err);
        }
        callback(null, JSON.parse(csvToJson(body.trim())).contributors);
    });
};
