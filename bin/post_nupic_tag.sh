#!/bin/bash

##
# This script is to be executed by the tooling server every time there is a tag
# on nupic. It is currently used to:
# - do nothing
#
## Assumptions
#
# - numenta/nupic is checked out somewhere within reach cloned from
#   git@github.com:numenta/nupic.git as `upstream`.
#   - $NUPIC points to the location of this checkout.
#

if [ -z "$NUPIC" ]; then
    echo "In order for this script to run properly, you must have the "
    echo "\$NUPIC environment variable set to the numenta/nupic checkout."
    exit 1
fi

cwd=`pwd`

echo
echo "Releasing NuPIC..."
echo

