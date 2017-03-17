import psycopg2


sql = """
alter table uc_user add column "summary_update_at" integer CHECK ("summary_update_at" >= 0) default 0;
CREATE INDEX "uc_user_summary_update_at" ON "uc_user" ("summary_update_at");
"""

conn_string = \
    "host='in-102-bj' dbname='starfish_prod_main' user='mos' password='mos517nrm'"
conn = psycopg2.connect(conn_string)

cursor = conn.cursor()
cursor.execute(sql)

conn.commit()
conn.close()
