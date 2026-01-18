from flask import Blueprint, jsonify, request, current_app
from datetime import datetime
import pandas as pd

from services.excel_service import read_sheet, write_sheet, generate_id
from services.auth_service import require_roles

product_bp = Blueprint("products", __name__)

def _product_id_col(df: pd.DataFrame) -> str:
    if "product_id" in df.columns:
        return "product_id"
    if "id" in df.columns:
        return "id"
    return "product_id"

def _ensure_product_id_in_records(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    if "product_id" not in df.columns and "id" in df.columns:
        df = df.copy()
        df["product_id"] = df["id"]
    return df

@product_bp.get("/api/products")
def get_products():
    guard = require_roles(["staff", "manager"])
    if guard:
        return jsonify({"error": guard[0]}), guard[1]

    excel_path = current_app.config["EXCEL_PATH"]
    df = read_sheet(excel_path, "Products")
    df = _ensure_product_id_in_records(df)
    return jsonify(df.to_dict(orient="records"))

@product_bp.post("/api/products")
def add_product():
    guard = require_roles(["staff"])
    if guard:
        return jsonify({"error": guard[0]}), guard[1]

    data = request.json or {}
    excel_path = current_app.config["EXCEL_PATH"]
    df = read_sheet(excel_path, "Products")

    id_col = _product_id_col(df)
    new_id = generate_id(df, id_col)

    row = {
        "product_id": new_id,
        "id": new_id,
        "product_name": data["product_name"],
        "category": data["category"],
        "price": float(data["price"]),
        "quantity": int(data["quantity"]),
        "last_updated": datetime.now()
    }

    if not df.empty:
        if id_col == "product_id" and "id" not in df.columns:
            row.pop("id", None)
        if id_col == "id" and "product_id" not in df.columns:
            row.pop("product_id", None)

    df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
    write_sheet(excel_path, "Products", df)
    return jsonify({"message": "Product added", "product_id": new_id})

@product_bp.put("/api/products/<int:product_id>")
def update_product(product_id):
    guard = require_roles(["staff"])
    if guard:
        return jsonify({"error": guard[0]}), guard[1]

    data = request.json or {}
    excel_path = current_app.config["EXCEL_PATH"]
    df = read_sheet(excel_path, "Products")
    id_col = _product_id_col(df)

    if df.empty or id_col not in df.columns or df[df[id_col] == product_id].empty:
        return jsonify({"error": "Product not found"}), 404

    df.loc[df[id_col] == product_id, "product_name"] = data["product_name"]
    df.loc[df[id_col] == product_id, "category"] = data["category"]
    df.loc[df[id_col] == product_id, "price"] = float(data["price"])
    df.loc[df[id_col] == product_id, "quantity"] = int(data["quantity"])
    df.loc[df[id_col] == product_id, "last_updated"] = datetime.now()

    write_sheet(excel_path, "Products", df)
    return jsonify({"message": "Product updated"})

@product_bp.delete("/api/products/<int:product_id>")
def delete_product(product_id):
    guard = require_roles(["staff"])
    if guard:
        return jsonify({"error": guard[0]}), guard[1]

    excel_path = current_app.config["EXCEL_PATH"]
    df = read_sheet(excel_path, "Products")
    id_col = _product_id_col(df)

    if df.empty or id_col not in df.columns or df[df[id_col] == product_id].empty:
        return jsonify({"error": "Product not found"}), 404

    df = df[df[id_col] != product_id]
    write_sheet(excel_path, "Products", df)
    return jsonify({"message": "Product deleted"})
