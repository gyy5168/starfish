import psycopg2


sql = """
"""

for i in range(1, 33):
    conn_string = \
        "host='in-102-bj' dbname='starfish_prod_org_%08d' user='mos' password='mos517nrm'" % i
    conn = psycopg2.connect(conn_string)
    cursor = conn.cursor()
    cursor.execute(sql)
    cursor.close()
    conn.commit()
    conn.close()
