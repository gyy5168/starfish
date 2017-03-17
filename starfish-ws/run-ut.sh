#!/bin/bash

if [[ -z $1 ]]; then
    export DJANGO_ENV=unittest-sqlite3; python3 -W ignore manage.py test apps
else
    export DJANGO_ENV=unittest-sqlite3; python3 -W ignore manage.py test $1
fi
