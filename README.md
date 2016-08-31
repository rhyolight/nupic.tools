nupic.tools [![Build Status](https://travis-ci.org/numenta/nupic.tools.png?branch=master)](https://travis-ci.org/numenta/nupic.tools) [![Coverage Status](https://coveralls.io/repos/numenta/nupic.tools/badge.png?branch=master)](https://coveralls.io/r/numenta/nupic.tools?branch=master)
=============

This is the tooling server [Numenta](http://numenta.org) uses to support their open source projects. This is being used to support the [development process](https://github.com/numenta/nupic/wiki/Developer-Workflow) of the [NuPIC](http://github.com/numenta/nupic) project, but it is generalized enough to be used for many open-source project on GitHub.

## Features

This is a multi-use utility, a kitchen sink of sorts. I have tried to make it as generic as possible so it can be adapted to other open source workflows. But there is still some NuPIC-specific code in here. In all of these cases, this specific code can be removed or replaced without a problem.

### Monitor Activity of Many GitHub Repositories

Repositories to be monitored are defined in a configuration file. On startup, the server will register to receive webhook events from GitHub for each repository. The events to listen to are defined in the configuration file, and handlers for each event can easily be added or changed.

The way GitHub "client" objects are created and shared across server resources, it is easy to create custom HTTP request handlers that can operation across every repository.

### Custom HTTP Request Handlers

Just add your own handler in the [`handlers`](handlers) directory. There are several already there, so you can look at them and match their signature. 

### Custom GitHub PR Validation

On every update to a Pull Request, the custom PR validators can be executed against each PR. Examples of existing validators are in the [`validators`](validators) directory. Each one exports a function called `validate` that will be passed the following arguments:

- `sha`: the SHA of the pull request's head
- `githubUser`: the Github login of the pull request originator
- `statusHistory`: an array of status objects from the [Github Status API](http://developer.github.com/v3/repos/statuses/) for the pull request's `head` SHA
- `repoClient`: an instance of `RepositoryClient` (see the `respoClient.js` file), which has some convenience methods as well as the underlying `github` object from the [node-github](https://github.com/ajaxorg/node-github) library (TODO: may want to get rid of the RepositoryClient class and just pass around the raw node-github api object.)
- `callback`: function to call when validation is complete. Expects an error and result object. The result object should contain at the least, a `state` attribute. It can also contain `description` and `target_url`, which will be used to create the new Github status

Each validator also exports a `name` so it can be identified for logging.

Additionally, each validator may export a `priority`. This should be a number which must be bigger or equal to 0. A higher number means a higher priority. This validator with the highest priority is used to set the `target_url` attribute of the object passed to the callback function. If the validator does not export a priority, it will default to 0.

You can add as many validators in the `validator` directory, and they will automatically be used. The current validators are:

- *contributor*: Ensures pull request originator is within a contributor listing
- *fastForward*: Ensures the pull request `head` has the `master` branch merged into it

### CI Build Triggers

This server is currently configured to trigger Travis-CI and AppVeyor builds for all open PRs whenever another PR merges. This ensures each PR runs with the most recent code in CI. 

### Automated Code Pushes

I use the [github-data](http://github.com/rhyolight/github-data) module to automatically run `git` operations against other repositories when certain things happen. For example, we have a regression test repository that needs to be updated with the most recent SHA on NuPIC's HEAD of master. So anytime a build passes on master, this server updates a file called `nupic_sha.txt` in the `nupic.regression` repository. This is done without making any local `git` calls by using the GitHub Git Data API. See [`webhooks/event-responses/update-regression.js`](webhooks/event-responses/update-regression.js) for implementation details.

### Automated Pull Request Creation

Just like the automated code pushes described above, this server also creates automated pull requests. See [`webhooks/event-responses/create-core-update-pr.js`](webhooks/event-responses/create-core-update-pr.js) for implementation details.

## Integrations
### GitHub

In addition to receiving lots of webhooks from GitHub, this server also uses the GitHub API exhaustively to update PR statuses, find open pull requests, merge, get contributors and committers, search issues, etc. See [`utils/repo-client.js`](utils/repo-client.js) for details. 

#### Custom Webhook Configuration and Handling

On startup, the server removes all existing GitHub webhooks registered for the host it is configured to run on. Then it re-registers all new webhooks based on the current configuration. All the handling for these webhooks are within the [`webhooks`](webhooks) directory. The event handling logic exists within files in [`webhooks/event-handlers`](webhooks/event-handlers) directory based on the name of the event. 

## Installation

    npm install .

## Requirements
### Environment Variables

    GH_USERNAME=<login>
    GH_PASSWORD=<password>
    APPVEYOR_API_TOKEN=<token>

### Configuration

Default configuration settings are in the `./conf/config.yml` file. To provide instance-level settings, create a new config file using the username of the logged-in user. For example, mine is called `./conf/config-rhyolight.yml`. This is where you'll keep your instance configuration settings, like your production `host` and `port`. You can also add as many `monitors` as you wish. The key for each monitor should be the Github organization/repository name.

### Start the server:

    npm start

Now hit http://localhost:8081 (or whatever port you specified in the configuration file) and you should see a status page reporting what repositories are being monitored, as well as what extra services are provided by [HTTP Handlers](#http_handler_addons).
