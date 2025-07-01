import logging
import os
from typing import List

import requests

from api.image_fetcher import fetch_http_image
from api.models.Movie import Movie
from api.models.GenreId import GenreId
from api.models.MovieId import MovieId
from api.models.MovieSource import MovieSource
from api.models.VotingSession import VotingSession


logger = logging.getLogger(__name__)

_TMDB_API_KEY = os.environ.get('KT_TMDB_API_KEY', '-')
_TMDB_API_LANGUAGE = os.environ.get('KT_TMDB_API_LANGUAGE', 'de-DE')
_TMDB_API_REGION = os.environ.get('KT_TMDB_API_REGION', 'DE')
_TMDB_API_TIMEOUT = int(os.environ.get('KT_TMDB_API_TIMEOUT', '3'))
_TMDB_API_DISCOVER_SORT = os.environ.get('KT_TMDB_API_DISCOVER_SORT', 'popularity.desc')
_TMDB_API_DISCOVER_TOTAL = min(int(os.environ.get('KT_TMDB_API_DISCOVER_TOTAL', '200')), 1000)

_LANG_REG_POSTFIX = ''
if _TMDB_API_LANGUAGE is not None and _TMDB_API_LANGUAGE  != '' and _TMDB_API_REGION is not None and _TMDB_API_REGION != '':
  _LANG_REG_POSTFIX = 'language=' + _TMDB_API_LANGUAGE + '&region=' + _TMDB_API_REGION

_QUERY_MOVIE = f"https://api.themoviedb.org/3/movie/<tmdb_id>?append_to_response=release_dates&{_LANG_REG_POSTFIX}"
_QUERY_POSTER = f"https://image.tmdb.org/t/p/w500<poster_path>?{_LANG_REG_POSTFIX}"
_QUERY_PROVIDERS = f"https://api.themoviedb.org/3/movie/<tmdb_id>/watch/providers?{_LANG_REG_POSTFIX}"
_QUERY_DISCOVER = f"https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&{_LANG_REG_POSTFIX}&page=<page>&sort_by=<sort_by>&watch_region={_TMDB_API_REGION}&with_watch_providers=<provider_id>"
_QUERY_GENRES = f"https://api.themoviedb.org/3/genre/movie/list?{_LANG_REG_POSTFIX}"
_QUERY_PROVIDERS = f"https://api.themoviedb.org/3/watch/providers/movie?{_LANG_REG_POSTFIX}"

_GENRES = None
_MOVIE_MAP = {}
_PROVIDERS = None
_SOURCE_PROVIDER_MAP = {}

def get_poster(data: Movie) -> tuple[bytes, str] | tuple[None, None]:
  if 'tmdb_poster' in data.thumbnail_src:
    return get_poster_by_poster_path(data.thumbnail_src['tmdb_poster'])
  elif 'tmdb' not in data.uniqueid:
    logger.debug(f"no tmdb id in data for image receiving...")
    return None, None

  tmdb_id = data.uniqueid['tmdb']
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

def getProviderId(source: MovieSource) -> int:
  global _SOURCE_PROVIDER_MAP
  if source in _SOURCE_PROVIDER_MAP:
    providerID = _SOURCE_PROVIDER_MAP.get(source)
    if providerID is not None:
      return providerID
    return -1
  
  for provider in listProviders():
    if provider['name'].lower() == source.name.lower(): # TODO das geht jetzt für netflix so
      _SOURCE_PROVIDER_MAP[source] = provider['id']
      return provider['id']

  _SOURCE_PROVIDER_MAP[source] = -1
  return -1

def listProviders() -> List:
  global _PROVIDERS
  if _PROVIDERS is None:
    global _QUERY_PROVIDERS
    data = _make_tmdb_query(_QUERY_PROVIDERS)
    providers = []
    for provider in data['results']:
      name = provider['provider_name']
      id = provider['provider_id']
      providers.append({
        'name': name,
        'id': id
      })
    _PROVIDERS = providers
  return _PROVIDERS

def listMovieIds(source: MovieSource, session: VotingSession) -> List[MovieId]:
  global _QUERY_DISCOVER, _TMDB_API_DISCOVER_SORT, _TMDB_API_DISCOVER_TOTAL
  providerId = getProviderId(source)
  if providerId <= 0:
    return []
  
  disabledGenreIds = session.getDisabledGenres()
  mustGenreIds = session.getMustGenres()
  baseQuery = _QUERY_DISCOVER \
    .replace('<provider_id>', str(providerId)) \
    .replace('<sort_by>', _TMDB_API_DISCOVER_SORT)
  
  if len(disabledGenreIds) > 0:
    disabledTmdbGenreIds = []
    for g in listGenres():
      if g.id in disabledGenreIds:
        disabledTmdbGenreIds.append(str(g.tmdb_id))
    baseQuery += '&without_genres=' + ','.join(disabledTmdbGenreIds)
  if len(mustGenreIds) > 0:
    mustTmdbGenreIds = []
    for g in listGenres():
      if g.id in mustGenreIds:
        mustTmdbGenreIds.append(str(g.tmdb_id))
    baseQuery += '&with_genres=' + '|'.join(mustTmdbGenreIds)
  
  if session.max_duration < 60000:
    baseQuery += '&with_runtime.lte=' + str(session.max_duration + 1)

  movieIds = []
  i = 1
  while len(movieIds) < _TMDB_API_DISCOVER_TOTAL:
    
    query = baseQuery.replace('<page>', str(i))
    result = _make_tmdb_query(query)
    if 'results' in result and len(result['results']) == 0:
      break
    i+=1
    if 'results' in result:
      for movie in result['results']:
        movieIds.append(MovieId(source, movie['id']))
  
  return movieIds
  

def _normalise_genre(genre) -> GenreId:
  return GenreId(genre['name'], tmbd_id=genre['id'])

def _getPureMovie(tmdb_id: int):
  global _MOVIE_MAP, _QUERY_MOVIE
  if tmdb_id in _MOVIE_MAP:
    logger.debug(f"getting tmbd movie with id {tmdb_id} from cache")
    return _MOVIE_MAP.get(tmdb_id)

  query =  _QUERY_MOVIE.replace('<tmdb_id>', str(tmdb_id))
  data = _make_tmdb_query(query)

  if data is None or 'id' not in data:
    data = None

  _MOVIE_MAP[tmdb_id] = data
  
  return data

def getMovie(movie_id: MovieId) -> Movie|None:
  data = _getPureMovie(movie_id.id)

  if data is None:
    return None

  result = Movie(
            movie_id,
            data['title'],
            data['overview'],
            data['release_date'].split('-')[0],
            _extract_genres(data['genres']),
            data['runtime'],
            _extract_age(data['release_dates']['results'])
  )

  result.set_tmbdid(movie_id.id)

  if 'imdb_id' in data:
    result.set_imdbid(data['imdb_id'])

  if 'poster_path' in data:
    result.add_thumbnail_src('tmdb_poster', data['poster_path'])

  return result

def _extract_age(release_dates):
  global _TMDB_API_REGION
  region = _TMDB_API_REGION.lower()
  for date in release_dates:
    if date['iso_3166_1'].lower() == region:
      age = date['release_dates'][0]['certification']
      if age == '':
        return None
      return int(age)
  
  return None

def _extract_genres(genres) -> List[GenreId]:
  result = []
  for genre in genres:
    result.append(GenreId(genre['name'], tmbd_id=genre['id']))
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