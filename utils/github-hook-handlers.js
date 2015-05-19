module.exports = {
    gollum: require('./hook-handlers/gollum')
  , issue_comment: require('./hook-handlers/issue_comment')
  , pull_request: require('./hook-handlers/pull_request')
  , push: require('./hook-handlers/push')
  , status: require('./hook-handlers/status')
};
