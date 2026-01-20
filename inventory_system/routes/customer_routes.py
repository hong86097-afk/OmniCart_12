from flask import Blueprint, jsonify, request, current_app
from datetime import datetime
import pandas as pd

from services.excel_service import read_sheet, write_sheet, generate_id
from services.auth_service import require_roles

customer_bp = Blueprint("customers", __name__)

@customer_bp.get("/api/customers")
def get_customers():
    guard = require_roles(["staff", "manager"])
    if guard: return jsonify({"error": guard[0]}), guard[1]

    excel_path = current_app.config["EXCEL_PATH"]
    df = read_sheet(excel_path, "Customers")
    return jsonify(df.to_dict(orient="records"))

@customer_bp.post("/api/customers")
def add_customer():
    guard = require_roles(["staff"])
    if guard: return jsonify({"error": guard[0]}), guard[1]

    data = request.json or {}
    excel_path = current_app.config["EXCEL_PATH"]
    df = read_sheet(excel_path, "Customers")

    new_id = generate_id(df, "customer_id")
    row = {
        "customer_id": new_id,
        "customer_name": data["customer_name"],
        "phone": data["phone"],
        "created_date": datetime.now()
    }

    df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
    write_sheet(excel_path, "Customers", df)
    return jsonify({"message": "Customer added", "customer_id": new_id})
