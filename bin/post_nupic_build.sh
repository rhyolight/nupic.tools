#!/bin/bash

## 
# This script is to be executed by the tooling server every time there is a 
# successful build of the nupic master branch. It is currently used to:
# - update the sha in nupic.regression of the latest commit pushed
# - update the sha in nupic.research of the latest commit pushed
#
## Assumptions
#
# - numenta/nupic is checked out somewhere within reach cloned from  
#   git@github.com:numenta/nupic.git as `upstream`.
#   - $NUPIC points to the location of this checkout.
#
# - numenta/nupic.regression is checked out out somewhere within reach cloned from
#   git@github.com:numenta/nupic.regression.git as `upstream`.
#   - $NUPIC_REGRESSION points to the location of this checkout.

if [ -z "$NUPIC" ]; then
    echo "In order for this script to run properly, you must have the "
    echo "\$NUPIC environment variable set to the numenta/nupic checkout."
    exit 1
fi
if [ -z "$NUPIC_REGRESSION" ]; then
    echo "In order for this script to run properly, you must have the "
    echo "\$NUPIC_REGRESSION environment variable set to the numenta/nupic.regression checkout."
    exit 1
fi
if [ -z "$NUPIC_RESEARCH" ]; then
    echo "In order for this script to run properly, you must have the "
    echo "\$NUPIC_RESEARCH environment variable set to the numenta/nupic.research checkout."
    exit 1
fi

cwd=`pwd`

cd $NUPIC
git pull upstream master
sha=`git log -1 --pretty=oneline | sed -E "s/^([^[:space:]]+).*/\1/" | tr -d ' '`
echo
echo "Updating nupic.regression with newest commit sha on master..."
echo
cd $NUPIC_REGRESSION
git fetch upstream
git merge upstream/master --no-edit
echo $sha > nupic_sha.txt
git add nupic_sha.txt
git commit -m "Automated update of nupic master sha to ${sha}."
git push upstream master
echo 
echo "Done updating nupic.regression."
echo

echo
echo "Updating nupic.research with newest commit sha on master..."
echo
cd $NUPIC_RESEARCH
git fetch upstream
git merge upstream/master --no-edit
echo $sha > nupic_sha.txt
git add nupic_sha.txt
git commit -m "Automated update of nupic master sha to ${sha}."
git push upstream master
echo 
echo "Done updating nupic.research."
echo

cd $cwd
