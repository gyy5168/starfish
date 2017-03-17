from queue import Full
from kafka import SimpleConsumer, MultiProcessConsumer
from kafka.consumer.base import FULL_QUEUE_WAIT_TIME_SECONDS, NO_MESSAGES_WAIT_TIME_SECONDS, \
    AUTO_COMMIT_MSG_COUNT, AUTO_COMMIT_INTERVAL
import time
import logging
from multiprocessing import Process
import os
log = logging.getLogger(__name__)


def _mp_consume_ex(client, group, topic, queue, size, events, **consumer_options):
    """
    A child process worker which consumes messages based on the
    notifications given by the controller process

    NOTE: Ideally, this should have been a method inside the Consumer
    class. However, multiprocessing module has issues in windows. The
    functionality breaks unless this function is kept outside of a class
    """
    consume_handler = consumer_options.pop('consume_handler', None)
    ppid = consumer_options.pop('ppid', None)

    # Make the child processes open separate socket connections
    client.reinit()

    # We will start consumers without auto-commit. Auto-commit will be
    # done by the master controller process.
    consumer = SimpleConsumer(client, group, topic,
                              auto_commit=False,
                              auto_commit_every_n=None,
                              auto_commit_every_t=None,
                              **consumer_options)

    # Ensure that the consumer provides the partition information
    consumer.provide_partition_info()

    while True:
        # Wait till the controller indicates us to start consumption
        events.start.wait()

        # If we are asked to quit, do so
        if events.exit.is_set():
            break

        # check parent process exists
        if os.getppid() != ppid:
            break

        # Consume messages and add them to the queue. If the controller
        # indicates a specific number of messages, follow that advice
        count = 0

        message = consumer.get_message()
        if message:
            while True:
                try:
                    # add consume_handler to handle each message in process.
                    if consume_handler:
                        consume_handler(partition=message[0],
                                        offset=message[1].offset,
                                        message=message[1].message)

                    queue.put(message, timeout=FULL_QUEUE_WAIT_TIME_SECONDS)
                    break
                except Full:
                    if events.exit.is_set():
                        break
                except Exception as e:
                    log.exception(e)
                    break

            count += 1

            # We have reached the required size. The controller might have
            # more than what he needs. Wait for a while.
            # Without this logic, it is possible that we run into a big
            # loop consuming all available messages before the controller
            # can reset the 'start' event
            if count == size.value:
                events.pause.wait()

        else:
            # In case we did not receive any message, give up the CPU for
            # a while before we try again
            time.sleep(NO_MESSAGES_WAIT_TIME_SECONDS)

    consumer.stop()


class MultiProcessConsumerEx(MultiProcessConsumer):
    def __init__(self, client, group, topic, auto_commit=True,
                 auto_commit_every_n=AUTO_COMMIT_MSG_COUNT,
                 auto_commit_every_t=AUTO_COMMIT_INTERVAL,
                 num_procs=1, partitions_per_proc=0,
                 consume_handler=None,
                 **simple_consumer_options):

        # Initiate the base consumer class
        super(MultiProcessConsumerEx, self).__init__(
            client, group, topic,
            partitions=None,
            auto_commit=auto_commit,
            auto_commit_every_n=auto_commit_every_n,
            auto_commit_every_t=auto_commit_every_t,
            num_procs=0, partitions_per_proc=0)

        # dict.keys() returns a view in py3 + it's not a thread-safe operation
        # http://blog.labix.org/2008/06/27/watch-out-for-listdictkeys-in-python-3
        # It's safer to copy dict as it only runs during the init.
        partitions = list(self.offsets.copy().keys())

        # By default, start one consumer process for all partitions
        # The logic below ensures that
        # * we do not cross the num_procs limit
        # * we have an even distribution of partitions among processes

        if partitions_per_proc:
            num_procs = int(len(partitions) / partitions_per_proc)
            if num_procs * partitions_per_proc < len(partitions):
                num_procs += 1

        # The final set of chunks
        chunks = [partitions[proc::num_procs] for proc in range(num_procs)]

        self.procs = []
        for chunk in chunks:
            options = {'partitions': list(chunk),
                       'consume_handler': consume_handler, 'ppid': os.getpid()
                       }
            if simple_consumer_options:
                simple_consumer_options.pop('partitions', None)
                options.update(simple_consumer_options)

            args = (client.copy(), self.group, self.topic, self.queue,
                    self.size, self.events)
            proc = Process(target=_mp_consume_ex, args=args, kwargs=options)
            proc.daemon = True
            proc.start()
            self.procs.append(proc)
