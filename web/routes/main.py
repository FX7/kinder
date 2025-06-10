import os
from flask import render_template, Blueprint

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    return render_template('index.html')

@bp.route('/LICENSE')
def license():
    with open('LICENSE', 'r') as file:
        content = file.read()
    
    return content, 200