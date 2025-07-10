import os
from flask import jsonify, render_template, Blueprint

from api.sources import emby, kodi, tmdb
from api.models.MovieProvider import providerToDict

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
        bootstrap = _licenseFormat(bootstrapFile.read())

    with open('HISTORY.md', 'r', encoding='utf-8') as historyFile:
        history = _lineBreaks(historyFile.read())

    return render_template('about.html', license=license, bootstrap=bootstrap, history=history)

@bp.route('/settings')
def settings():
    default_max_age = int(os.environ.get('KT_FILTER_DEFAULT_MAX_AGE', '4'))
    default_max_duration = int(os.environ.get('KT_FILTER_DEFAULT_MAX_DURATION', '10'))
    default_include_watched = eval(os.environ.get('KT_FILTER_DEFAULT_INCLUDE_WATCHED', 'True'))
    default_disabled_genres = os.environ.get('KT_FILTER_DEFAULT_DISABLED_GENRES', '').split(',')
    default_must_genres = os.environ.get('KT_FILTER_DEFAULT_MUST_GENRES', '').split(',')
    default_sources = os.environ.get('KT_FILTER_DEFAULT_SOURCES', 'kodi').split(',')
    filter_defaults = {
        'default_sources' : default_sources,
        'default_disabled_genres' : default_disabled_genres,
        'default_must_genres': default_must_genres,
        'default_max_age': default_max_age,
        'default_max_duration': default_max_duration,
        'default_include_watched': default_include_watched
    }

    kodi_disabled = kodi.apiDisabled()
    emby_disabled = emby.apiDisabled()
    tmdb_disabled = tmdb.apiDisabled()
    sources_available = {
        'kodi': not kodi_disabled,
        'emby': not emby_disabled,
        'tmdb': not tmdb_disabled
    }

    availableProvider = list(map(providerToDict, tmdb.listRegionAvailableProvider()))
    match_action = os.environ.get('KT_MATCH_ACTION', 'none')
    top_count = int(os.environ.get('KT_TOP_COUNT', '3'))
    flop_count = int(os.environ.get('KT_FLOP_COUNT', '3'))

    return jsonify({ 
        'filter_defaults': filter_defaults, 
        'sources_available': sources_available,
        'provider_available': availableProvider,
        'match_action': match_action,
        'top_count': top_count,
        'flop_count': flop_count }), 200

def _lineBreaks(license: str):
    return license.replace('\n', '<br>')
    

def _licenseFormat(license: str):
    html = _lineBreaks(license)
    return html.replace('  ', '&nbsp;&nbsp;&nbsp;&nbsp;')