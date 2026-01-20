from flask import Blueprint, request, jsonify, render_template, session, redirect
from services.auth_service import login_user, logout_user, get_me

auth_bp = Blueprint("auth", __name__)

@auth_bp.get("/")
def home_page():
    return render_template("home.html")

@auth_bp.get("/login")
def login_page():
    role = request.args.get("role", "staff")
    return render_template("login.html", role=role)

@auth_bp.get("/dashboard")
def dashboard_page():
    if "role" not in session:
        return redirect("/login")

    return render_template("dashboard.html")



@auth_bp.post("/api/login")
def api_login():
    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    result = login_user(username, password)
    if not result:
        return jsonify({"error": "Invalid username or password"}), 400
    return jsonify({"message": "Login successful", **result})

@auth_bp.post("/api/logout")
def api_logout():
    logout_user()
    return jsonify({"message": "Logged out"})

@auth_bp.get("/api/me")
def api_me():
    return jsonify(get_me())
