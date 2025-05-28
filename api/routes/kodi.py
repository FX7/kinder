import base64
import logging
import os
import uuid
from flask import Blueprint, request
import requests
from requests.auth import HTTPBasicAuth
import urllib.parse

import smbclient
from smbprotocol.connection import Connection, Dialects

KODI_USERNAME = os.environ.get('KT_KODI_USERNAME', 'kodi')
KODI_PASSWORD = os.environ.get('KT_KODI_PASSWORDERNAME', 'kodi')
KODI_URL = 'http://' + os.environ.get('KT_KODI_HOST', '127.0.0.1') + '/jsonrpc'

SMB_USER = os.environ.get('KT_SMB_USER', 'samba')
SMB_PASSWORD = os.environ.get('KT_SMB_PASSWORD', 'samba')

QUERY_GENRES = {
  "jsonrpc": "2.0",
  "method": "VideoLibrary.GetGenres",
  "params": {
    "media": "video"
  },
  "id": 1
}

QUERY_MOVIES = {
  "jsonrpc": "2.0",
  "method": "VideoLibrary.GetMovies",
  "params": {},
  "id": 1
}

QUERY_MOVIE = {
  "jsonrpc": "2.0",
  "method": "VideoLibrary.GetMovieDetails",
  "params": {
    "movieid": 0,
    "properties": ["title", "plot", "thumbnail"]
  },
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

@bp.route('/api/v1/kodi/get_movie/<id>', methods=['GET'])
def get_movie(id: int):
  """
  Get details for given movie id
  ---
  parameters:
    - name: id
      in: path
      type: integer
      required: true
      description: ID of the movie you want to get
  responses:
    200:
      description: Ids of movies in the kodi database
      schema:
        type: object
        properties:
          title:
            type: string
            example: Movietitle
          plot:
            type: string
            example: Lorem Ipsum
          thumbnail:
            type: string
            example: base64 encoded image (if any)
    404:
      description: No movie wiht given id found
      schema:
        type: object
        properties:
          error:
            type: string
            example: movie with id 1 not found
  """
  global QUERY_MOVIE
  query = QUERY_MOVIE.copy()
  query['params']['movieid'] = int(id)
  data = _make_kodi_query(query)

  if 'result' in data and 'moviedetails' in data['result']:
    result = {
       "title": data['result']['moviedetails']['title'],
       "plot": data['result']['moviedetails']['plot'],
    }
    image = _decode_image_url(data['result']['moviedetails']['thumbnail'])
    if image is not None:
      result['thumbnail'] = image
    return result, 200

  return {"error": f"movie with id {id} not found"}, 404

def _make_kodi_query(query):
  logging.debug(f"making kodi query {query}")
  response = requests.post(KODI_URL, json=query, auth=HTTPBasicAuth(KODI_USERNAME, KODI_PASSWORD))
  status_code = response.status_code
  json = response.json()
  logging.debug(f"kodi query result {json}/{status_code}")
  if response.status_code == 200:
    return json

  raise LookupError('Unexpected status code ' + str(status_code))

def _decode_image_url(encoded_image_url):
  if encoded_image_url is None or encoded_image_url == '':
    return None

  decoded_image_url = urllib.parse.unquote(encoded_image_url)
  logging.debug(f"Decoded image url: {decoded_image_url}")
  image_url = decoded_image_url.replace("image://video@", "")
  if image_url.startswith('smb'):
    return _fetch_samba_image(image_url)
  else:
    logging.error(f"unknown protocol in image_url {image_url}")

def _fetch_samba_image(image_url: str):
  parts = image_url.split('/')
  smbclient.register_session(parts[2], username=SMB_USER, password=SMB_PASSWORD)
  length = len(parts) - 2
  file_path = "/".join(parts[4:length])
  if 'VIDEO_TS.IFO' == parts[len(parts) - 2]:
    file_path += "/poster.jpg"
  else:
    moviefile = parts[len(parts) - 2]
    movieParts = moviefile.split('.')
    posterName = ".".join(movieParts[:len(movieParts) - 1])
    file_path += "/" + posterName + "-poster.jpg"
  with smbclient.open_file(r'\\{}\\{}\\{}'.format(parts[2], parts[3], file_path), 'rb') as remote_file:
    data = remote_file.read()
    # with open('/data/dbg_file.out', 'wb') as local_file:
    #   local_file.write(data)  # Daten in die lokale Datei schreiben
    encoded_data = base64.b64encode(data)
    return encoded_data.decode('utf-8')