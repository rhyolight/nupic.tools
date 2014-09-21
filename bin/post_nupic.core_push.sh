#!/bin/bash

##
# This script is to be executed by the tooling server every time there is a push
# to nupic.core master branch. It is currently used to:
# - Create a NuPIC PR that updates to the latest nupic.core SHA
#
## Assumptions
#
# - Hub is installed: https://hub.github.com. This is used to create pull
#   requests in Github.
#
# - numenta/nupic is checked out somewhere within reach cloned from
#   git@github.com:numenta/nupic.git as `origin`.
#   - $NUPIC points to the location of this checkout.
#
# - numenta/nupic.core is checked out out somewhere within reach cloned from
#   git@github.com:numenta/nupic.core.git as `origin`.
#   - $NUPIC_CORE points to the location of this checkout.

if [ -z "$NUPIC" ]; then
    echo "In order for this script to run properly, you must have the "
    echo "\$NUPIC environment variable set to the numenta/nupic checkout."
    exit 1
fi
if [ -z "$NUPIC_CORE" ]; then
    echo "In order for this script to run properly, you must have the "
    echo "\$NUPIC_CORE environment variable set to the numenta/nupic.core checkout."
    exit 1
fi

cwd=`pwd`

echo
echo "Creating PR for new nupic.core SHA..."
echo


cd ${NUPIC_CORE}
git pull upstream master
SHA=`git log -1 --pretty=oneline | sed -E "s/^([^[:space:]]+).*/\1/" | tr -d ' '`
cd ${NUPIC}
git pull upstream master
echo Deleting any existing local branch for this SHA...
git branch -D core-update-${SHA}
git checkout -b core-update-${SHA}

echo Deleting existing remote branch core-update-sha
git push origin :core-update-sha

echo Fetching existing SHA...
EXISTING_SHA=`grep -oh "[0-9a-f]\{40\}" .nupic_modules`

echo Replacing existing SHA in .nupic_modules with ${SHA}...
sed -i -e "s#${EXISTING_SHA}#${SHA}#g" .nupic_modules
git add .nupic_modules
echo Committing new .nupic_modules file...
git commit -m "Updates nupic.core to ${SHA}."
echo Pushing to remote branch...
git push origin core-update-${SHA}:core-update-sha
echo Attempting pull request creation...
hub pull-request -m "Updates nupic.core to latest built SHA.

See https://github.com/numenta/nupic.core/compare/${SHA}...${EXISTING_SHA} for details." -h "numenta-ci/nupic:core-update-sha" -b "numenta/nupic:master"
echo Back to master branch.
git checkout master

echo
echo "Done creating PR for new nupic.core SHA."
echo

cd $cwd
