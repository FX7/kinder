import logging
import os
from typing import List

import requests

from api.image_fetcher import fetch_http_image
from api.models.GenreId import GenreId
from api.models.MovieId import MovieId
from api.models.MovieSource import MovieSource


logger = logging.getLogger(__name__)

_TMDB_API_KEY = os.environ.get('KT_TMDB_API_KEY', '-')
_TMDB_API_LANGUAGE = os.environ.get('KT_TMBD_API_LANGUAGE', 'de-DE')
_TMDB_API_REGION = os.environ.get('KT_TMBD_API_REGION', 'de')
_TMDB_API_TIMEOUT = int(os.environ.get('KT_TMBD_API_TIMEOUT', '3'))

_LANG_REG_POSTFIX = ''
if _TMDB_API_LANGUAGE is not None and _TMDB_API_LANGUAGE  != '' and _TMDB_API_REGION is not None and _TMDB_API_REGION != '':
  _LANG_REG_POSTFIX = 'language=' + _TMDB_API_LANGUAGE + '&region=' + _TMDB_API_REGION

_QUERY_MOVIE = f"https://api.themoviedb.org/3/movie/<tmdb_id>?{_LANG_REG_POSTFIX}"
_QUERY_POSTER = f"https://image.tmdb.org/t/p/w500<poster_path>?{_LANG_REG_POSTFIX}"
_QUERY_PROVIDERS = f"https://api.themoviedb.org/3/movie/<tmdb_id>/watch/providers?{_LANG_REG_POSTFIX}"
_QUERY_TOP_RATED = f"https://api.themoviedb.org/3/movie/top_rated?{_LANG_REG_POSTFIX}&page=<page>"
_QUERY_GENRES = f"https://api.themoviedb.org/3/genre/movie/list?{_LANG_REG_POSTFIX}"

_GENRES = None
_MOVIE_MAP = {}


def get_poster(data) -> tuple[bytes, str] | tuple[None, None]:
  if 'tmdb_poster' in data['thumbnail.src']:
    return get_poster_by_poster_path(data['thumbnail.src']['tmdb_poster'])
  elif 'tmdb' not in data['uniqueid']:
    logger.debug(f"no tmdb id in data for image receiving...")
    return None, None

  tmdb_id = data['uniqueid']['tmdb']
  return get_poster_by_id(tmdb_id)


def get_poster_by_id(tmdb_id) -> tuple[bytes, str] | tuple[None, None]:
  global _TMDB_API_KEY
  if _TMDB_API_KEY is None or _TMDB_API_KEY == '' or _TMDB_API_KEY == '-':
    return None, None

  logger.debug(f"try to receive image from tmdb id ...")

  data = _getPureMovie(tmdb_id)
  
  if data is not None and 'poster_path' in data:
    return get_poster_by_poster_path(data['poster_path'])

  return None, None

def get_poster_by_poster_path(poster_path) -> tuple[bytes, str] | tuple[None, None]:
  poster_url = _QUERY_POSTER.replace('<poster_path>', poster_path)
  return fetch_http_image(poster_url)

def listGenres() -> List[GenreId]:
  global _GENRES
  if _GENRES is None:
    global _QUERY_GENRES
    data = _make_tmdb_query(_QUERY_GENRES)
    sorted_genres = list(map(_normalise_genre, sorted(data['genres'], key=lambda x: x["name"])))
    _GENRES = sorted_genres
  return _GENRES

def _normalise_genre(genre) -> GenreId:
  return GenreId(genre['name'])

def _getPureMovie(tmdb_id: int):
  global _MOVIE_MAP, _QUERY_MOVIE
  if tmdb_id in _MOVIE_MAP:
    logger.debug(f"getting tmbd movie with id {tmdb_id} from cache")
    return _MOVIE_MAP.get(tmdb_id)

  query =  _QUERY_MOVIE.replace('<tmdb_id>', str(id))
  data = _make_tmdb_query(query)

  if data is None or 'id' not in data:
    data = None

  _MOVIE_MAP[tmdb_id] = data
  
  return data

def getMovie(id: int):
  data = _getPureMovie(id)

  if data is None:
    return None

  result = {
      "movie_id": MovieId(MovieSource.KODI, id).to_dict(), # TODO correct source
      "title": data['title'],
      "plot": data['overview'],
      "year": data['release_date'], # TODO only year
      "genre": _extract_genres(data['genres']),
      "runtime": data['runtime'], # TODO runtime normalisation
#      "mpaa": data['result']['moviedetails']['mpaa'],
#      "age": _mpaa_to_fsk(data['result']['moviedetails']['mpaa']),
      "playcount": 0,
      "uniqueid": {},
      "thumbnail.src": {}
  }
  result['uniqueid']['tmdb'] = id
  if 'poster_path' in data:
    result['thumbnail.src']['tmdb_poster'] = data['poster_path']

  if 'imdb_id' in data:
    result['uniqueid']['imdb'] = data['imdb_id']

  return result

def _extract_genres(genres):
  result = []
  for genre in genres:
    result.append(genre['name'])
  return result


def _make_tmdb_query(query):
  global _TMDB_API_TIMEOUT

  logger.debug(f"making tmdb query {query}")


  headers = {
    "Authorization": f"Bearer {_TMDB_API_KEY}"
  }

  response = requests.get(query, headers=headers, timeout=_TMDB_API_TIMEOUT)
  status_code = response.status_code
  try:
    json = response.json()
  except Exception:
    logger.error(f"Result was no json!")
    raise LookupError(f"Seems like we couldnt connect to Tmdb! Make sure API Key is set correctly!")
    
  logger.debug(f"tmdb query result {json}/{status_code}")
  if status_code == 200:
    return json

  raise LookupError('Unexpected status code ' + str(status_code))