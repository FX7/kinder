import logging
import os
from typing import List, Set

import requests
from requests.auth import HTTPBasicAuth
import urllib.parse

from api import image_fetcher
from api.models.Movie import Movie
from api.models.MovieId import MovieId
from api.models.GenreId import GenreId
from api.models.MovieProvider import MovieProvider
from api.models.MovieSource import MovieSource

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

_QUERY_MOVIE_BY_ID = {
  "jsonrpc": "2.0",
  "method": "VideoLibrary.GetMovieDetails",
  "params": {
    "movieid": 0,
    "properties": ["file", "title", "originaltitle", "plot", "thumbnail", "year", "genre", "art", "uniqueid", "runtime", "mpaa", "playcount"]
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

_MOVIE_IDS = None
_GENRES = None

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
  global _MOVIE_IDS
  if _MOVIE_IDS is None:
    global _QUERY_MOVIES
    data = _make_kodi_query(_QUERY_MOVIES)
    if 'result' in data and 'movies' in data['result']:
      movies = data['result']['movies']
      ids = []
      for movie in movies:
        ids.append(MovieId(MovieSource.KODI, int(movie['movieid'])))
      logger.debug(f"found {len(ids)} movies")
      _MOVIE_IDS = ids
    else:
      _MOVIE_IDS = []
  return _MOVIE_IDS

def getMovieIdByTitleYear(titles: Set[str|None], year: int) -> int:
  kodi_id = -1

  for title in titles:
    if title is None:
      continue
    kodi_id = _getMovieIdByTitleYear(title, year, 'title')
    if kodi_id <= 0:
      kodi_id = _getMovieIdByTitleYear(title, year, 'originaltitle')
    if kodi_id > 0:
      break

  return kodi_id

def _getMovieIdByTitleYear(title: str, year: int, titleField: str) -> int:
  query = {
    "jsonrpc": "2.0",
    "method": "VideoLibrary.GetMovies",
    "params": {
    "filter": {
      "and": [
        {
          "field": titleField,
          "operator": "is",
          "value": title
        },
        {
          "field": "year",
          "operator": "is",
          "value": year
        }
      ]
    },
      "properties": ["title", "year", "genre", "plot"]
    },
    "id": 1
  }

  result = _make_kodi_query(query)
  if 'result' in result and 'movies' in result['result'] and len(result['result']['movies']) > 0:
    return result['result']['movies'][0]['movieid']
  return -1

def getMovieById(kodi_id: int) -> Movie|None:
  global _QUERY_MOVIE_BY_ID
  query = _QUERY_MOVIE_BY_ID.copy()
  query['params']['movieid'] = int(kodi_id)
  data = _make_kodi_query(query)

  if 'result' not in data or 'moviedetails' not in data['result']:
    return None

  result = Movie(MovieId(
            MovieSource.KODI, kodi_id),
            data['result']['moviedetails']['title'],
            data['result']['moviedetails']['plot'],
            data['result']['moviedetails']['year'],
            _extract_genre(data['result']['moviedetails']['genre']),
            _runtime_in_minutes(data['result']['moviedetails']['runtime']),
            _mpaa_to_fsk(data['result']['moviedetails']['mpaa']),
            data['result']['moviedetails']['playcount'])

  result.add_provider(MovieProvider.KODI)
  result.set_original_title(data['result']['moviedetails']['originaltitle'])

  if 'uniqueid' in data['result']['moviedetails'] and 'tmdb' in data['result']['moviedetails']['uniqueid']:
    result.set_tmdbid(data['result']['moviedetails']['uniqueid']['tmdb'])

  if 'uniqueid' in data['result']['moviedetails'] and 'imdb' in data['result']['moviedetails']['uniqueid']:
    result.set_imdbid(data['result']['moviedetails']['uniqueid']['imdb'])

  if 'thumbnail' in data['result']['moviedetails']:
    result.add_thumbnail_src('thumbnail', data['result']['moviedetails']['thumbnail'])

  if 'art' in data['result']['moviedetails'] and 'poster' in data['result']['moviedetails']['art']:
    result.add_thumbnail_src('art', data['result']['moviedetails']['art']['poster'])

  if 'file' in data['result']['moviedetails']:
    result.add_thumbnail_src('file', data['result']['moviedetails']['file'])

  return result

def _extract_genre(genres) -> List[GenreId]:
  result = []
  for genre in genres:
    result.append(GenreId(genre))
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
  global _GENRES
  if _GENRES is None:
    global _QUERY_GENRES
    data = _make_kodi_query(_QUERY_GENRES)
    sorted_genres = list(map(_normalise_genre, sorted(data["result"]["genres"], key=lambda x: x["label"])))
    _GENRES = sorted_genres
  return _GENRES

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

def get_thumbnail_poster(data: Movie) -> tuple[bytes, str] | tuple[None, None]:
  if 'thumbnail' not in data.thumbnail_src:
    logger.debug(f"no thumbnail.src->thumbnail in data for image receiving...")
    return None, None

  logger.debug(f"try to receive image from thumbnail.src->thumbnail ...")
  return _decode_image_url(data.thumbnail_src['thumbnail'])


def get_art_poster(data: Movie) -> tuple[bytes, str] | tuple[None, None]:
  if 'art' not in data.thumbnail_src:
    logger.debug(f"no thumbnail.src->poster in data for image receiving...")
    return None, None
  
  logger.debug(f"try to receive image url from thumbnail.src->art ...")
  return _decode_image_url(data.thumbnail_src['art'])


def get_file_poster(data: Movie) -> tuple[bytes, str] | tuple[None, None]:
  if 'file' not in data.thumbnail_src:
    logger.debug(f"no thumbnail.src->file path in data for image receiving...")
    return None, None

  logger.debug(f"try to receive image from thumbnail.src->file path ...")
  return _decode_image_url(data.thumbnail_src['file'])


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