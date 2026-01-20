from flask import Blueprint, jsonify, current_app, render_template, request
import pandas as pd
from datetime import datetime

from services.excel_service import read_sheet, write_sheet

public_bp = Blueprint("public", __name__)

# ---------- Pages ----------
@public_bp.get("/public")
def public_page():
    return render_template("public.html")

@public_bp.get("/cart")
def cart_page():
    return render_template("cart.html", title="Cart")

@public_bp.get("/checkout")
def checkout_page():
    return render_template("checkout.html", title="Checkout")


# ---------- APIs ----------
@public_bp.get("/api/public/products")
def public_products():
    excel_path = current_app.config["EXCEL_PATH"]
    products = read_sheet(excel_path, "Products")

    if products.empty:
        return jsonify([])

    # Ensure quantity is numeric if present
    if "quantity" in products.columns:
        products["quantity"] = pd.to_numeric(products["quantity"], errors="coerce").fillna(0).astype(int)
        in_stock = products[products["quantity"] > 0]
    else:
        in_stock = products

    # Always provide product_id to the frontend
    if "product_id" not in in_stock.columns and "id" in in_stock.columns:
        in_stock = in_stock.copy()
        in_stock["product_id"] = in_stock["id"]

    return jsonify(in_stock.to_dict(orient="records"))


@public_bp.post("/api/public/checkout")
def public_checkout():
    excel_path = current_app.config["EXCEL_PATH"]

    data = request.get_json() or {}
    customer = data.get("customer") or {}

    # accept both "items" and "cart"
    items = data.get("items") or data.get("cart") or []

    if not items:
        return jsonify({"ok": False, "message": "Cart is empty"}), 400

    # ---- Load products
    products = read_sheet(excel_path, "Products")
    if products.empty:
        return jsonify({"ok": False, "message": "No products found"}), 400

    # detect id column
    if "product_id" in products.columns:
        id_col = "product_id"
    elif "id" in products.columns:
        id_col = "id"
    else:
        return jsonify({"ok": False, "message": "Products sheet missing id column (id or product_id)"}), 400

    # Ensure required columns exist
    for col in [id_col, "product_name", "price", "quantity"]:
        if col not in products.columns:
            return jsonify({"ok": False, "message": f"Products sheet missing column: {col}"}), 400

    products[id_col] = pd.to_numeric(products[id_col], errors="coerce")
    products["quantity"] = pd.to_numeric(products["quantity"], errors="coerce").fillna(0).astype(int)
    products["price"] = pd.to_numeric(products["price"], errors="coerce").fillna(0.0)

    # ---- Load customers
    customers = read_sheet(excel_path, "Customers")
    need_customer_cols = ["id", "customer_name", "phone", "address", "created_at"]
    if customers.empty or any(c not in customers.columns for c in need_customer_cols):
        customers = pd.DataFrame(columns=need_customer_cols)

    # ---- Create/find customer by phone
    phone = (customer.get("phone") or "").strip()
    name = (customer.get("name") or "Guest").strip()
    address = (customer.get("address") or "").strip()

    if not phone:
        return jsonify({"ok": False, "message": "Phone is required"}), 400

    customers["phone"] = customers["phone"].astype(str)
    match = customers[customers["phone"] == phone]

    if match.empty:
        next_cust_id = 1 if customers.empty else (pd.to_numeric(customers["id"], errors="coerce").max() + 1)
        next_cust_id = int(next_cust_id)

        customers.loc[len(customers)] = [
            next_cust_id,
            name,
            phone,
            address,
            datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ]
        customer_id = next_cust_id
    else:
        customer_id = int(pd.to_numeric(match.iloc[0]["id"], errors="coerce") or 0)

    # ---- Load sales
    sales = read_sheet(excel_path, "Sales")
    need_sales_cols = ["id", "customer_id", "product_id", "product_name", "quantity", "total_price", "sale_date"]
    if sales.empty or any(c not in sales.columns for c in need_sales_cols):
        sales = pd.DataFrame(columns=need_sales_cols)

    # ---- Load Orders
    orders = read_sheet(excel_path, "Orders")
    orders_cols = [
        "id", "order_code", "customer_id", "customer_name", "phone", "address",
        "subtotal", "discount", "shipping", "total", "status", "created_at"
    ]
    if orders.empty or any(c not in orders.columns for c in orders_cols):
        orders = pd.DataFrame(columns=orders_cols)

    # ---- Load OrderItems
    order_items = read_sheet(excel_path, "OrderItems")
    order_items_cols = ["id", "order_id", "product_id", "product_name", "price", "quantity", "line_total"]
    if order_items.empty or any(c not in order_items.columns for c in order_items_cols):
        order_items = pd.DataFrame(columns=order_items_cols)

    # ---- IDs + header
    sale_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    next_sale_id = 1 if sales.empty else (pd.to_numeric(sales["id"], errors="coerce").max() + 1)
    next_sale_id = int(next_sale_id)

    next_order_id = 1 if orders.empty else (pd.to_numeric(orders["id"], errors="coerce").max() + 1)
    next_order_id = int(next_order_id)

    order_code = f"OC-{datetime.now().strftime('%Y%m%d')}-{next_order_id:05d}"

    next_order_item_id = 1 if order_items.empty else (pd.to_numeric(order_items["id"], errors="coerce").max() + 1)
    next_order_item_id = int(next_order_item_id)

    subtotal = 0.0
    discount = 0.0
    shipping = 0.0

    sale_rows = []
    order_items_rows = []

    # ---- Deduct stock + create rows
    for it in items:
        # accept product_id or id
        pid = it.get("product_id") if it.get("product_id") is not None else it.get("id")
        qty = int(it.get("qty") or 0)

        if pid is None:
            return jsonify({"ok": False, "message": "Missing product_id"}), 400

        pid = int(pid)
        if qty <= 0:
            return jsonify({"ok": False, "message": "Invalid quantity"}), 400

        p = products[products[id_col] == pid]
        if p.empty:
            return jsonify({"ok": False, "message": f"Product not found: {pid}"}), 400

        idx = p.index[0]
        stock = int(products.loc[idx, "quantity"])
        price = float(products.loc[idx, "price"])
        pname = str(products.loc[idx, "product_name"])

        if qty > stock:
            return jsonify({"ok": False, "message": f"Not enough stock for {pname}"}), 400

        products.loc[idx, "quantity"] = stock - qty

        line_total = round(price * qty, 2)
        subtotal += line_total

        order_items_rows.append({
            "id": next_order_item_id,
            "order_id": next_order_id,
            "product_id": pid,
            "product_name": pname,
            "price": round(price, 2),
            "quantity": qty,
            "line_total": line_total
        })
        next_order_item_id += 1

        sale_rows.append({
            "id": next_sale_id,
            "customer_id": customer_id,
            "product_id": pid,
            "product_name": pname,
            "quantity": qty,
            "total_price": line_total,
            "sale_date": sale_date
        })
        next_sale_id += 1

    sales = pd.concat([sales, pd.DataFrame(sale_rows)], ignore_index=True)

    total = round(subtotal + shipping - discount, 2)

    orders = pd.concat([orders, pd.DataFrame([{
        "id": next_order_id,
        "order_code": order_code,
        "customer_id": customer_id,
        "customer_name": name,
        "phone": phone,
        "address": address,
        "subtotal": round(subtotal, 2),
        "discount": round(discount, 2),
        "shipping": round(shipping, 2),
        "total": total,
        "status": "Completed",
        "created_at": sale_date
    }])], ignore_index=True)

    order_items = pd.concat([order_items, pd.DataFrame(order_items_rows)], ignore_index=True)

    # ---- Save back to Excel
    write_sheet(excel_path, "Customers", customers)
    write_sheet(excel_path, "Products", products)
    write_sheet(excel_path, "Sales", sales)
    write_sheet(excel_path, "Orders", orders)
    write_sheet(excel_path, "OrderItems", order_items)

    return jsonify({"ok": True, "message": f"Order placed ✅ ({order_code})", "order_code": order_code})


@public_bp.get("/thank-you")
def thank_you():
    return render_template("thank_you.html")
