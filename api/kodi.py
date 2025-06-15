import logging
import os
from typing import List

import requests
from requests.auth import HTTPBasicAuth
import urllib.parse

from api import image_fetcher

logger = logging.getLogger(__name__)

KODI_USERNAME = os.environ.get('KT_KODI_USERNAME', 'kodi')
KODI_PASSWORD = os.environ.get('KT_KODI_PASSWORDERNAME', 'kodi')
KODI_URL = 'http://' + os.environ.get('KT_KODI_HOST', '127.0.0.1') + ':' + os.environ.get('KT_KODI_PORT', '8080') + '/jsonrpc'
KODI_TIMEOUT = int(os.environ.get('KT_KODI_TIMEOUT', '3'))

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
    "properties": ["file", "title", "plot", "thumbnail", "year", "genre", "art", "uniqueid"]
  },
  "id": 1
}

QUERY_GENRES = {
    "jsonrpc": "2.0",
    "method": "VideoLibrary.GetGenres",
    "params": {
        "type": "movie"
    },
    "id": 1
}

_movie_ids = None
_genres = None

def listMovieIds() -> List[int]:
  global _movie_ids
  if _movie_ids is None:
    global QUERY_MOVIES
    data = _make_kodi_query(QUERY_MOVIES)
    if 'result' in data and 'movies' in data['result']:
      movies = data['result']['movies']
      ids = []
      for movie in movies:
        ids.append(int(movie['movieid']))
      logger.debug(f"found {len(ids)} movies")
      _movie_ids = ids
    else:
      _movie_ids = []
  return _movie_ids

def getMovie(id: int):
  global QUERY_MOVIE
  query = QUERY_MOVIE.copy()
  query['params']['movieid'] = int(id)
  return _make_kodi_query(query)

def listGenres():
  global _genres
  if _genres is None:
    global QUERY_GENRES
    data = _make_kodi_query(QUERY_GENRES)
    sorted_genres = sorted(data["result"]["genres"], key=lambda x: x["label"])
    _genres = sorted_genres
  return _genres

def _make_kodi_query(query):
  logger.debug(f"making kodi query {query}")
  response = requests.post(KODI_URL, json=query, auth=HTTPBasicAuth(KODI_USERNAME, KODI_PASSWORD), timeout=KODI_TIMEOUT)
  status_code = response.status_code
  try:
    json = response.json()
  except Exception:
    logger.error(f"Result was no json!")
    raise LookupError(f"Seems like we couldnt connect to Kodi! Make sure host, port, username and password a set correctly!")
    
  logger.debug(f"kodi query result {json}/{status_code}")
  if response.status_code == 200:
    return json

  raise LookupError('Unexpected status code ' + str(status_code))


def get_thumbnail_poster(data) -> tuple[bytes, str] | tuple[None, None]:
  if 'thumbnail' not in data['thumbnail.src']:
    logger.debug(f"no thumbnail.src->thumbnail in data for image receiving...")
    return None, None

  logger.debug(f"try to receive image from thumbnail.src->thumbnail ...")
  return _decode_image_url(data['thumbnail.src']['thumbnail'])


def get_art_poster(data) -> tuple[bytes, str] | tuple[None, None]:
  if 'art' not in data['thumbnail.src']:
    logger.debug(f"no thumbnail.src->poster in data for image receiving...")
    return None, None
  
  logger.debug(f"try to receive image url from thumbnail.src->art ...")
  return _decode_image_url(data['thumbnail.src']['art'])


def get_file_poster(data) -> tuple[bytes, str] | tuple[None, None]:
  if 'file' not in data['thumbnail.src']:
    logger.debug(f"no thumbnail.src->file path in data for image receiving...")
    return None, None

  logger.debug(f"try to receive image from thumbnail.src->file path ...")
  return _decode_image_url(data['thumbnail.src']['file'])


def _decode_image_url(encoded_image_url) -> tuple[bytes, str] | tuple[None, None]:
  if encoded_image_url is None or encoded_image_url == '':
    return None, None

  decoded_image_url = urllib.parse.unquote(encoded_image_url)
  logger.debug(f"Decoded image url: {decoded_image_url}")
  image_url = decoded_image_url.replace("image://video@", "")
  image_url = image_url.replace("image://", "")
  if image_url.lower().startswith('smb'):
    return image_fetcher.fetch_samba_image(image_url)
  elif image_url.lower().startswith('http'):
    return image_fetcher.fetch_http_image(image_url)
  else:
    logger.error(f"unknown protocol in image_url {image_url}")
    return None, None