from typing import Any, Dict, List, Optional, Iterable
import os
import sys

import uuid
import ast


from loguru import logger as base_logger


class InfoLogger:
    def __init__(self, log_path: str, stage: str):
        self.log_path = log_path
        self.stage = stage
        self.session_id = self.generate_unique_session_id()

        # Create an isolated logger instance for this stage
        self.logger = base_logger.bind(stage=self.stage)

        # Remove handlers ONLY from this cloned logger
        self.logger = self.logger.opt(depth=1)
        self.logger.remove()

        # Console sink
        self.logger.add(
            sys.stderr,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
                   "<cyan>{level: <8}</cyan> | "
                   "<yellow>{name}</yellow>:<yellow>{function}</yellow>:<yellow>{line}</yellow> - "
                   "{message} | {extra}",
            backtrace=True,
            diagnose=True,
            enqueue=True,
        )

        # File sink (unique per stage)
        self.logger.add(
            self.log_path,
            rotation="2.5 MB",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message} | {extra}",
            enqueue=True,
        )


        # Console sink (stderr)
        self.logger.add(
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
        self.logger.add(
            self.log_path,
            rotation="2.5 MB",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message} | {extra}",
            enqueue=True,
        )




    def get_existing_session_ids(self) -> set[str]:


        session_ids = set()
        if os.path.exists(self.log_path):
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
        log_text: Optional[str] = "",
        task: Optional[str] = "info_text",
        table_data: Optional[Dict[str, Any]] = None):

        """
        Log full arrays to file and console.
        """

        extra_message = {
            "session_id": self.session_id,
            "task": task,
            "table_data": table_data}

        self.logger.info(log_text, extra=extra_message)







            

