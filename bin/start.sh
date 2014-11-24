#!/bin/bash

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

tools_server="${script_dir}/../program.js"

# Forever is a node.js tool used to keep programs running.

printf "\nStarting: ${tools_server}"
forever start $tools_server -m 50

printf "\n\n"
forever list
