import os
import random
from flask import Blueprint, jsonify, request
import requests
from requests.auth import HTTPBasicAuth


from api.models.VotingSession import VotingSession

KODI_USERNAME = os.environ.get('KT_KODI_USERNAME', 'kodi')
KODI_PASSWORD = os.environ.get('KT_KODI_PASSWORDERNAME', 'kodi')
KODI_URL = 'http://' + os.environ.get('KT_KODI_HOST', '127.0.0.1') + '/jsonrpc'

QUERY_MOVIES = {
  "jsonrpc": "2.0",
  "method": "VideoLibrary.GetMovies",
  "params": {},
  "id": 1
}

bp = Blueprint('kodi', __name__)

@bp.route('/api/v1/kodi/list_movies', methods=['GET'])
def list_movies():
    """
    List all movies from kodi
    ---
    responses:
      200:
        description: Ids of movies in the kodi database
        schema:
          type: array
          items:
            type: integer
            example: 1, 2, 3
    """
    global QUERY_MOVIES
    data = _make_kodi_query(QUERY_MOVIES)

    if 'result' in data and 'movies' in data['result']:
        movies = data['result']['movies']
        ids = []
        for movie in movies:
           ids.append(movie['movieid'])
        return ids, 200
  
    raise LookupError('No movies found')


def _make_kodi_query(query):
  response = requests.post(KODI_URL, json=query, auth=HTTPBasicAuth(KODI_USERNAME, KODI_PASSWORD))
  
  if response.status_code == 200:
    return response.json()

  raise LookupError('Unexpected status code ' + str(response.status_code))