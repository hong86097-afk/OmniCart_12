from flask import Blueprint, jsonify, request, current_app
from datetime import datetime
import pandas as pd

from services.excel_service import read_sheet, write_sheet, generate_id
from services.auth_service import require_roles

sales_bp = Blueprint("sales", __name__)

@sales_bp.get("/api/sales")
def get_sales():
    guard = require_roles(["staff", "manager"])
    if guard: return jsonify({"error": guard[0]}), guard[1]

    excel_path = current_app.config["EXCEL_PATH"]
    df = read_sheet(excel_path, "Sales")
    return jsonify(df.to_dict(orient="records"))

@sales_bp.post("/api/sales")
def record_sale():
    guard = require_roles(["staff"])
    if guard: return jsonify({"error": guard[0]}), guard[1]

    data = request.json or {}
    excel_path = current_app.config["EXCEL_PATH"]

    products_df = read_sheet(excel_path, "Products")
    sales_df = read_sheet(excel_path, "Sales")

    product_id = int(data["product_id"])
    customer_id = int(data["customer_id"])
    qty = int(data["quantity_sold"])

    match = products_df[products_df["product_id"] == product_id]
    if match.empty:
        return jsonify({"error": "Product not found"}), 404

    product = match.iloc[0]
    if int(product["quantity"]) < qty:
        return jsonify({"error": "Not enough stock"}), 400

    total_price = float(product["price"]) * qty
    new_sale_id = generate_id(sales_df, "sale_id")

    sale_row = {
        "sale_id": new_sale_id,
        "product_id": product_id,
        "customer_id": customer_id,
        "quantity_sold": qty,
        "total_price": total_price,
        "sale_date": datetime.now()
    }

    # Reduce stock
    products_df.loc[products_df["product_id"] == product_id, "quantity"] -= qty
    products_df.loc[products_df["product_id"] == product_id, "last_updated"] = datetime.now()

    sales_df = pd.concat([sales_df, pd.DataFrame([sale_row])], ignore_index=True)

    write_sheet(excel_path, "Products", products_df)
    write_sheet(excel_path, "Sales", sales_df)

    return jsonify({"message": "Sale recorded", "sale_id": new_sale_id})
