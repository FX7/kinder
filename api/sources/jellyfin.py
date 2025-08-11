import logging
import math
import os

import requests
import urllib.parse
from api.age_transormer import extract_age_rating
from api.image_fetcher import fetch_http_image
from api.models.GenreId import GenreId
from api.models.Movie import Movie
from api.models.MovieId import MovieId
from api.models.MovieProvider import MovieProvider
from api.models.MovieSource import MovieSource
from api.models.Poster import Poster
from .source import Source

class Jellyfin(Source):
  logger = logging.getLogger(__name__)

  _JELLYFIN_API_KEY = os.environ.get('KT_JELLYFIN_API_KEY', '-')
  _JELLYFIN_URL = os.environ.get('KT_JELLYFIN_URL', 'http://localhost/')
  _JELLYFIN_TIMEOUT = int(os.environ.get('KT_JELLYFIN_TIMEOUT', '1'))

  _QUERY_MOVIES = f"{_JELLYFIN_URL}Items?IncludeItemTypes=Movie&Recursive=True"
  _QUERY_GENRE = f"{_JELLYFIN_URL}Genres"
  _QUERY_MOVIE_BY_ID = f"{_JELLYFIN_URL}Items?Ids=<movie_id>&Fields=Genres,ProductionYear,Overview,OfficialRating"
  _QUERY_IMAGE = f"{_JELLYFIN_URL}Items/<itemId>/Images/<imageType>?tag=<imageTag>"
  _QUERY_MOVIE_BY_TITLE_YEAR = f"{_JELLYFIN_URL}/Items?IncludeItemTypes=Movie&Recursive=True&SearchTerm=<title>&Filters=IsNotFolder&Fields=ProductionYear"

  _MOVIE_IDS = None
  _GENRES = None
  _API_DISABLED = None

  _instance = None

  def __new__(cls, *args, **kwargs):
    if cls._instance is None:
        cls._instance = super(Jellyfin, cls).__new__(cls)
    return cls._instance

  def isApiDisabled(self, forceReCheck = False) -> bool:
    if self._API_DISABLED is None or forceReCheck:
      try:
          if self._JELLYFIN_API_KEY is None or self._JELLYFIN_API_KEY == '' or self._JELLYFIN_API_KEY == '-' \
          or self._JELLYFIN_URL is None or self._JELLYFIN_URL == '' or self._JELLYFIN_URL == '-':
            if self._API_DISABLED is None: # log warn only for first check
              self.logger.warning(f"No Jellyfin API Key / URL set => will be disabled!")
            self._API_DISABLED = True
          else:
            headers = { "X-Emby-Token": f"{self._JELLYFIN_API_KEY}" }
            response = requests.get(self._QUERY_GENRE, headers=headers, timeout=self._JELLYFIN_TIMEOUT)
            if response.status_code == 200:
                self._API_DISABLED = False
                self.logger.info(f"Jellyfin API reachable => will be enabled!")
            elif response.status_code == 401:
                self._API_DISABLED = True
                self.logger.warning(f"Jellyfin API reachable, but API Key invalid => will be disabled!")
            else:
                self._API_DISABLED = True
                self.logger.warning(f"Jellyfin API not reachable => will be disabled!")
      except Exception as e:
          self._API_DISABLED = True
          self.logger.warning(f"Jellyfin API throwed Exception {e} => will be disabled!")

    return self._API_DISABLED

  def getMovieIdByTitleYear(self, titles: set[str|None], year: int) -> str|None:
    jellyfin_id = None

    if self.isApiDisabled():
      return jellyfin_id

    try:
      for title in titles:
        if title is None:
          continue
        jellyfin_id = self._getMovieIdByTitleYear(title, year)
        if jellyfin_id is not None:
          break
    except Exception as e:
      self.logger.error(f"Exception {e} during getMovieIdByTitleYear from Jellyfin -> No movie will be returned!")

    return jellyfin_id


  def _getMovieIdByTitleYear(self, title: str, year: int) -> str|None:
    query = self._QUERY_MOVIE_BY_TITLE_YEAR.replace('<title>', urllib.parse.quote(title.lower()))

    result = self._make_jellyfin_query(query)
    if 'Items' in result and len(result['Items']) > 0:
      for movie in result['Items']:
        if 'ProductionYear' in movie and str(movie['ProductionYear']) == str(year):
            return movie['Id']

    return None

  def getMovieById(self, jellyfin_id: str) -> Movie|None:
    if self.isApiDisabled():
        return None

    query = self._QUERY_MOVIE_BY_ID.replace('<movie_id>', str(jellyfin_id))
    result = self._make_jellyfin_query(query)
    
    if result is None or 'Items' not in result or len(result['Items']) == 0:
        return None
    
    jellyfinMovie = result['Items'][0]
    movie = Movie(MovieId(
        MovieSource.JELLYFIN, jellyfin_id),
        jellyfinMovie['Name'],
        jellyfinMovie['Overview'] if 'Overview' in jellyfinMovie else '',
        jellyfinMovie['ProductionYear'] if 'ProductionYear' in jellyfinMovie else -1,
        self._exract_genre(jellyfinMovie['Genres']),
        math.ceil((jellyfinMovie['RunTimeTicks']/10_000_000)/60),
        extract_age_rating(jellyfinMovie['OfficialRating'] if 'OfficialRating' in jellyfinMovie else None)
    )

    if 'ProviderIds' in jellyfinMovie and 'Tmdb' in jellyfinMovie['ProviderIds']:
        movie.set_tmdbid(jellyfinMovie['ProviderIds']['Tmdb'])

    if 'ProviderIds' in jellyfinMovie and 'Imdb' in jellyfinMovie['ProviderIds']:
        movie.set_imdbid(jellyfinMovie['ProviderIds']['Imdb'])

    if 'ImageTags' in jellyfinMovie and 'Primary' in jellyfinMovie['ImageTags']:
        movie.thumbnail_sources.append((self._fetch_image, (jellyfin_id, 'Primary', jellyfinMovie['ImageTags']['Primary'])))

    return movie

  def _fetch_image(self, itemId, imageType, imageTag) -> Poster|None:
      url = self._QUERY_IMAGE.replace('<itemId>', str(itemId)).replace('<imageType>', imageType).replace('<imageTag>', imageTag)
      return fetch_http_image(url)

  def _exract_genre(self, genres):
      result = []
      for genre in genres:
          result.append(GenreId(genre))
      return result

  def listMovieIds(self) -> list[MovieId]:
    if self.isApiDisabled():
        return []

    if self._MOVIE_IDS is None:
      try:
        response = self._make_jellyfin_query(self._QUERY_MOVIES)
        movieIds = [MovieId(MovieSource.JELLYFIN, item['Id']) for item in response['Items']]
        self._MOVIE_IDS = movieIds
      except Exception as e:
        self.logger.error(f"Exception {e} during listMovieIds from Jellyfin -> No movies will be returned!")
        self._MOVIE_IDS = []

    return self._MOVIE_IDS

  def listGenres(self) -> list[GenreId]:
      if self.isApiDisabled():
          return []

      if self._GENRES is None:
          response = self._make_jellyfin_query(self._QUERY_GENRE)
          genres = []
          if response is not None and 'Items' in response:
              genres = list(map(self._normalise_genre, response["Items"]))
          self._GENRES = genres

      return self._GENRES

  def _normalise_genre(self, genre) -> GenreId:
      return GenreId(genre['Name'], jellyfin_id=genre['Id'])

  def _make_jellyfin_query(self, query):
    self.logger.debug(f"making jellyfin query {query}")

    headers = {
      "X-Emby-Token": f"{self._JELLYFIN_API_KEY}"
    }

    response = requests.get(query, headers=headers, timeout=self._JELLYFIN_TIMEOUT)
    status_code = response.status_code
    try:
      json = response.json()
    except Exception:
      self.logger.error(f"Result was no json!")
      raise LookupError(f"Seems like we couldnt connect to Jellyfin! Make sure API Key is set correctly!")
      
    self.logger.debug(f"Jellyfin query result {json}/{status_code}")
    if status_code == 200:
      return json

    raise LookupError('Unexpected status code ' + str(status_code))
  
  @staticmethod
  def getInstance() -> 'Jellyfin' :
    return Jellyfin()