module.exports = {
    issue_comment: require('./event-handlers/issue_comment')
  , pull_request: require('./event-handlers/pull_request')
  , push: require('./event-handlers/push')
  , status: require('./event-handlers/status')
};
