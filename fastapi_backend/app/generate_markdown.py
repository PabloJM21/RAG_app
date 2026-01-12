import ast
import os


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

    with open(log_path, "r", encoding="utf-8") as f:
        for line in f:
            extra = parse_extra_from_line(line)
            if not extra:
                continue

            if extra.get("session_id") != session_id:
                continue

            task = extra.get("task")

            # ---------- HEADER 1 ----------
            if task == "header_1":
                log_text = line.split("|")[-2].strip()
                # print("log_text: ", log_text)
                if log_text:
                    md_lines.append(f"## {log_text}\n")



            # ---------- HEADER 2 ----------
            if task == "header_2":
                log_text = line.split("|")[-2].strip()
                # print("log_text: ", log_text)
                if log_text:
                    md_lines.append(f"## {log_text}\n")


            # ---------- TEXT INFO ----------
            elif task == "info_text":
                #print("detected info_text")
                log_text = line.split("|")[-2].strip()
                #print("log_text: ", log_text)
                if log_text:
                    md_lines.append(f"{log_text}\n")

            # ---------- VALIDATION ----------
            elif task == "validate":
                md_lines.append("Processed new task obtaining these results:\n")

                task_description = line.split("|")[-2].strip()
                outputs = extra.get("outputs", "")
                duration = extra.get("duration", "")
                score = extra.get("scores", "")

                md_lines.extend([
                    "| Field | Value |",
                    "|------|-------|",
                    f"| task description | {task_description} |",
                    f"| output | {outputs} |",
                    f"| duration | {duration} |",
                    f"| score | {score} |",
                    "",
                ])

            elif task == "summary_table":

                log_text = line.split("|")[-2].strip()
                md_lines.append(f"{log_text}\n")

                outputs = extra.get("outputs", "")



                # extra is expected to be a list of dicts (rows)
                if not isinstance(outputs, list) or not outputs or not all(isinstance(r, dict) for r in outputs):
                    md_lines.append("_Validation data is not tabular._\n")
                    continue

                # Convert rows -> columns
                columns = {}
                for row in outputs:
                    for k, v in row.items():
                        columns.setdefault(k, []).append(v)

                col_names = list(columns.keys())
                rows = zip(*columns.values())


                # Markdown table header
                md_lines.append("| " + " | ".join(col_names) + " |")
                md_lines.append("| " + " | ".join("---" for _ in col_names) + " |")

                # Table rows
                for row in rows:
                    md_lines.append("| " + " | ".join(str(cell) for cell in row) + " |")

                md_lines.append("")

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



