import os
from flask import jsonify, render_template, Blueprint

from api.sources.emby import Emby
from api.sources.jellyfin import Jellyfin
from api.sources.kodi import Kodi
from api.sources.plex import Plex
from api.sources.tmdb import Tmdb
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
    # default_max_age/default_max_duration should be int values,
    #  but "hard parsing" would lead to uncaugt errors.
    # So take the values here anyway and let the Frontend show that they are invalid.
    default_max_age = os.environ.get('KT_FILTER_DEFAULT_MAX_AGE', '4')
    default_max_duration = os.environ.get('KT_FILTER_DEFAULT_MAX_DURATION', '10')
    default_include_watched = eval(os.environ.get('KT_FILTER_DEFAULT_INCLUDE_WATCHED', 'True'))
    default_disabled_genres = os.environ.get('KT_FILTER_DEFAULT_DISABLED_GENRES', '').split(',')
    default_must_genres = os.environ.get('KT_FILTER_DEFAULT_MUST_GENRES', '').split(',')
    default_providers = os.environ.get('KT_FILTER_DEFAULT_PROVIDER', 'kodi').split(',')
    filter_defaults = {
        'default_providers' : default_providers,
        'default_disabled_genres' : default_disabled_genres,
        'default_must_genres': default_must_genres,
        'default_max_age': default_max_age,
        'default_max_duration': default_max_duration,
        'default_include_watched': default_include_watched
    }

    hide_provider = eval(os.environ.get('KT_FILTER_HIDE_PROVIDER', 'False'))
    hide_disabled_genres = eval(os.environ.get('KT_FILTER_HIDE_DISABLED_GENRES', 'False'))
    hide_must_genres = eval(os.environ.get('KT_FILTER_HIDE_MUST_GENRES', 'False'))
    hide_max_age = eval(os.environ.get('KT_FILTER_HIDE_MAX_AGE', 'False'))
    hide_max_duration = eval(os.environ.get('KT_FILTER_HIDE_MAX_DURATION', 'False'))
    hide_include_watched = eval(os.environ.get('KT_FILTER_HIDE_INCLUDE_WATCHED', 'False'))
    hide_overlay = eval(os.environ.get('KT_FILTER_HIDE_OVERLAY', 'False'))

    hide_end = eval(os.environ.get('KT_HIDE_END', 'False'))
    filter_hide = {
        'hide_provider': hide_provider,
        'hide_disabled_genres': hide_disabled_genres,
        'hide_must_genres': hide_must_genres,
        'hide_max_age': hide_max_age,
        'hide_max_duration': hide_max_duration,
        'hide_include_watched': hide_include_watched,
        'hide_overlay': hide_overlay,
        'hide_end': hide_end
    }

    kodi_disabled = Kodi.getInstance().isApiDisabled()
    emby_disabled = Emby.getInstance().isApiDisabled()
    tmdb_disabled = Tmdb.getInstance().isApiDisabled()
    jellyfin_disabled = Jellyfin.getInstance().isApiDisabled()
    plex_disabled = Plex.getInstance().isApiDisabled()
    sources_available = {
        'kodi': not kodi_disabled,
        'emby': not emby_disabled,
        'tmdb': not tmdb_disabled,
        'jellyfin': not jellyfin_disabled,
        'plex': not plex_disabled,
    }

    # This should be int values, but "hard parsing" would lead to uncaugt errors.
    # So take the values here anyway and let the Frontend show that they are invalid.
    max_minutes = os.environ.get('KT_DEFAULT_END_MAX_MINUTES', '-1')
    max_votes = os.environ.get('KT_DEFAULT_END_MAX_VOTES', '-1')
    max_matches = os.environ.get('KT_DEFAULT_END_MAX_MATCHES', '-1')
    end_conditions = {
        'max_minutes' : max_minutes,
        'max_votes': max_votes,
        'max_matches': max_matches
    }

    overlay_title = eval(os.environ.get('KT_OVERLAY_TITLE', 'True'))
    overlay_runtime = eval(os.environ.get('KT_OVERLAY_DURATION', 'True'))
    overlay_genres = eval(os.environ.get('KT_OVERLAY_GENRES', 'True'))
    overlay_watched = eval(os.environ.get('KT_OVERLAY_WATCHED', 'True'))
    overlay_age = eval(os.environ.get('KT_OVERLAY_AGE', 'True'))
    overlays = {
        'title': overlay_title,
        'runtime': overlay_runtime,
        'genres': overlay_genres,
        'watched': overlay_watched,
        'age': overlay_age
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
        'flop_count': flop_count }), 200

def _lineBreaks(license: str):
    return license.replace('\n', '<br>')
    

def _licenseFormat(license: str):
    html = _lineBreaks(license)
    return html.replace('  ', '&nbsp;&nbsp;&nbsp;&nbsp;')