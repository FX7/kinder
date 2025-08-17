from datetime import date
import os
from flask import jsonify, render_template, Blueprint

from api.sources.emby import Emby
from api.sources.jellyfin import Jellyfin
from api.sources.kodi import Kodi
from api.sources.plex import Plex
from api.sources.tmdb import Tmdb
from api.models.MovieProvider import providerToDict

bp = Blueprint('main', __name__)

@bp.route('/j/<session_hash>')
def join(session_hash):
    return render_template('join.html', session_hash=session_hash)

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
    # default.max_age/default.max_duration should be int values,
    # but "hard parsing" would lead to uncaugt errors.
    # So take the values here anyway and let the Frontend show that they are invalid.
    max_year = os.environ.get('KT_FILTER_DEFAULT_MAX_YEAR')
    if max_year is None or max_year == '':
        max_year = str(date.today().year)
    filter_defaults = {
        'providers' : os.environ.get('KT_FILTER_DEFAULT_PROVIDER', 'kodi').split(','),
        'disabled_genres' : os.environ.get('KT_FILTER_DEFAULT_DISABLED_GENRES', '').split(','),
        'must_genres': os.environ.get('KT_FILTER_DEFAULT_MUST_GENRES', '').split(','),
        'max_age': os.environ.get('KT_FILTER_DEFAULT_MAX_AGE', '4'),
        'max_duration': os.environ.get('KT_FILTER_DEFAULT_MAX_DURATION', '10'),
        'include_watched': eval(os.environ.get('KT_FILTER_DEFAULT_INCLUDE_WATCHED', 'True')),
        'min_year': os.environ.get('KT_FILTER_DEFAULT_MIN_YEAR', '1900'),
        'max_year': max_year,
    }

    filter_hide = {
        'provider': eval(os.environ.get('KT_FILTER_HIDE_PROVIDER', 'False')),
        'disabled_genres': eval(os.environ.get('KT_FILTER_HIDE_DISABLED_GENRES', 'False')),
        'must_genres': eval(os.environ.get('KT_FILTER_HIDE_MUST_GENRES', 'False')),
        'max_age': eval(os.environ.get('KT_FILTER_HIDE_MAX_AGE', 'False')),
        'max_duration': eval(os.environ.get('KT_FILTER_HIDE_MAX_DURATION', 'False')),
        'include_watched': eval(os.environ.get('KT_FILTER_HIDE_INCLUDE_WATCHED', 'False')),
        'overlay': eval(os.environ.get('KT_FILTER_HIDE_OVERLAY', 'False')),
        'min_year': eval(os.environ.get('KT_FILTER_HIDE_MIN_YEAR', 'False')),
        'max_year': eval(os.environ.get('KT_FILTER_HIDE_MAX_YEAR', 'False')),
        'end': eval(os.environ.get('KT_HIDE_END', 'False'))
    }

    sources_available = {
        'kodi': not Kodi.getInstance().isApiDisabled(),
        'emby': not Emby.getInstance().isApiDisabled(),
        'tmdb': not Tmdb.getInstance().isApiDisabled(),
        'jellyfin': not Jellyfin.getInstance().isApiDisabled(),
        'plex': not Plex.getInstance().isApiDisabled(),
    }

    discover = {
        "sort_by": os.environ.get('KT_TMDB_API_DISCOVER_SORT_BY', 'popularity'),
        "sort_order": os.environ.get('KT_TMDB_API_DISCOVER_SORT_ORDER', 'desc'),
        "vote_average": os.environ.get('KT_TMDB_API_DISCOVER_VOTE_AVERAGE'),
        "vote_count": os.environ.get('KT_TMDB_API_DISCOVER_VOTE_COUNT'),
        "total": os.environ.get('KT_TMDB_API_DISCOVER_TOTAL', '200'),
        "chunks": os.environ.get('KT_TMDB_API_DISCOVER_CHUNKS', '1'),
        "distribution": os.environ.get('KT_TMDB_API_DISCOVER_DISTRIBUTION', '0.0')
    }

    # This should be int values, but "hard parsing" would lead to uncaugt errors.
    # So take the values here anyway and let the Frontend show that they are invalid.
    end_conditions = {
        'max_minutes' : os.environ.get('KT_DEFAULT_END_MAX_MINUTES', '-1'),
        'max_votes': os.environ.get('KT_DEFAULT_END_MAX_VOTES', '-1'),
        'max_matches': os.environ.get('KT_DEFAULT_END_MAX_MATCHES', '-1')
    }

    overlays = {
        'title': eval(os.environ.get('KT_OVERLAY_TITLE', 'True')),
        'runtime': eval(os.environ.get('KT_OVERLAY_DURATION', 'True')),
        'genres': eval(os.environ.get('KT_OVERLAY_GENRES', 'True')),
        'watched': eval(os.environ.get('KT_OVERLAY_WATCHED', 'True')),
        'age': eval(os.environ.get('KT_OVERLAY_AGE', 'True')),
        'trailer': eval(os.environ.get('KT_OVERLAY_TRAILER', 'True')),
        'rating': eval(os.environ.get('KT_OVERLAY_RATING', 'True'))
    }

    reminder = {
        'min': int(os.environ.get('KT_REMINDER_MIN', '3500')),
        'offset': int(os.environ.get('KT_REMINDER_OFFSET', '500')),
        'max': int(os.environ.get('KT_REMINDER_MAX', '15000'))
    }

    availableProvider = list(map(providerToDict, Tmdb.getInstance().listRegionAvailableProvider()))
    match_action = os.environ.get('KT_MATCH_ACTION', 'none')
    top_count = int(os.environ.get('KT_TOP_COUNT', '3'))
    flop_count = int(os.environ.get('KT_FLOP_COUNT', '3'))

    return jsonify({
        'filter_hide': filter_hide,
        'end_conditions': end_conditions,
        'filter_defaults': filter_defaults, 
        'sources_available': sources_available,
        'provider_available': availableProvider,
        'match_action': match_action,
        'top_count': top_count,
        'overlays': overlays,
        'discover': discover,
        'reminder': reminder,
        'flop_count': flop_count }), 200

def _lineBreaks(license: str):
    return license.replace('\n', '<br>')
    

def _licenseFormat(license: str):
    html = _lineBreaks(license)
    return html.replace('  ', '&nbsp;&nbsp;&nbsp;&nbsp;')