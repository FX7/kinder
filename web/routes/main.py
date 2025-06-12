import os
from flask import render_template, Blueprint

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    return render_template('index.html')

@bp.route('/vote')
def vote():
    return render_template('vote.html')

# @bp.route('/status')
# def status():
#     with open('LICENSE', 'r', encoding='utf-8') as licenseFile:
#         license = _licenseFormat(licenseFile.read())

#     with open('web/static/bootstrap/LICENSE', 'r', encoding='utf-8') as bootstrapFile:
#         bootstrap = _licenseFormat(bootstrapFile .read())

#     return render_template('about.html', license=license, bootstrap=bootstrap)

@bp.route('/about')
def about():
    with open('LICENSE', 'r', encoding='utf-8') as licenseFile:
        license = _licenseFormat(licenseFile.read())

    with open('web/static/bootstrap/LICENSE', 'r', encoding='utf-8') as bootstrapFile:
        bootstrap = _licenseFormat(bootstrapFile .read())

    return render_template('about.html', license=license, bootstrap=bootstrap)

def _licenseFormat(license: str):
    html = license.replace('\n', '<br>')
    return html.replace('  ', '&nbsp;&nbsp;&nbsp;&nbsp;')