import logging
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

_EMBY_API_KEY = os.environ.get('KT_EMBY_API_KEY', '-')
_EMBY_URL = os.environ.get('KT_EMBY_URL', 'http://localhost/')
_EMBY_TIMEOUT = int(os.environ.get('KT_EMBY_TIMEOUT', '1'))

_QUERY_MOVIES = f"{_EMBY_URL}emby/Items?api_key={_EMBY_API_KEY}&Recursive=true&IncludeItemTypes=Movie"
_QUERY_MOVIE_BY_ID = f"{_EMBY_URL}emby/Items?Ids=<movie_id>&api_key={_EMBY_API_KEY}"
_QUERY_IMAGE = f"{_EMBY_URL}emby/Items/<itemId>/Images/<imageType>?tag=<imageTag>&api_key={_EMBY_API_KEY}"

_API_DISABLED = None

def apiDisabled() -> bool:
  global _API_DISABLED, _EMBY_URL

  if _API_DISABLED is None:
    try:
        response = requests.get(_QUERY_MOVIES, timeout=_EMBY_TIMEOUT)
        if response.status_code == 200:
            _API_DISABLED = False
            logger.info(f"Emby API reachable => will be enabled!")
        elif response.status_code == 401:
            _API_DISABLED = True
            logger.warning(f"Emby API reachable, but API Key invalid => will be disabled!")
        else:
            _API_DISABLED = True
            logger.warning(f"Emby API not reachable => will be disabled!")
    except Exception as e:
        logger.warning(f"Emby API throwed Exception {e} => will be disabled!")
        _API_DISABLED = True

  return _API_DISABLED

def getMovieById(emby_id: int) -> Movie|None:
    if apiDisabled():
        return None
    
    global _QUERY_MOVIE_BY_ID
    query = _QUERY_MOVIE_BY_ID.replace('<movie_id>', str(emby_id))
    result = _make_emby_query(query)
    
    if result is None or 'Items' not in result or len(result['Items']) == 0:
        return None
    
    embyMovie = result['Items'][0]
    movie = Movie(MovieId(
        MovieSource.EMBY, int(emby_id)),
        embyMovie['Name'],
        '',
        -1,
        [],
        -1)
    movie.add_provider(MovieProvider.EMBY)

    if 'ImageTags' in embyMovie and 'Primary' in embyMovie['ImageTags']:
        movie.thumbnail_sources.append((_fetch_image, (emby_id, 'Primary', embyMovie['ImageTags']['Primary'])))

    # if 'ImageTags' in embyMovie and 'Logo' in embyMovie['ImageTags']:
    #     movie.poster_sources.append((_fetch_image, (emby_id, 'Logo', embyMovie['ImageTags']['Logo'])))

    # if 'ImageTags' in embyMovie and 'Thumb' in embyMovie['ImageTags']:
    #     movie.poster_sources.append((_fetch_image, (emby_id, 'Thumb', embyMovie['ImageTags']['Thumb'])))

    return movie

def _fetch_image(itemId, imageType, imageTag) -> Poster|None:
    global _QUERY_IMAGE
    url = _QUERY_IMAGE.replace('<itemId>', str(itemId)).replace('<imageType>', imageType).replace('<imageTag>', imageTag)
    return fetch_http_image(url)

def listMovieIds() -> List[MovieId]:
    if apiDisabled():
        return []

    global _QUERY_MOVIES
    response = _make_emby_query(_QUERY_MOVIES)
    movieIds = [MovieId(MovieSource.EMBY, item['Id']) for item in response['Items']]
    return movieIds

def listGenres() -> List[GenreId]:
    if apiDisabled():
        return []

    # TODO
    return []

def getMovieIdByTitleYear(titles: Set[str|None], year: int) -> int:
    emby_id = -1

    if apiDisabled():
        return emby_id

    # TODO
    return emby_id


def _make_emby_query(query):
  global _EMBY_TIMEOUT, _EMBY_API_KEY

  logger.debug(f"making emby query {query}")

  response = requests.get(query, timeout=_EMBY_TIMEOUT)
  status_code = response.status_code
  if status_code == 200:
    try:
        json = response.json()
    except Exception:
        logger.error(f"Result was no json!")
        raise LookupError(f"Seems like we couldnt connect to Tmdb! Make sure API Key is set correctly!")
  else:
    raise LookupError(f"Unexpected status code {status_code} from response {response}")    

  logger.debug(f"emby query result {json}/{status_code}")
  return json

  