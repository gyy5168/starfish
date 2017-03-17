#!/usr/bin/env python

import os
root_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

import signal
import threading

from apnsclient import Session, APNs, Message

certificate = '%s/conf/starfish_cert_and_key.pem' % root_path


def test(session, message):
    con = session.get_connection("push_production", cert_file=certificate)
    res = APNs(con).send(message)
    print(res)
    # Check failures. Check codes in APNs reference docs.
    for token, reason in res.failed.items():
        code, errmsg = reason
        # according to APNs protocol the token reported here
        # is garbage (invalid or empty), stop using and remove it.
        print("Device failed: {0}, reason: {1}".format(token, errmsg))

    # Check failures not related to devices.
    for code, errmsg in res.errors:
        print("Error: {}".format(errmsg))

    # Check if there are tokens that can be retried
    if res.needs_retry():
        # repeat with retry_message or reschedule your task
        print(res.retry())


if __name__ == '__main__':
    signal.signal(signal.SIGTERM, signal.SIG_DFL)
    signal.signal(signal.SIGINT, signal.SIG_DFL)

    message = Message(
        ['671bcc7314b7b4e3118959800df7cda21395b81b191f689d4796f2cf877d8435'],
        alert="My message",
        badge=0)

    session = Session()

    for i in range(5):
        t = threading.Thread(target=test, args=(session, message))
        t.start()
