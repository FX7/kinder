import logging
import os
from typing import List, Set

import requests
from api.models.GenreId import GenreId
from api.models.Movie import Movie
from api.models.MovieId import MovieId

logger = logging.getLogger(__name__)

_EMBY_USERNAME = os.environ.get('KT_EMBY_USERNAME', 'kodi')
_EMBY_PASSWORD = os.environ.get('KT_EMBY_PASSWORDERNAME', 'kodi')
_EMBY_URL = 'http://' + os.environ.get('KT_EMBY_HOST', '127.0.0.1') + ':' + os.environ.get('KT_EMBY_PORT', '8080') + '/jsonrpc'
_EMBY_TIMEOUT = int(os.environ.get('KT_EMBY_TIMEOUT', '1'))

_API_DISABLED = None

def _apiDisabled() -> bool:
  global _API_DISABLED, _EMBY_URL

  if _API_DISABLED is None:
    try:
        response = requests.get(_EMBY_URL, timeout=_EMBY_TIMEOUT)
        _API_DISABLED = response.status_code != 200
        if _API_DISABLED:
          logger.warning(f"Emby API responded with !== 200 status_code => will be disabled!")
        else:
          logger.info(f"Emby API reachable => will be enabled!")
    except Exception as e:
        logger.warning(f"Emby API throwed Exception {e} => will be disabled!")
        _API_DISABLED = True

  return _API_DISABLED

def getMovieById(emby_id: int) -> Movie|None:
    if _apiDisabled():
        return None
    
    # TODO
    return None

def listMovieIds() -> List[MovieId]:
    if _apiDisabled():
        return []

    # TODO
    return []

def listGenres() -> List[GenreId]:
    if _apiDisabled():
        return []

    # TODO
    return []

def getMovieIdByTitleYear(titles: Set[str|None], year: int) -> int:
    emby_id = -1

    if _apiDisabled():
        return emby_id

    # TODO
    return emby_id
