from flask import Blueprint, jsonify, current_app, request
import pandas as pd
from datetime import datetime


from services.excel_service import read_sheet

dashboard_bp = Blueprint("dashboard_api", __name__)

@dashboard_bp.get("/api/dashboard/summary")
def dashboard_summary():
    excel_path = current_app.config["EXCEL_PATH"]

    products = read_sheet(excel_path, "Products")
    orders = read_sheet(excel_path, "Orders")
    order_items = read_sheet(excel_path, "OrderItems")

    # safe defaults
    total_products = 0 if products.empty else int(len(products))
    low_stock = 0 if products.empty else int((pd.to_numeric(products.get("quantity", 0), errors="coerce").fillna(0) <= 5).sum())

    total_orders = 0 if orders.empty else int(len(orders))

    total_revenue = 0.0
    if not orders.empty and "total" in orders.columns:
        total_revenue = float(pd.to_numeric(orders["total"], errors="coerce").fillna(0).sum())

    # top products by qty
    top = []
    if not order_items.empty:
        order_items["quantity"] = pd.to_numeric(order_items.get("quantity", 0), errors="coerce").fillna(0).astype(int)
        order_items["line_total"] = pd.to_numeric(order_items.get("line_total", 0), errors="coerce").fillna(0.0)
        g = order_items.groupby("product_name", as_index=False).agg(qty=("quantity","sum"), revenue=("line_total","sum"))
        g = g.sort_values(["qty","revenue"], ascending=False).head(5)
        top = g.to_dict(orient="records")

    # recent orders
    recent = []
    if not orders.empty:
        recent = orders.tail(5).to_dict(orient="records")

    return jsonify({
        "total_products": total_products,
        "low_stock": low_stock,
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "top_products": top,
        "recent_orders": recent
    })
@dashboard_bp.get("/api/dashboard/revenue_by_date")
def revenue_by_date():
    excel_path = current_app.config["EXCEL_PATH"]

    # range = today | 7 | month
    range_type = request.args.get("range", "7")

    sales = read_sheet(excel_path, "Sales")
    if sales.empty or "sale_date" not in sales.columns:
        return jsonify({"labels": [], "values": []})

    # make sure total_price exists
    if "total_price" not in sales.columns:
        sales["total_price"] = 0

    sales["sale_date"] = pd.to_datetime(sales["sale_date"], errors="coerce")
    sales["total_price"] = pd.to_numeric(sales["total_price"], errors="coerce").fillna(0)

    sales = sales.dropna(subset=["sale_date"])

    today = pd.Timestamp.today().normalize()

    if range_type == "today":
        filtered = sales[sales["sale_date"] >= today]

    elif range_type == "month":
        filtered = sales[
            (sales["sale_date"].dt.month == today.month) &
            (sales["sale_date"].dt.year == today.year)
        ]

    else:  # default last 7 days
        start = today - pd.Timedelta(days=6)
        filtered = sales[sales["sale_date"] >= start]

    grouped = (
        filtered
        .groupby(filtered["sale_date"].dt.date)["total_price"]
        .sum()
        .reset_index()
        .sort_values("sale_date")
    )

    return jsonify({
        "labels": grouped["sale_date"].astype(str).tolist(),
        "values": grouped["total_price"].tolist()
    })
