# routes/stripe_routes.py
import stripe
from flask import Blueprint, request, jsonify, current_app

stripe_bp = Blueprint("stripe_bp", __name__, url_prefix="/api/public")

@stripe_bp.route("/checkout", methods=["POST"])
def checkout():
    data = request.get_json()
    customer = data.get("customer", {})
    items = data.get("items", [])

    try:
        stripe.api_key = current_app.config["STRIPE_SECRET_KEY"]

        # Calculate total amount in cents
        total = sum(int(it.get("qty", 0)) * float(it.get("price", 0)) for it in items)
        amount = int(total * 100)

        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency="usd",
            automatic_payment_methods={"enabled": True},
            metadata={
                "customer_name": customer.get("name"),
                "customer_phone": customer.get("phone"),
                "customer_email": customer.get("email"),
                "customer_address": customer.get("address"),
            }
        )

        return jsonify({
            "ok": True,
            "clientSecret": intent.client_secret,
            "order_code": intent.id
        })
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 400