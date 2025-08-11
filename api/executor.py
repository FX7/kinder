from concurrent.futures import ThreadPoolExecutor
import os
import time

class ExecutorManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = ThreadPoolExecutor(max_workers=int(os.environ.get('KT_EXECUTOR_WORKERS', '5')))

        return cls._instance
    
    @staticmethod
    def repeat(interval: int, method, *args):
        def _repeat():
            while True:
                method(*args)
                time.sleep(interval) 

        ExecutorManager().submit(_repeat)