from flask import Blueprint, render_template

bp = Blueprint('auth', __name__)

@bp.route('/login')
def login():
    return render_template('login.html')
