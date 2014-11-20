#!/bin/bash

# start the ssh-agent in the background
eval "$(ssh-agent -s)"
ssh-add /keys/id_numenta-ci
echo "Key added... testing github connection..."
ssh -T git@github.com
