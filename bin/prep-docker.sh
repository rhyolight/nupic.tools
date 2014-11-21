#!/bin/bash

# start the ssh-agent in the background
eval "$(ssh-agent -s)"
ssh-add /keys/docker
# Manually set up authorized_keys
mkdir ~/.ssh
chmod 700 ~/.ssh
cat /keys/docker.pub > ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

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

cd ${NUPIC}
git remote set-url git@github.com:numenta/nupic.git
git pull origin master

cd ${NUPIC_CORE}
git remote set-url git@github.com:numenta/nupic.core.git
git pull origin master

cd ${NUPIC_REGRESSION}
git remote set-url git@github.com:numenta/nupic.regression.git
git pull origin master

cd ${NUPIC_RESEARCH}
git remote set-url origin git@github.com:numenta/nupic.research.git
git pull origin master

cd ${HTM_JAVA}
git remote set-url git@github.com:numenta/htm.java.git
git pull origin master

cd ${NUMENTA_ORG}
git remote set-url git@github.com:numenta/numenta.org.git
git pull origin gh-pages