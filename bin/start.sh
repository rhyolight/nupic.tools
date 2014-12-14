#!/bin/bash

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cwd=`pwd`
tools_server="${script_dir}/../index.js"

# Forever is a node.js tool used to keep programs running.

echo
echo "Starting: ${tools_server}"
forever start $tools_server -m 50

echo
forever list
