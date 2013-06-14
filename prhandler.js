var contributors = require('./contributors');

function isContributor(name, roster) {
	return roster.map(function(p) { return p.Github; })
                 .reduce(function(prev, curr) {
					if (prev) return prev;
					return curr == name;
                 }, false);
}

module.exports = function(githubClient) {
    return function(req, res) {
        var payload = JSON.parse(req.body.payload),
            action = payload.action,
            githubUser = payload.pull_request.user.login,
            head = payload.pull_request.head,
            base = payload.pull_request.base;

        console.log('Received pull request "' + action + '" from ' + githubUser);

        if (action == 'closed') {
            return res.end();
        }

        // console.log('from:');
        // console.log(head);
        // console.log('to:');
        // console.log(base);
        
        contributors.getAll(function(err, contribs) {
            if (! isContributor(githubUser, contribs)) {
                githubClient.rejectPR(
                    head.sha, 
                    githubUser + ' has not signed the Numenta Contributor License',
                    'http://numenta.com/licenses/cl/contributors.html');
            } else {
                githubClient.approvePR(head.sha);
            }
        });

        res.end();
    };
};