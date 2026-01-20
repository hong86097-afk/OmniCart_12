import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "change-this-secret-key")
    EXCEL_PATH = os.path.join(BASE_DIR, "database", "inventory.xlsx")
