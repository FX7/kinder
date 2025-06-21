
import json
import logging
from flask import Blueprint, jsonify, request


logger = logging.getLogger(__name__)

bp = Blueprint('kodidummy', __name__)

_movies = None
_genres = None

def _get_genres():
    global _genres
    if _genres is None:
        genreNames = []
        genres = []
        movies = _get_movies()
        for movie in movies:
            for genre in movie['genre']:
                if genre not in genreNames:
                    genreNames.append(genre)
        i=0
        for genre in genreNames:
            i+=1
            genres.append({
                'genreid': i,
                'label': genre
            })
        _genres = genres
    return _genres


def _get_movies():
    global _movies
    if _movies is None:
        with open('/data/kodi-dummy-data.json', 'r') as file:
            _movies = json.load(file)
    return _movies


@bp.route('/jsonrpc', methods=['POST'])
def jsonrpc():
    data = request.get_json()
    method = data.get('method')
    params = data.get('params', {})
    id = data.get('id')
    movies = _get_movies()
    genres = _get_genres()
    response = {}

    if method == 'VideoLibrary.GetMovies':
        response = {
            "jsonrpc": "2.0",
            "result": {
                "movies": movies
            },
            "id": id
        }
    elif method == 'VideoLibrary.GetMovieDetails':
        movie_id = params.get('movieid')
        movie_details = next((movie for movie in movies if movie['movieid'] == movie_id), None)
        response = {
            "jsonrpc": "2.0",
            "result": {
                "moviedetails": movie_details
            },
            "id": id
        }
    elif method == 'VideoLibrary.GetGenres':
        response = {
            "jsonrpc": "2.0",
            "result": {
                "genres": genres
            },
            "id": id
        }
    else:
        response = {
            "jsonrpc": "2.0",
            "error": {
                "code": -32601,
                "message": "Methode nicht gefunden"
            },
            "id": id
        }

    return jsonify(response), 200