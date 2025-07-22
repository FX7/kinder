import logging
import math
import os
from typing import List, Set

import requests
from api.image_fetcher import fetch_http_image
from api.models.GenreId import GenreId
from api.models.Movie import Movie
from api.models.MovieId import MovieId
from api.models.MovieProvider import MovieProvider
from api.models.MovieSource import MovieSource
from api.models.Poster import Poster

logger = logging.getLogger(__name__)

_JELLYFIN_API_KEY = os.environ.get('KT_JELLYFIN_API_KEY', '-')
_JELLYFIN_URL = os.environ.get('KT_JELLYFIN_URL', 'http://localhost/')
_JELLYFIN_TIMEOUT = int(os.environ.get('KT_JELLYFIN_TIMEOUT', '1'))

_QUERY_MOVIES = f"{_JELLYFIN_URL}Items?IncludeItemTypes=Movie&Recursive=True"
_QUERY_GENRE = f"{_JELLYFIN_URL}Genres"
_QUERY_MOVIE_BY_ID = f"{_JELLYFIN_URL}Items?Ids=<movie_id>&Fields=Genres,ProductionYear,Overview,OfficialRating"
_QUERY_IMAGE = f"{_JELLYFIN_URL}Items/<itemId>/Images/<imageType>?tag=<imageTag>"


_API_DISABLED = None

_GENRES = None

def apiDisabled() -> bool:
  global _API_DISABLED, _JELLYFIN_URL, _JELLYFIN_TIMEOUT, _JELLYFIN_API_KEY

  if _API_DISABLED is None:
    try:
        headers = {
            "X-Emby-Token": f"{_JELLYFIN_API_KEY}"
        }

        response = requests.get(_QUERY_GENRE, headers=headers, timeout=_JELLYFIN_TIMEOUT)
        if response.status_code == 200:
            _API_DISABLED = False
            logger.info(f"Jellyfin API reachable => will be enabled!")
        elif response.status_code == 401:
            _API_DISABLED = True
            logger.warning(f"Jellyfin API reachable, but API Key invalid => will be disabled!")
        else:
            _API_DISABLED = True
            logger.warning(f"Jellyfin API not reachable => will be disabled!")
    except Exception as e:
        _API_DISABLED = True
        logger.warning(f"Jellyfin API throwed Exception {e} => will be disabled!")

  return _API_DISABLED

def getMovieById(jellyfin_id: str) -> Movie|None:
    if apiDisabled():
        return None

    global _QUERY_MOVIE_BY_ID
    query = _QUERY_MOVIE_BY_ID.replace('<movie_id>', str(jellyfin_id))
    result = _make_jellyfin_query(query)
    
    if result is None or 'Items' not in result or len(result['Items']) == 0:
        return None
    
    jellyfinMovie = result['Items'][0]
    movie = Movie(MovieId(
        MovieSource.JELLYFIN, jellyfin_id),
        jellyfinMovie['Name'],
        jellyfinMovie['Overview'] if 'Overview' in jellyfinMovie else '',
        jellyfinMovie['ProductionYear'] if 'ProductionYear' in jellyfinMovie else -1,
        _exract_genre(jellyfinMovie['Genres']),
        math.ceil((jellyfinMovie['RunTimeTicks']/10_000_000)/60),
        _extract_fsk(jellyfinMovie['OfficialRating'] if 'OfficialRating' in jellyfinMovie else None)
    )

    if 'ImageTags' in jellyfinMovie and 'Primary' in jellyfinMovie['ImageTags']:
        movie.thumbnail_sources.append((_fetch_image, (jellyfin_id, 'Primary', jellyfinMovie['ImageTags']['Primary'])))

    return movie

def _fetch_image(itemId, imageType, imageTag) -> Poster|None:
    global _QUERY_IMAGE
    url = _QUERY_IMAGE.replace('<itemId>', str(itemId)).replace('<imageType>', imageType).replace('<imageTag>', imageTag)
    return fetch_http_image(url)

def _exract_genre(genres):
    result = []
    for genre in genres:
        result.append(GenreId(genre))
    return result

def _extract_fsk(rating) -> int | None:
  if rating is None or rating == '':
    return None
  
  try:
    rated = str(rating).lower().replace('fsk-', '')
    return int(rated)
  except ValueError:
    logger.error(f"couldnt transform emby rating {rating}")
    return None

def listMovieIds() -> List[MovieId]:
    if apiDisabled():
        return []

    global _QUERY_MOVIES
    response = _make_jellyfin_query(_QUERY_MOVIES)
    movieIds = [MovieId(MovieSource.JELLYFIN, item['Id']) for item in response['Items']]
    return movieIds

def listGenres() -> List[GenreId]:
    if apiDisabled():
        return []

    global _GENRES
    if _GENRES is None:
        global _QUERY_GENRE
        response = _make_jellyfin_query(_QUERY_GENRE)
        genres = []
        if response is not None and 'Items' in response:
            genres = list(map(_normalise_genre, response["Items"]))
        _GENRES = genres

    return _GENRES

def _normalise_genre(genre) -> GenreId:
    return GenreId(genre['Name'], jellyfin_id=genre['Id'])

def _make_jellyfin_query(query):
  global _JELLYFIN_API_KEY, _JELLYFIN_TIMEOUT

  logger.debug(f"making jellyfin query {query}")

  headers = {
    "X-Emby-Token": f"{_JELLYFIN_API_KEY}"
  }

  response = requests.get(query, headers=headers, timeout=_JELLYFIN_TIMEOUT)
  status_code = response.status_code
  try:
    json = response.json()
  except Exception:
    logger.error(f"Result was no json!")
    raise LookupError(f"Seems like we couldnt connect to Jellyfin! Make sure API Key is set correctly!")
    
  logger.debug(f"Jellyfin query result {json}/{status_code}")
  if status_code == 200:
    return json

  raise LookupError('Unexpected status code ' + str(status_code))