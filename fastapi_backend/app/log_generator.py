from typing import Any, Dict, List, Optional, Iterable
import os
import sys

import uuid
import ast

#logger
from loguru import logger
import random
from datetime import datetime


# Allow overriding log level via env var (default = INFO)
#LOG_LEVEL = os.getenv("LOG_LEVEL", "DEBUG").upper()   # add level=LOG_LEVEL if other than INFO wanted

class InfoLogger:
    def __init__(self):



        # -----------------------------------
        # path definition
        # -----------------------------------
        log_dir = os.path.abspath("./logs") #os.path.join(BASE_DIR, "logs")
        os.makedirs(log_dir, exist_ok=True)
        self.log_path = os.path.join(log_dir, "validate.log")

        # -----------------------------------
        # session identification
        # -----------------------------------

        self.session_id = self.generate_unique_session_id()


        # -----------------------------------
        # Logger initialization
        # -----------------------------------

        logger.remove()  # clear default handlers

        # Console sink (stderr)
        logger.add(
            sink=sys.stderr,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
                   "<cyan>{level: <8}</cyan> | "
                   "<yellow>{name}</yellow>:<yellow>{function}</yellow>:<yellow>{line}</yellow> - "
                   "{message} | {extra}",
            backtrace=True,
            diagnose=True,
            enqueue=True,
        )

        # Validate sink
        logger.add(
            self.log_path,
            rotation="2.5 MB",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message} | {extra}",
            enqueue=True,
        )

        # Old: Debug sink
        # os.path.join(LOG_DIR, "debug.log")
        # filter=lambda record: record["extra"].get("channel") == "debug"
        # filter=lambda record: record["extra"].get("channel") == "validate"
        # self.DebugLogger = logger.bind(channel="info_text")
        # self.ValidateLogger = logger.bind(channel="validate")







    def get_existing_session_ids(self) -> set[str]:


        session_ids = set()

        with open(self.log_path, "r", encoding="utf-8") as f:
            for line in f:
                if "|" not in line:
                    continue

                try:
                    extra_part = line.rsplit("|", 1)[-1].strip()
                    extra_dict = ast.literal_eval(extra_part)
                    sid = extra_dict.get("session_id")
                    if sid:
                        session_ids.add(sid)
                except Exception:
                    # malformed line → ignore safely
                    continue

        return session_ids

    def generate_unique_session_id(self) -> str:
        existing_ids = self.get_existing_session_ids()

        while True:
            session_id = str(uuid.uuid4())
            if session_id not in existing_ids:
                return session_id






    def log_step(
        self,
        stage: Optional[str] = "",
        strategy: Optional[str] = "",
        log_text: Optional[str] = "",
        inputs: Optional[Any] = None,
        outputs: Optional[Any] = None,
        scores: Optional[List[float]] = None,
        duration: Optional[str] = "",
        task: Optional[str] = "info_text"):

        """
        Log full input/output arrays to file and console.
        """







        extra_message = {
            "session_id": self.session_id,
            "task": task,
            "stage": stage,  # The Pipeline Stage (@indexing, @extraction, retrieval)
            "strategy": strategy,
            "inputs": inputs,
            "outputs": outputs,
            "scores": scores,
            "duration": duration}




        # --- File/Console logging ---


        if task == "validate":
            logger.success(log_text, extra=extra_message)

        elif task == "debug":
            logger.debug(log_text, extra=extra_message)



        elif task == "summary_table":
            extra_message = {
                "session_id": self.session_id,
                "task": task,
                "outputs": outputs}

            logger.info(log_text, extra=extra_message)

        else:
            # info_text, header_1, header_2
            logger.info(log_text, extra=extra_message)







            

