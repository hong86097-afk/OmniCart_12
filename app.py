from flask import Flask, session, redirect
from config import Config

from routes.auth_routes import auth_bp
from routes.product_routes import product_bp
from routes.customer_routes import customer_bp
from routes.sales_routes import sales_bp
from routes.public_routes import public_bp
from routes.dashboard_routes import dashboard_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    @app.route("/logout")
    def logout():
        session.clear()
        return redirect("/")

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(product_bp)
    app.register_blueprint(customer_bp)
    app.register_blueprint(sales_bp)
    app.register_blueprint(public_bp)
    app.register_blueprint(dashboard_bp)

    return app

# 👇 IMPORTANT: this line is REQUIRED for Gunicorn
app = create_app()

if __name__ == "__main__":
    app.run(debug=True)