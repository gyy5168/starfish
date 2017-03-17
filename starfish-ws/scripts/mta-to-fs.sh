#!/bin/bash

. /opt/mos/python-env/bin/activate

export LANG="en_US.utf8"
export LC_ALL="en_US.UTF-8"
export LC_LANG="en_US.UTF-8"

export DJANGO_ENV=script
cd /opt/mos/codebase/starfish-ws/scripts
python mta-to-fs.py >> /mnt1/logs/starfish-mta-to-fs.log 2>&1
