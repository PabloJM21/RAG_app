import ast
import os
from typing import Any, Dict, List, Optional, Iterable

def parse_extra_from_line(line: str) -> dict | None:
    """
    Extract and return the inner Loguru `extra` dict from a log line.
    Returns None if parsing fails or structure is invalid.
    """
    try:
        payload = line.rsplit("|", 1)[-1].strip()
        outer = ast.literal_eval(payload)

        if not isinstance(outer, dict):
            return None

        extra = outer.get("extra")
        if not isinstance(extra, dict):
            return None

        return extra

    except Exception:
        return None


def generate_markdown_from_log(
    log_path: str,
    output_md_path: str,
    session_id: str,
):
    if not os.path.exists(log_path):
        raise FileNotFoundError(f"Log file not found: {log_path}")

    md_lines = []
    md_dict = {"conversion": [], "chunking": [], "extraction": [], "retrieval": []}

    with open(log_path, "r", encoding="utf-8") as f:
        for line in f:
            extra = parse_extra_from_line(line)
            if not extra:
                continue

            if extra.get("session_id") != session_id:
                continue

            task = extra.get("task")
            stage = extra.get("stage")

            # ---------- HEADER 1 ----------
            if task == "header_1":
                log_text = line.split("|")[-2].strip()
                # print("log_text: ", log_text)
                if log_text:
                    md_dict[stage].append(f"# {log_text}\n")



            # ---------- HEADER 2 ----------
            if task == "header_2":
                log_text = line.split("|")[-2].strip()
                # print("log_text: ", log_text)
                if log_text:
                    md_dict[stage].append(f"## {log_text}\n")


            # ---------- TEXT INFO ----------
            elif task == "info_text":
                #print("detected info_text")
                log_text = line.split("|")[-2].strip()
                #print("log_text: ", log_text)
                if log_text:
                    md_dict[stage].append(f"{log_text}\n")

            # ---------- VALIDATION ----------
            elif task == "validate":
                md_dict[stage].append("Processed new task obtaining these results:\n")

                task_description = line.split("|")[-2].strip()
                outputs = extra.get("outputs", "")
                duration = extra.get("duration", "")
                score = extra.get("scores", "")

                md_dict[stage].extend([
                    "| Field | Value |",
                    "|------|-------|",
                    f"| task description | {task_description} |",
                    f"| output | {outputs} |",
                    f"| duration | {duration} |",
                    f"| score | {score} |",
                    "",
                ])

            elif task == "debug":
                # generate markdown for low level debugging

                pass



    with open(output_md_path, "w", encoding="utf-8") as out:
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
        try:
            # Extract the last pipe-separated part
            payload = line.rsplit("|", 1)[-1].strip()



            # Parse outer dict
            outer = ast.literal_eval(payload)

            if not isinstance(outer, dict):
                continue

            # Extract nested extra
            extra = outer.get("extra")

            if not isinstance(extra, dict):
                continue

            session_id = extra.get("session_id")

            if session_id:
                return session_id

        except Exception:
            # Ignore malformed lines safely
            continue

    return None



# ------------------ USAGE ------------------

async def export_logs(log_path, output_md) -> List[Dict[str, Any]]:
    

    # Write file to disk

    session_id = find_session_id(log_path)

    generate_markdown_from_log(
        log_path=log_path,
        output_md_path=output_md,
        session_id=session_id,
    )