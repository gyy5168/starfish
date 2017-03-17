#!/bin/bash
# run as postgres user at in-102-bj

set -x -e

# $1 => start org id (>=)
# $2 => end org id (<=)
# $3 => starfish_prod_org_00000001's host name, etc. in-200-gd
# $4 => template db's name, etc. starfish_prod_org_00000001
# example:
# /opt/mos/codebase/starfish-ws/scripts/create-new-org-db.sh 507 600 in-200-gd starfish_prod_org_00000456
# /opt/mos/codebase/starfish-ws/scripts/create-new-org-db.sh 600 650 in-106-bj starfish_prod_org_00000001

if [ "$#" -ne 4 ]; then
    echo "Illegal number of parameters"
    exit
fi

pg_dump -Cs -h $3 -Umos $4 > /tmp/starfish-org-db.sql.tpl

# 必须是单引号
INIT_SQL="
INSERT INTO acl_role (id, name, is_system) VALUES (10001, '管理员', 1);
SELECT * FROM acl_role;
"

for i in $(seq -f "%08g" $1 $2)
do
    new_db_name="starfish_prod_org_${i}"
    echo "------------------ create db: ${new_db_name} ------------------"
    sed -e "s/$4/${new_db_name}/g" /tmp/starfish-org-db.sql.tpl > /tmp/starfish-org-db.sql
    echo "$INIT_SQL" >> /tmp/starfish-org-db.sql
    psql -f /tmp/starfish-org-db.sql postgres
    sleep 10
done

echo "please update settings.py!!!"
