import ast
import os
from typing import Any, Dict, List, Optional, Iterable
from pathlib import Path
from loguru import logger
import re






# ------- HELPERS -------------


UUID_RE = re.compile(r"UUID\('([0-9a-fA-F-]+)'\)")
import ast
import textwrap

def escape_md_cell(text: str) -> str:
    return text.replace("|", r"\|")

def wrap_cell(text: str, max_width: int) -> str:
    wrapped = textwrap.wrap(text, width=max_width) or [""]
    return "\n".join(wrapped)



def parse_extra_from_line(line: str) -> dict | None:
    """Extract and return the Loguru extra dict from a log line.

    Supports both:
    - {'extra': {...}}
    - {...} (flat)
    """



    try:
        payload = line.split("|", 3)[-1].strip()
        payload = UUID_RE.sub(r"'\1'", payload)

        data = ast.literal_eval(payload)


        #logger.info(f"Has data in extra: {data}")

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


# --------------- MAIN FUNCTIONS --------------------------------




def generate_markdown_from_log(
    log_path: str,
    session_id: str,
):


    md_line_dict = {}
    output_dir = Path(log_path).parent
    ##logger.info(f"Generating markdown for output dir: {output_dir}")

    stage = os.path.basename(log_path).split(".")[0]




    def append_line(input_layer, input_line):
        """
        Append line to MD record of all logging layers <= input_layer
        """
        for previous_layer in range(1, input_layer + 1):

            md_line_dict.setdefault(previous_layer, []).append(input_line)
            #logger.info(f"Line appended for layer: {previous_layer}")




    with open(log_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        lines = group_logs(lines)


        for line in lines:
            #logger.info(f"New line: {line}")
            extra = parse_extra_from_line(line)
            #logger.info(f"Has extra: {extra}")
            if not extra:
                continue


            current_session_id = extra.get("session_id")
            #logger.info(f"found session_id: {current_session_id}, comparing it to {session_id}")

            if extra.get("session_id") != session_id:
                continue

            task = extra.get("task")
            layer = extra.get("layer")
            #logger.info(f"found task: {task} and layer {layer}")

            # ---------- HEADER 1 ----------
            if task == "header_1":
                log_text = line.split("|", 3)[-2].strip()
                if log_text:
                    append_line(layer, f"# {log_text}\n")




            # ---------- HEADER 2 ----------
            elif task == "header_2":
                log_text = line.split("|", 3)[-2].strip()
                if log_text:
                    append_line(layer,f"## {log_text}\n")


            elif task == "header_3":
                log_text = line.split("|", 3)[-2].strip()
                if log_text:
                    append_line(layer,f"### {log_text}\n")


            elif task == "header_4":
                log_text = line.split("|", 3)[-2].strip()
                if log_text:
                    append_line(layer,f"#### {log_text}\n")



            # ---------- TEXT INFO ----------
            elif task == "info_text":
                log_text = line.split("|", 3)[-2].strip()
                if log_text:
                    #logger.info(f"Detected info_text, appending line: {log_text}")
                    append_line(layer, f"{log_text}\n")

            # ---------- VALIDATION ----------
            elif task == "table":
                log_text = line.split("|", 3)[-2].strip()
                if log_text:
                    append_line(layer, f"{log_text}\n")

                append_line(layer, "\n")

                columns = extra.get("table_data")
                if isinstance(columns, list):
                    columns = rows_to_columns(columns)

                for key, value in columns.items():
                    if not isinstance(value, (list, tuple)):
                        columns[key] = [str(value)]
                    else:
                        columns[key] = [str(v) for v in value]

                col_names = list(columns.keys())
                rows = list(zip(*columns.values()))

                # Compute max column width (based on content and header)
                max_widths = []
                for i, col in enumerate(col_names):
                    max_len = max(
                        [len(col)] +
                        [len(str(row[i])) for row in rows]
                    )
                    max_widths.append(max_len)

                # Markdown table header
                append_line(layer, "| " + " | ".join(col_names) + " |")
                append_line(layer, "| " + " | ".join("---" for _ in col_names) + " |")

                # Table rows
                for row in rows:
                    rendered_cells = []
                    for i, cell in enumerate(row):
                        cell = escape_md_cell(str(cell))
                        cell = wrap_cell(cell, max_widths[i])
                        rendered_cells.append(cell)

                    append_line(layer, "| " + " | ".join(rendered_cells) + " |")

                append_line(layer, "")


            else:


                pass


    for layer, md_lines in md_line_dict.items():
        output_path = output_dir / f"{stage}_layer_{layer}.md"
        #logger.info(f"Trying to write to path: {output_path}")
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

    lines = group_logs(lines)
    for line in reversed(lines):

        #logger.info(f"Processing reversed line: {line}")

        extra = parse_extra_from_line(line)
        #logger.info(f"Obtained extra: {extra}")

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