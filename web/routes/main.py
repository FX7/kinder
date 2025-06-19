import os
from flask import jsonify, render_template, Blueprint

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    return render_template('index.html')

@bp.route('/vote')
def vote():
    return render_template('vote.html')

@bp.route('/about')
def about():
    with open('LICENSE', 'r', encoding='utf-8') as licenseFile:
        license = _licenseFormat(licenseFile.read())

    with open('web/static/bootstrap/LICENSE', 'r', encoding='utf-8') as bootstrapFile:
        bootstrap = _licenseFormat(bootstrapFile .read())

    return render_template('about.html', license=license, bootstrap=bootstrap)

@bp.route('/filter')
def filter():
    default_max_age = int(os.environ.get('KT_FILTER_DEFAULT_MAX_AGE', '4'))
    default_max_duration = int(os.environ.get('KT_FILTER_DEFAULT_MAX_DURATION', '10'))
    default_include_watched = eval(os.environ.get('KT_FILTER_DEFAULT_INCLUDE_WATCHED', 'True'))
    default_disabled_genres = os.environ.get('KT_FILTER_DEFAULT_DISABLED_GENRES', '').split(',')
    default_must_genres = os.environ.get('KT_FILTER_DEFAULT_MUST_GENRES', 'Abenteuer,Action').split(',')
    defaults = {
        'default_disabled_genres' : default_disabled_genres,
        'default_must_genres': default_must_genres,
        'default_max_age': default_max_age,
        'default_max_duration': default_max_duration,
        'default_include_watched': default_include_watched
    }
    return jsonify(defaults), 200

def _licenseFormat(license: str):
    html = license.replace('\n', '<br>')
    return html.replace('  ', '&nbsp;&nbsp;&nbsp;&nbsp;')