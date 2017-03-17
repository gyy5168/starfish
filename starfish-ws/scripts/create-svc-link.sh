#!/usr/bin/bash

set -e

SCRIPTS_DIR="/opt/mos/codebase/starfish-ws/scripts"

for i in `ls $SCRIPTS_DIR | grep '\-run'`;
do
    echo "${SCRIPTS_DIR}/${i}"
    # cd /service && ln -s "${SCRIPTS_DIR}/${i}" .
done;
