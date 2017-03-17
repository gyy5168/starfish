import json
import pika
import logging

log = logging.getLogger(__name__)


class RabbitMqUtils(object):
    def __init__(self, queue, **kwargs):
        self.queue = queue

        credentials = pika.credentials.PlainCredentials(kwargs['username'],
                                                        kwargs['password'])

        self.connection = pika.BlockingConnection(pika.ConnectionParameters(
            host=kwargs['host'],
            port=kwargs['port'],
            credentials=credentials))

        self.channel = self.connection.channel()
        self.channel.queue_declare(queue=self.queue, durable=True)

    def publish(self, data):
        s = json.dumps(data).encode('utf-8')
        self.channel.basic_publish(exchange='',
                                   routing_key=self.queue,
                                   body=s)
        log.info(" RabbitMQ[%s] --sent-- %s" % (self.queue, s))

    def receive(self, callback=None, no_ack=False):
        def _callback(ch, method, properties, body):
            # log.info("RabbitMQ[%s] received %s" % (self.queue, body,))
            if not no_ack:
                ch.basic_ack(delivery_tag=method.delivery_tag)

        self.channel.basic_consume(callback or _callback, queue=self.queue)
        log.info(" RabbitMQ[%s] --start consume--" % self.queue)
        self.channel.start_consuming()

    def __del__(self):
        self.connection.close()
