import os
import pandas as pd
from datetime import datetime

def read_sheet(excel_path, sheet_name):
    if not os.path.exists(excel_path):
        raise FileNotFoundError(f"Excel file not found: {excel_path}")

    ext = os.path.splitext(excel_path)[1].lower()
    engine = "openpyxl" if ext == ".xlsx" else None

    return pd.read_excel(excel_path, sheet_name=sheet_name, engine=engine)


def write_sheet(excel_path, sheet_name, df):
    if not os.path.exists(excel_path):
        raise FileNotFoundError(f"Excel file not found: {excel_path}")

    with pd.ExcelWriter(excel_path, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
        df.to_excel(writer, sheet_name=sheet_name, index=False)


def generate_id(df, id_col="id"):
    if df is None or df.empty or id_col not in df.columns:
        return 1

    s = pd.to_numeric(df[id_col], errors="coerce").dropna()
    return 1 if s.empty else int(s.max()) + 1


def now_utc_string():
    return datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT")
