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

_API_DISABLED = None

_GENRES = None

def apiDisabled() -> bool:
  global _API_DISABLED, _JELLYFIN_URL

  if _API_DISABLED is None:
    # TODO
    _API_DISABLED = True

  return _API_DISABLED

def getMovieById(jellyfin_id: int) -> Movie|None:
    if apiDisabled():
        return None

    # TODO
    return None

def listMovieIds() -> List[MovieId]:
    if apiDisabled():
        return []

    # TODO
    return []

def listGenres() -> List[GenreId]:
    if apiDisabled():
        return []

    global _GENRES
    if _GENRES is None:
        # TODO
        _GENRES = []

    return _GENRES


  