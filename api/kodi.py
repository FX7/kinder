import logging
import os
from typing import List

import requests
from requests.auth import HTTPBasicAuth
import urllib.parse

from api import image_fetcher
from api.models.Movie import Movie
from api.models.MovieId import MovieId
from api.models.GenreId import GenreId
from api.models.MovieSource import MovieSource
from config import Config

logger = logging.getLogger(__name__)

_KODI_USERNAME = os.environ.get('KT_KODI_USERNAME', 'kodi')
_KODI_PASSWORD = os.environ.get('KT_KODI_PASSWORDERNAME', 'kodi')
_KODI_URL = 'http://' + os.environ.get('KT_KODI_HOST', '127.0.0.1') + ':' + os.environ.get('KT_KODI_PORT', '8080') + '/jsonrpc'
_KODI_TIMEOUT = int(os.environ.get('KT_KODI_TIMEOUT', '3'))

_QUERY_MOVIES = {
  "jsonrpc": "2.0",
  "method": "VideoLibrary.GetMovies",
  "params": {},
  "id": 1
}

_QUERY_MOVIE = {
  "jsonrpc": "2.0",
  "method": "VideoLibrary.GetMovieDetails",
  "params": {
    "movieid": 0,
    "properties": ["file", "title", "plot", "thumbnail", "year", "genre", "art", "uniqueid", "runtime", "mpaa", "playcount"]
  },
  "id": 1
}

_QUERY_GENRES = {
  "jsonrpc": "2.0",
  "method": "VideoLibrary.GetGenres",
  "params": {
    "type": "movie"
  },
  "id": 1
}

# _QUERY_ADD_FAVORITE = {
#   "jsonrpc": "2.0",
#   "method": "VideoLibrary.AddToFavorites",
#   "params": {
#     "item": {
#       "movieid": 0
#     }
#   },
#   "id": 1
# }

_QUERY_PLAY_MOVIE = {
  "jsonrpc": "2.0",
  "method": "Player.Open",
  "params": {
    "item": {
      "movieid": 0
    }
  },
  "id": 1
}

_movie_ids = None
_genres = None

def playMovie(id: int):
  global _QUERY_PLAY_MOVIE
  query = _QUERY_PLAY_MOVIE.copy()
  query['params']['item']['movieid'] = int(id)
  return _make_kodi_query(query)

# def addMovieToFavorite(id: int):
#   global _QUERY_ADD_FAVORITE
#   query = _QUERY_ADD_FAVORITE.copy()
#   query['params']['item']['movieid'] = int(id)
#   return _make_kodi_query(query)

def listMovieIds() -> List[MovieId]:
  global _movie_ids
  if _movie_ids is None:
    global _QUERY_MOVIES
    data = _make_kodi_query(_QUERY_MOVIES)
    if 'result' in data and 'movies' in data['result']:
      movies = data['result']['movies']
      ids = []
      for movie in movies:
        ids.append(MovieId(MovieSource.KODI, int(movie['movieid'])))
      logger.debug(f"found {len(ids)} movies")
      _movie_ids = ids
    else:
      _movie_ids = []
  return _movie_ids

def getMovie(id: int) -> Movie|None:
  global _QUERY_MOVIE
  query = _QUERY_MOVIE.copy()
  query['params']['movieid'] = int(id)
  data = _make_kodi_query(query)

  if 'result' not in data or 'moviedetails' not in data['result']:
    return None

  result = Movie(MovieId(
            MovieSource.KODI, id),
            data['result']['moviedetails']['title'],
            data['result']['moviedetails']['plot'],
            data['result']['moviedetails']['year'],
            data['result']['moviedetails']['genre'], # TODO
            _runtime_in_minutes(data['result']['moviedetails']['runtime']),
            _mpaa_to_fsk(data['result']['moviedetails']['mpaa']),
            data['result']['moviedetails']['playcount'])

  if 'uniqueid' in data['result']['moviedetails'] and 'tmdb' in data['result']['moviedetails']['uniqueid']:
    result.set_tmbdid(data['result']['moviedetails']['uniqueid']['tmdb'])

  if 'uniqueid' in data['result']['moviedetails'] and 'imdb' in data['result']['moviedetails']['uniqueid']:
    result.set_imdbid(data['result']['moviedetails']['uniqueid']['imdb'])

  thumbnail = None
  if 'thumbnail' in data['result']['moviedetails']:
    thumbnail = data['result']['moviedetails']['thumbnail']

  kodi_art = None
  if 'art' in data['result']['moviedetails'] and 'poster' in data['result']['moviedetails']['art']:
    kodi_art = data['result']['moviedetails']['art']['poster']

  kodi_file = None
  if 'file' in data['result']['moviedetails']:
    kodi_file = data['result']['moviedetails']['file']

  for image_pref in Config.IMAGE_PREFERENCE:
    if locals()[image_pref] is not None:
      result.add_thumbnail_src(locals()[image_pref])

  return result

def _runtime_in_minutes(runtime):
  if runtime is None or runtime <= 0:
    return 0
  
  return round(runtime / 60)

def _mpaa_to_fsk(mpaa) -> int | None:
  if mpaa is None or mpaa == '':
    return None
  
  rated = str(mpaa).lower()

  if rated == 'rated u' or rated == 'rated 0':
    return 0
  elif rated == 'rated pg' or rated == 'rated 6':
    return 6
  elif rated == 'rated t' or rated == 'rated pg-13' or rated == 'rated 12':
    return 12
  elif rated == 'rated 16':
    return 16
  elif rated == 'rated r' or rated == 'rated 18':
    return 18
  elif rated == 'rated':
    return None
  else:
    logger.error(f"dont know how to convert {mpaa} to fsk")
    return None

def listGenres() -> List[GenreId]:
  global _genres
  if _genres is None:
    global _QUERY_GENRES
    data = _make_kodi_query(_QUERY_GENRES)
    sorted_genres = list(map(_normalise_genre, sorted(data["result"]["genres"], key=lambda x: x["label"])))
    _genres = sorted_genres
  return _genres

def _normalise_genre(genre) -> GenreId:
  return GenreId(genre['label'], kodi_id=genre['genreid'])

def _make_kodi_query(query):
  logger.debug(f"making kodi query {query}")
  response = requests.post(_KODI_URL, json=query, auth=HTTPBasicAuth(_KODI_USERNAME, _KODI_PASSWORD), timeout=_KODI_TIMEOUT)
  status_code = response.status_code
  try:
    json = response.json()
  except Exception:
    logger.error(f"Result was no json!")
    raise LookupError(f"Seems like we couldnt connect to Kodi! Make sure host, port, username and password a set correctly!")
    
  logger.debug(f"kodi query result {json}/{status_code}")
  if status_code == 200:
    return json

  raise LookupError('Unexpected status code ' + str(status_code))


def decode_image_url(encoded_image_url) -> tuple[bytes, str] | tuple[None, None]:
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