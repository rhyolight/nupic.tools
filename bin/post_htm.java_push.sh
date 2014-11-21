#!/bin/bash

##
# This script is to be executed by the tooling server every time there is a push
# to htm.java master branch. It is currently used to:
# - Generate and publish javadocs to numenta.org/docs/htm.java/
#
## Assumptions
#
# - Hub is installed: https://hub.github.com. This is used to create pull
#   requests in Github.
#
# - numenta/htm.java is checked out somewhere within reach cloned from
#   git@github.com:numenta/htm.java.git as `origin`.
#   - $HTM_JAVA points to the location of this checkout.
#
# - numenta/numenta.org repository is checked out from
#   git@github.com:numenta/numenta.org.git as `upstream`.
#   - $NUMENTA_ORG points to the location of this checkout

if [ -z "$HTM_JAVA" ]; then
    echo "In order for this script to run properly, you must have the "
    echo "\$HTM_JAVA environment variable set to the numenta/htm.java checkout."
    exit 1
fi
if [ -z "$NUMENTA_ORG" ]; then
    echo "In order for this script to run properly, you must have the "
    echo "\$NUMENTA_ORG environment variable set to the numenta/numenta.org checkout."
    exit 1
fi

cwd=`pwd`

echo
echo "Building htm.java javadocs..."
echo

cd $HTM_JAVA

echo
echo "Checking out numenta/htm.java master branch for javadoc build..."
git checkout master
git pull origin master
./jdoc.sh

echo "Checking out numenta/numenta.org gh-pages branch for documentation push..."
cd $NUMENTA_ORG
git fetch upstream
git merge upstream/gh-pages --no-edit
# move html directories into right place
rm -rf docs/htm.java
cp -r $HTM_JAVA/doc $NUMENTA_ORG/docs/htm.java
# add new docs
git add docs
# commit new docs
git commit -m "NuPIC javadoc automated doc build for htm.java."
# push new docs
git push upstream gh-pages

echo
echo "Done building and pushing new docs."
echo

cd $cwd
