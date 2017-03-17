#!/bin/bash

. /opt/mos/python-env/bin/activate

export DJANGO_ENV=script
cd /opt/mos/codebase/starfish-ws/docs
python build.py >> /mnt1/logs/starfish-build-doc.log 2>&1
