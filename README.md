nupic-tools [![Build Status](https://travis-ci.org/numenta/nupic.tools.png?branch=master)](https://travis-ci.org/numenta/nupic.tools) [![Coverage Status](https://coveralls.io/repos/numenta/nupic.tools/badge.png?branch=master)](https://coveralls.io/r/numenta/nupic.tools?branch=master)
=============

Server for tooling around a development process that ensures the `master` branch is always green, without the need for a development branch. This is being used to support the [development process](https://github.com/numenta/nupic/wiki/Developer-Workflow) of the [NuPIC](http://github.com/numenta/nupic) project, but it is generalized enough to be used for any project.

This server registers a web hook URL with Github when it starts up (if it doesn't already exist) and gets notified on pull requests and status changes on the repositories specified in the [configuration](#configuration). When pull requests or SHA status updates are received, it runs [validators](#validators) against the SHAs. 

It can be configured to monitor many Github repositories.

## Installation

First, install nodejs and npm. Checkout this codebase and change into the `nupic.tools` directory. Then, run the following `npm` command to install all the dependencies necessary to run this server.

    npm install .

## Running it

### Configuration

Default configuration settings are in the `./conf/config.yml` file. To provide instance-level settings, create a new config file using the username of the logged-in user. For example, mine is called `./conf/config-rhyolight.yml`. This is where you'll keep your instance configuration settings, like your production `host` and `port`. You can also add as many `monitors` as you wish. The key for each monitor should be the Github organization/repository name.

#### Monitors

Each monitor you add to the configuration will be used to register webhook urls with Github. The server listens for updates from Github webhooks, then runs all the [validators](#validators) in the `validators` directory when appropriate. This occurs when a pull request is opened, reopened, or synchronized. The status of the HEAD SHA of each pull request is also monitored, so when outside service update a status of a pull request, the validators rerun on the pull request. 

### Github API Credentials

The following environment variables are required for `nupic.tools` to run:

    export GH_USERNAME=<GH_USERNAME>
    export GH_PASSWORD=<GH_PASSWORD>

Github username and password are required to access the [Github API](http://developer.github.com/). The credentials used must have push access to the repository declared in the same section.

### Start the server:

    npm start

Now hit http://localhost:8081 (or whatever port you specified in the configuration file) and you should see a status page reporting what repositories are being monitored, as well as what extra services are provided by [HTTP Handlers](#http_handler_addons).

## Validators

Validators are modules stored in the `validators` directory, which follow the same export pattern. Each one exports a function called `validate` that will be passed the following arguments:

- `sha`: the SHA of the pull request's head
- `githubUser`: the Github login of the pull request originator
- `statusHistory`: an array of status objects from the [Github Status API](http://developer.github.com/v3/repos/statuses/) for the pull request's `head` SHA
- `repoClient`: an instance of `RepositoryClient` (see the `respoClient.js` file), which has some convenience methods as well as the underlying `github` object from the [node-github](https://github.com/ajaxorg/node-github) library (TODO: may want to get rid of the RepositoryClient class and just pass around the raw node-github api object.)
- `callback`: function to call when validation is complete. Expects an error and result object. The result object should contain at the least, a `state` attribute. It can also contain `description` and `target_url`, which will be used to create the new Github status

Each validator also exports a `name` so it can be identified for logging.

Additionally, each validator may export a `priority`. This should be a number which must be bigger or equal to 0. A higher number means a higher priority. This validator with the highest priority is used to set the `target_url` attribute of the object passed to the callback function. If the validator does not export a priority, it will default to 0.

You can add as many validators in the `validator` directory, and they will automatically be used. The current validators are:

- *travis*: Ensures the last travis status was 'success'
- *contributor*: Ensures pull request originator is within a contributor listing
- *fastForward*: Ensures the pull request `head` has the `master` branch merged into it

## HTTP Handler Addons

It's easy to create additional HTTP handlers for different URL patterns. Just create a module within the `handlers` directory that exports an object keyed by the URL pattern it should handle. The value for each key should be a function that returns a request handler function. This function will be given access to all repository clients for the monitors specified in the configuration, as well as all the other HTTP handlers within the application. The actual request handler function returned by this function will be given an HTTP Request and HTTP response object, node.js style.

## Running shell commands in response to Github hooks

For each `monitor` defined within the configuration file(s), you can provide a list of `hooks`, allowing you to run shell commands in response to Github hook events. For example:

    "monitors": {
        "organization/repository": {
            "hooks": [{
                "push": "/path/to/command.sh"
            }]
        }
    }

In this example, whenever `nupic.tools` gets a Github webhook for a `push` event against the `organization/repository` repo, the shell script `/path/to/command.sh` will be executed. Currently, no details about the event are passed into the shell script.

The NuPIC project uses this functionality to run a script that generates API documentation and publish it to the web (see `bin/generate_nupic_docs.sh`). Lists of commands can also be used instead of one string command.

## Make sure it stays running!

Scripts are provided within `./bin` to start, stop, and restart this program as a [forever](https://npmjs.org/package/forever) application.
