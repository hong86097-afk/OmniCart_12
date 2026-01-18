from flask import session

# Demo users (professional apps would store this in DB)
USERS = {
    "staff1": {"password": "1234", "role": "staff"},
    "manager1": {"password": "1234", "role": "manager"},
}

def login_user(username: str, password: str):
    user = USERS.get(username)
    if not user or user["password"] != password:
        return None
    session["user"] = username
    session["role"] = user["role"]
    return {"username": username, "role": user["role"]}

def logout_user():
    session.clear()

def get_me():
    if "user" not in session:
        return {"logged_in": False}
    return {"logged_in": True, "username": session.get("user"), "role": session.get("role")}

def require_roles(allowed_roles):
    if "user" not in session:
        return ("Unauthorized", 401)
    if session.get("role") not in allowed_roles:
        return ("Forbidden", 403)
    return None
