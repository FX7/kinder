import logging
import math
import os
from typing import List, Set

import requests
import urllib.parse
from api.image_fetcher import fetch_http_image
from api.models.GenreId import GenreId
from api.models.Movie import Movie
from api.models.MovieId import MovieId
from api.models.MovieProvider import MovieProvider
from api.models.MovieSource import MovieSource
from api.models.Poster import Poster
from .source import Source

class Plex(Source):
  logger = logging.getLogger(__name__)

  _MOVIE_IDS = None
  _GENRES = None
  _API_DISABLED = None

  _instance = None

  def __new__(cls, *args, **kwargs):
    if cls._instance is None:
        cls._instance = super(Plex, cls).__new__(cls)
    return cls._instance

  def isApiDisabled(self) -> bool:

    # TODO
    if self._API_DISABLED is None:
        self._API_DISABLED = True

    return self._API_DISABLED

  def getMovieIdByTitleYear(self, titles: Set[str|None], year: int) -> int:
    plex_id = -1

    if self.isApiDisabled():
      return plex_id

    return plex_id


  def getMovieById(self, plex_id: str) -> Movie|None:
    if self.isApiDisabled():
        return None

    # TODO
    return None

  def listMovieIds(self) -> List[MovieId]:
    if self.isApiDisabled():
        return []

    # TODO
    if self._MOVIE_IDS is None:
        self._MOVIE_IDS = []

    return self._MOVIE_IDS

  def listGenres(self) -> List[GenreId]:
    if self.isApiDisabled():
        return []

    #TODO
    if self._GENRES is None:
        self._GENRES = []

    return self._GENRES

  
  @staticmethod
  def getInstance() -> 'Plex' :
    return Plex()