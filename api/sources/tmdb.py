from datetime import datetime
import logging
import os
from typing import List

import requests

from api.models.Poster import Poster
from api.sources import emby, kodi
from api.image_fetcher import fetch_http_image
from api.models.Movie import Movie
from api.models.GenreId import GenreId
from api.models.MovieId import MovieId
from api.models.MovieMonetarization import MovieMonetarization
from api.models.MovieProvider import MovieProvider
from api.models.MovieSource import MovieSource
from api.models.VotingSession import VotingSession
from api.models.MovieProvider import fromString as mp_fromString

logger = logging.getLogger(__name__)

_TMDB_API_KEY = os.environ.get('KT_TMDB_API_KEY', '-')
_TMDB_API_LANGUAGE = os.environ.get('KT_TMDB_API_LANGUAGE', 'de-DE')
_TMDB_API_REGION = os.environ.get('KT_TMDB_API_REGION', 'DE')
_TMDB_API_TIMEOUT = int(os.environ.get('KT_TMDB_API_TIMEOUT', '3'))
_TMDB_API_DISCOVER_SORT = os.environ.get('KT_TMDB_API_DISCOVER_SORT', 'popularity.desc')
_TMDB_API_DISCOVER_TOTAL = min(int(os.environ.get('KT_TMDB_API_DISCOVER_TOTAL', '200')), 1000)
_TMDB_API_INCLUDE_ADULT = os.environ.get('KT_TMDB_API_INCLUDE_ADULT', 'false')

_LANG_REG_POSTFIX = ''
if _TMDB_API_LANGUAGE is not None and _TMDB_API_LANGUAGE  != '' and _TMDB_API_REGION is not None and _TMDB_API_REGION != '':
  _LANG_REG_POSTFIX = 'language=' + _TMDB_API_LANGUAGE + '&region=' + _TMDB_API_REGION

_QUERY_MOVIE = f"https://api.themoviedb.org/3/movie/<tmdb_id>?append_to_response=release_dates,watch/providers&{_LANG_REG_POSTFIX}"
_QUERY_POSTER = f"https://image.tmdb.org/t/p/w500<poster_path>?{_LANG_REG_POSTFIX}"
_QUERY_DISCOVER = f"https://api.themoviedb.org/3/discover/movie?include_adult={_TMDB_API_INCLUDE_ADULT}&include_video=false&{_LANG_REG_POSTFIX}&page=<page>&sort_by=<sort_by>&watch_region={_TMDB_API_REGION}&with_watch_providers=<provider_id>&&release_date.lte=<release_date.lte>"
_QUERY_GENRES = f"https://api.themoviedb.org/3/genre/movie/list?{_LANG_REG_POSTFIX}"
_QUERY_PROVIDERS = f"https://api.themoviedb.org/3/watch/providers/movie?{_LANG_REG_POSTFIX}"

_GENRES = None
_MOVIE_MAP = {}
_PROVIDERS = None
_PROVIDER_ID_MAP = {}

_API_DISABLED = None


def apiDisabled() -> bool:
  global _API_DISABLED
  if _API_DISABLED is None:
    global _TMDB_API_KEY, _LANG_REG_POSTFIX, _TMDB_API_TIMEOUT

    headers = {
      "Authorization": f"Bearer {_TMDB_API_KEY}"
    }

    url = f"https://api.themoviedb.org/3/movie/popular?{_LANG_REG_POSTFIX}&page=1"
    response = requests.get(url, headers=headers, timeout=_TMDB_API_TIMEOUT)

    if response.status_code == 200:
        _API_DISABLED = False
        logger.info(f"TMDB API reachable => will be enabled!")
    elif response.status_code == 401:
        _API_DISABLED = True
        logger.warning(f"TMDB API reachable, but API Key invalid => will be disabled!")
    else:
        _API_DISABLED = True
        logger.warning(f"TMDB API not reachable => will be disabled!")

  return _API_DISABLED

def get_poster_by_id(tmdb_id) -> Poster|None:
  global _TMDB_API_KEY
  if _TMDB_API_KEY is None or _TMDB_API_KEY == '' or _TMDB_API_KEY == '-' or apiDisabled():
    return None

  logger.debug(f"try to receive image from tmdb id ...")

  data = _getPureMovie(tmdb_id)
  
  if data is not None and 'poster_path' in data:
    return _get_poster_by_poster_path(data['poster_path'])

  return None

def _get_poster_by_poster_path(poster_path) -> Poster|None:
  poster_url = _QUERY_POSTER.replace('<poster_path>', poster_path)
  return fetch_http_image(poster_url)

def listGenres() -> List[GenreId]:
  if apiDisabled():
    return []

  global _GENRES
  if _GENRES is None:
    global _QUERY_GENRES
    data = _make_tmdb_query(_QUERY_GENRES)
    genres = list(map(_normalise_genre, data['genres']))
    _GENRES = genres
  return _GENRES

def listRegionAvailableProvider() -> List[MovieProvider]:
  providers = []
  for provider in MovieProvider:
    if provider.useTmdbAsSource():
      tmbdId = _movieProvider2TmdbId(provider)
      if tmbdId > 0:
        providers.append(provider)
    else:
      providers.append(provider)
  return providers

def listProviders() -> List:
  if apiDisabled():
    return []

  global _PROVIDERS
  if _PROVIDERS is None:
    global _QUERY_PROVIDERS, _TMDB_API_REGION
    data = _make_tmdb_query(_QUERY_PROVIDERS)
    providers = []
    for provider in data['results']:
      name = provider['provider_name']
      id = provider['provider_id']
      regions = list(provider['display_priorities'].keys())
      if _TMDB_API_REGION not in regions:
        logger.debug(f"Provider '{name}' not available in region '{_TMDB_API_REGION}' => skipping.")
        continue

      providers.append({
        'name': name,
        'id': id,
        'regions': regions
      })
    _PROVIDERS = providers
  return _PROVIDERS

def _movieProvider2TmdbId(provider : MovieProvider) -> int:
    global _PROVIDER_ID_MAP
    
    if provider in _PROVIDER_ID_MAP:
      providerID = _PROVIDER_ID_MAP.get(provider)
      if providerID is not None:
        return providerID
      return -1

    for tmdb_provider in listProviders():
        # TODO hier muss ggf angepasst werden für weitere Provider
        try:
          match = mp_fromString(tmdb_provider['name'].lower())
        except ValueError:
          continue

        if match == provider:
          _PROVIDER_ID_MAP[provider] = tmdb_provider['id']
          return tmdb_provider['id']

    _PROVIDER_ID_MAP[provider] = -1
    return -1

def _tmdbId2MovieProvider(tmdb_id: int, monetarization: MovieMonetarization) -> MovieProvider|None:
  for provider in MovieProvider:
    if provider.useTmdbAsSource() and provider.getMonetarization() == monetarization:
      provider_tmdb_id = _movieProvider2TmdbId(provider)
      if provider_tmdb_id == tmdb_id:
        return provider
  return None

def listMovieIds(session: VotingSession) -> List[MovieId]:
  if apiDisabled():
    return []

  global _QUERY_DISCOVER, _TMDB_API_DISCOVER_SORT, _TMDB_API_DISCOVER_TOTAL
  providers = []
  for provider in session.getMovieProvider():
    if provider.useTmdbAsSource():
      tmbd_id = _movieProvider2TmdbId(provider)
      if tmbd_id > 0:
        providers.append(str(tmbd_id))

  if len(providers) <= 0:
    return []
  
  disabledGenreIds = session.getDisabledGenres()
  mustGenreIds = session.getMustGenres()
  baseQuery = _QUERY_DISCOVER \
    .replace('<provider_id>', '|'.join(providers)) \
    .replace('<sort_by>', _TMDB_API_DISCOVER_SORT) \
    .replace('<release_date.lte>', datetime.now().strftime('%Y-%m-%d'))
  
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
        movieIds.append(MovieId(MovieSource.TMDB, movie['id']))
  
  return movieIds
  

def _normalise_genre(genre) -> GenreId:
  return GenreId(genre['name'], tmdb_id=genre['id'])

def _getPureMovie(tmdb_id: int):
  global _MOVIE_MAP, _QUERY_MOVIE
  if tmdb_id in _MOVIE_MAP:
    logger.debug(f"getting tmdb movie with id {tmdb_id} from cache")
    return _MOVIE_MAP.get(tmdb_id)

  query =  _QUERY_MOVIE.replace('<tmdb_id>', str(tmdb_id))
  data = _make_tmdb_query(query)

  if data is None or 'id' not in data:
    data = None

  _MOVIE_MAP[tmdb_id] = data
  
  return data

def getMovieById(movie_id: int) -> Movie|None:
  if apiDisabled():
    return None

  data = _getPureMovie(movie_id)

  if data is None:
    return None

  result = Movie(
            MovieId(MovieSource.TMDB, movie_id),
            data['title'],
            data['overview'],
            data['release_date'].split('-')[0],
            _extract_genres(data['genres']),
            data['runtime'],
            _extract_age(data['release_dates']['results'])
  )

  result.set_tmdbid(movie_id)
  result.set_original_title(data['original_title'])
  
  kodiId = kodi.getMovieIdByTitleYear(set([result.title, result.original_title]), result.year)
  if kodiId > 0:
    result.add_provider(MovieProvider.KODI)
  embyId = emby.getMovieIdByTitleYear(set([result.title, result.original_title]), result.year)
  if embyId > 0:
    result.add_provider(MovieProvider.EMBY)
  result.add_providers(_extract_provider(data['watch/providers']['results']))

  if 'imdb_id' in data:
    result.set_imdbid(data['imdb_id'])

  if 'poster_path' in data:
    result.thumbnail_sources.append((_get_poster_by_poster_path, (data['poster_path'], )))

  return result

def _extract_provider(tmdb_providers) -> List[MovieProvider]:
  global _TMDB_API_REGION

  providers = []
  if _TMDB_API_REGION in tmdb_providers:
    movie_providers = tmdb_providers[_TMDB_API_REGION]
    if 'flatrate' in movie_providers:
      for provider in movie_providers['flatrate']:
        internal_provider = _tmdbId2MovieProvider(provider['provider_id'], MovieMonetarization.FLATRATE)
        if internal_provider is not None:
          providers.append(internal_provider)
    if 'rent' in movie_providers:
      for provider in movie_providers['rent']:
        internal_provider = _tmdbId2MovieProvider(provider['provider_id'], MovieMonetarization.RENT)
        if internal_provider is not None:
          providers.append(internal_provider)
    if 'buy' in movie_providers:
      for provider in movie_providers['buy']:
        internal_provider = _tmdbId2MovieProvider(provider['provider_id'], MovieMonetarization.BUY)
        if internal_provider is not None:
          providers.append(internal_provider)
    if 'free' in movie_providers:
      for provider in movie_providers['free']:
        internal_provider = _tmdbId2MovieProvider(provider['provider_id'], MovieMonetarization.FREE)
        if internal_provider is not None:
          providers.append(internal_provider)

  return providers

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
    result.append(GenreId(genre['name'], tmdb_id=genre['id']))
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