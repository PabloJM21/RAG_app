import ast
import os
from typing import Any, Dict, List, Optional, Iterable
from pathlib import Path
from loguru import logger
import re

def parse_extra_from_line(line: str) -> dict | None:
    """
    Extract and return the Loguru `extra` dict from a log line.
    Supports both:
      - {'extra': {...}}
      - {...}  (flat)
    """
    try:
        payload = line.rsplit("|", 1)[-1].strip()
        data = ast.literal_eval(payload)

        logger.info(f"Has data in extra: {data}")

        if not isinstance(data, dict):
            return None


        # Case 2: flat extra dict (your current logs)
        return data

    except Exception:
        return None


def rows_to_columns(rows):

    if not rows:
        return {}
    cols = rows[0].keys()
    out = {c: [] for c in cols}
    for row in rows:
        for c in cols:
            out[c].append(row[c])

    return out

LOG_START = re.compile(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \|") #A timestamp at the beginning of a line

def group_logs(lines):
    logs = []
    current = []

    for line in lines:
        if LOG_START.match(line):
            # If we were collecting a previous log, save it
            if current:
                logs.append("".join(current).rstrip())
                current = []
        current.append(line)

    # Add the last log if present
    if current:
        logs.append("".join(current).rstrip())

    return logs




def generate_markdown_from_log(
    log_path: str,
    session_id: str,
):


    md_line_dict = {}
    output_dir = Path(log_path).parent
    logger.info(f"Generating markdown for output dir: {output_dir}")

    stage = os.path.basename(log_path).split(".")[0]

    def get_max_depth(text):
        max_depth = 1
        for text_line in text:
            line_extra = parse_extra_from_line(text_line)
            if not line_extra:
                continue

            if line_extra.get("session_id") != session_id:
                continue
            current_depth = line_extra.get("depth")
            if current_depth > max_depth:
                max_depth = current_depth

        return max_depth


    def append_line(input_depth, input_line):
        """
        Append line to MD record of all logging depths >= input_depth
        """
        for higher_depth in range(input_depth, depth_limit + 1):
            md_line_dict.setdefault(higher_depth, []).append(input_line)
            logger.info(f"Line appended for depth: {higher_depth}")

    with open(log_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        lines = group_logs(lines)

        depth_limit = get_max_depth(lines)

        for line in lines:
            logger.info(f"New line: {line}")
            extra = parse_extra_from_line(line)
            logger.info(f"Has extra: {extra}")
            if not extra:
                continue


            current_session_id = extra.get("session_id")
            logger.info(f"found session_id: {current_session_id}, comparing it to {session_id}")

            if extra.get("session_id") != session_id:
                continue

            task = extra.get("task")
            depth = extra.get("depth")
            logger.info(f"found task: {task} and depth {depth}")

            # ---------- HEADER 1 ----------
            if task == "header_1":
                log_text = line.split("|")[-2].strip()
                if log_text:
                    append_line(depth, f"# {log_text}\n")




            # ---------- HEADER 2 ----------
            elif task == "header_2":
                log_text = line.split("|")[-2].strip()
                if log_text:
                    append_line(depth,f"## {log_text}\n")



            # ---------- TEXT INFO ----------
            elif task == "info_text":
                log_text = line.split("|")[-2].strip()
                if log_text:
                    logger.info(f"Detected info_text, appending line: {log_text}")
                    append_line(depth, f"{log_text}\n")

            # ---------- VALIDATION ----------
            elif task == "table":
                log_text = line.split("|")[-2].strip()
                append_line(depth, f"{log_text}\n")

                columns = extra.get("table_data")
                if isinstance(columns, list):
                    columns = rows_to_columns(columns)

                for key, value in columns.items():
                    if not isinstance(value, (list, tuple)):
                        columns[key] = [str(value)]

                col_names = list(columns.keys())
                rows = zip(*columns.values())

                # Markdown table header
                append_line(depth, "| " + " | ".join(col_names) + " |")
                append_line(depth, "| " + " | ".join("---" for _ in col_names) + " |")

                # Table rows
                for row in rows:
                    append_line(depth, "| " + " | ".join(str(cell) for cell in row) + " |")

                append_line(depth,"")

            else:


                pass


    for depth, md_lines in md_line_dict.items():
        output_path = output_dir / f"{stage}_depth_{depth}.md"
        logger.info(f"Trying to write to path: {output_path}")
        with open(output_path, "w", encoding="utf-8") as out:
            out.write("\n".join(md_lines))


def find_session_id(log_path: str) -> str | None:
    """
    Reads the log file from the end and returns the first session_id found.
    Handles nested Loguru `{'extra': {...}}` structure.
    """
    if not os.path.exists(log_path):
        return None

    with open(log_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    for line in reversed(lines):

        extra = parse_extra_from_line(line)

        session_id = extra.get("session_id")

        if session_id:
            return session_id



    return None



# ------------------ USAGE ------------------

async def export_logs(log_path: str):
    

    # Write file to disk

    session_id = find_session_id(log_path)

    generate_markdown_from_log(
        log_path=log_path,
        session_id=session_id,
    )