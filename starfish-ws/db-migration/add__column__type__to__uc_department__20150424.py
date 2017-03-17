import psycopg2
# from django.conf import settings

sql = """
alter table uc_department add column "type" smallint CHECK ("type" >= 0) NOT NULL default 0;
"""

for i in range(1, 1001):
    print(i)
    conn_string = \
        "host='in-102-bj' dbname='starfish_prod_org_%08d' user='mos' password='mos517nrm'" % i
    conn = psycopg2.connect(conn_string)
    cursor = conn.cursor()
    cursor.execute(sql)
    cursor.close()
    conn.commit()
    conn.close()
