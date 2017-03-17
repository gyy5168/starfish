import queue
import sys
from threading import Thread

import logging

log = logging.getLogger(__name__)


class Worker(Thread):
    ''' working thread'''
    worker_count = 0
    # timeout = 1

    def __init__(self, work_queue, result_queue, name, timeout, **kwargs):
        super(Worker, self).__init__(**kwargs)
        self.id = Worker.worker_count
        Worker.worker_count += 1

        self.setDaemon(True)
        self.work_queue = work_queue
        self.result_queue = result_queue
        self.name = name
        self.timeout = timeout

    def run(self):
        ''''' the get-some-work, do-some-work main loop of worker threads '''
        while True:
            try:
                handler, job_id, args, kwargs = self.work_queue.get(timeout=self.timeout)
                res = handler(*args, **kwargs)
                self.result_queue.put((job_id, res))
            except queue.Empty:
                break
            except Exception as e:
                log.error('Worker(Thread) error worker[%s, id:%d], %s, %s'
                          % (self.name, self.id, sys.exc_info()[:2], e))
                continue


class WorkerManager(object):
    def __init__(self, num_of_workers=2, timeout=None, name='wm', start_as_init=True):
        '''
        num_of_workers: thread count,
        timeout: in seconds, or None means threads are blocked and waiting for more jobs
        name: worker manager's name
        start_as_init: start as init worker manager.
        '''
        self.work_queue = queue.Queue()
        self.result_queue = queue.Queue()
        self.workers = []
        self.timeout = timeout
        self.name = name
        self.recruit_threads(num_of_workers, start_as_init)

    def recruit_threads(self, num_of_workers, start_as_init):
        for i in range(num_of_workers):
            worker = Worker(
                self.work_queue,
                self.result_queue,
                name=self.name,
                timeout=self.timeout
            )
            self.workers.append(worker)
            if start_as_init:
                worker.start()

    def wait_for_complete(self):
        # ...then, wait for each of them to terminate:  
        while len(self.workers):
            worker = self.workers.pop()
            worker.join()
            if worker.isAlive() and not self.work_queue.empty():
                self.workers.append(worker)

    def add_job(self, handler, job_id, *args, **kwargs):
        self.work_queue.put((handler, job_id, args, kwargs))

    def start(self):
        for worker in self.workers:
            worker.start()

    def get_result(self, *args, **kwargs):
        return self.result_queue.get(*args, **kwargs)

    def get_result_dict(self):
        res_dict = {}
        while True:
            try:
                job_id, res = self.result_queue.get(block=False)
                res_dict[job_id] = res
            except queue.Empty:
                break
        return res_dict
