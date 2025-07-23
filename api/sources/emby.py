import logging
import math
import os
from typing import List, Set
import urllib.parse
import requests
from api.image_fetcher import fetch_http_image
from api.models.GenreId import GenreId
from api.models.Movie import Movie
from api.models.MovieId import MovieId
from api.models.MovieProvider import MovieProvider
from api.models.MovieSource import MovieSource
from api.models.Poster import Poster
from .source import Source

class Emby(Source):
  logger = logging.getLogger(__name__)

  _EMBY_API_KEY = os.environ.get('KT_EMBY_API_KEY', '-')
  _EMBY_URL = os.environ.get('KT_EMBY_URL', 'http://localhost/')
  _EMBY_TIMEOUT = int(os.environ.get('KT_EMBY_TIMEOUT', '1'))

  _QUERY_MOVIES = f"{_EMBY_URL}emby/Items?api_key={_EMBY_API_KEY}&Recursive=true&IncludeItemTypes=Movie"
  _QUERY_MOVIE_BY_ID = f"{_EMBY_URL}emby/Items?Ids=<movie_id>&api_key={_EMBY_API_KEY}&Fields=Genres,ProductionYear,Overview,OfficialRating"
  _QUERY_IMAGE = f"{_EMBY_URL}emby/Items/<itemId>/Images/<imageType>?tag=<imageTag>&api_key={_EMBY_API_KEY}"
  _QUERY_GENRE = f"{_EMBY_URL}emby/Genres?api_key={_EMBY_API_KEY}"
  _QUERY_MOVIE_BY_TITLE_YEAR = f"{_EMBY_URL}emby/Items?api_key={_EMBY_API_KEY}&IncludeItemTypes=Movie&Recursive=true&SearchTerm=<title>&Filters=IsNotFolder&Fields=ProductionYear"

  _MOVIE_IDS = None
  _GENRES = None
  _API_DISABLED = None

  _instance = None

  def __new__(cls, *args, **kwargs):
      if cls._instance is None:
          cls._instance = super(Emby, cls).__new__(cls)
      return cls._instance

  def isApiDisabled(self) -> bool:
    if self._API_DISABLED is None:
      try:
          response = requests.get(self._QUERY_MOVIES, timeout=self._EMBY_TIMEOUT)
          if response.status_code == 200:
              self._API_DISABLED = False
              self.logger.info(f"Emby API reachable => will be enabled!")
          elif response.status_code == 401:
              self._API_DISABLED = True
              self.logger.warning(f"Emby API reachable, but API Key invalid => will be disabled!")
          else:
              self._API_DISABLED = True
              self.logger.warning(f"Emby API not reachable => will be disabled!")
      except Exception as e:
          self._API_DISABLED = True
          self.logger.warning(f"Emby API throwed Exception {e} => will be disabled!")

    return self._API_DISABLED

  def getMovieById(self, emby_id: int) -> Movie|None:
    if self.isApiDisabled():
        return None
    
    query = self._QUERY_MOVIE_BY_ID.replace('<movie_id>', str(emby_id))
    result = self._make_emby_query(query)
    
    if result is None or 'Items' not in result or len(result['Items']) == 0:
        return None
    
    embyMovie = result['Items'][0]
    movie = Movie(MovieId(
        MovieSource.EMBY, int(emby_id)),
        embyMovie['Name'],
        embyMovie['Overview'] if 'Overview' in embyMovie else '',
        embyMovie['ProductionYear'] if 'ProductionYear' in embyMovie else -1,
        self._exract_genre(embyMovie['GenreItems']),
        math.ceil((embyMovie['RunTimeTicks']/10_000_000)/60),
        self._extract_fsk(embyMovie['OfficialRating'] if 'OfficialRating' in embyMovie else None)
    )

    if 'ProviderIds' in embyMovie and 'Tmdb' in embyMovie['ProviderIds']:
        movie.set_tmdbid(embyMovie['ProviderIds']['Tmdb'])

    if 'ProviderIds' in embyMovie and 'Imdb' in embyMovie['ProviderIds']:
        movie.set_imdbid(embyMovie['ProviderIds']['Imdb'])

    if 'ImageTags' in embyMovie and 'Primary' in embyMovie['ImageTags']:
        movie.thumbnail_sources.append((self._fetch_image, (emby_id, 'Primary', embyMovie['ImageTags']['Primary'])))

    # if 'ImageTags' in embyMovie and 'Logo' in embyMovie['ImageTags']:
    #     movie.poster_sources.append((_fetch_image, (emby_id, 'Logo', embyMovie['ImageTags']['Logo'])))

    # if 'ImageTags' in embyMovie and 'Thumb' in embyMovie['ImageTags']:
    #     movie.poster_sources.append((_fetch_image, (emby_id, 'Thumb', embyMovie['ImageTags']['Thumb'])))

    return movie

  def _extract_fsk(self, rating) -> int | None:
    if rating is None or rating == '':
      return None
    
    try:
      rated = str(rating).lower().replace('fsk-', '')
      return int(rated)
    except ValueError:
      self.logger.error(f"couldnt transform emby rating {rating}")
      return None

  def _exract_genre(self, genres):
      result = []
      for genre in genres:
          result.append(GenreId(genre['Name']))
      return result

  def _fetch_image(self, itemId, imageType, imageTag) -> Poster|None:
      url = self._QUERY_IMAGE.replace('<itemId>', str(itemId)).replace('<imageType>', imageType).replace('<imageTag>', imageTag)
      return fetch_http_image(url)

  def listMovieIds(self) -> List[MovieId]:
    if self.isApiDisabled():
      return []

    if self._MOVIE_IDS is None:
      try:
        response = self._make_emby_query(self._QUERY_MOVIES)
        movieIds = [MovieId(MovieSource.EMBY, item['Id']) for item in response['Items']]
        self._MOVIE_IDS = movieIds
      except Exception as e:
        self.logger.error(f"Exception {e} during listMovieIds from Emby -> No movies will be returned!")
        self._MOVIE_IDS = []

    return self._MOVIE_IDS

  def listGenres(self) -> List[GenreId]:
      if self.isApiDisabled():
          return []

      if self._GENRES is None:
          response = self._make_emby_query(self._QUERY_GENRE)
          genres = []
          if response is not None and 'Items' in response:
              genres = list(map(self._normalise_genre, response["Items"]))
          self._GENRES = genres

      return self._GENRES

  def _normalise_genre(self, genre) -> GenreId:
      return GenreId(genre['Name'], emby_id=int(genre['Id']))

  def getMovieIdByTitleYear(self, titles: Set[str|None], year: int) -> int:
    emby_id = -1

    if self.isApiDisabled():
      return emby_id

    try:
      for title in titles:
        if title is None:
          continue
        emby_id = self._getMovieIdByTitleYear(title, year)
        if emby_id > 0:
          break
    except Exception as e:
      self.logger.error(f"Exception {e} during getMovieIdByTitleYear from Emby -> No movie will be returned!")

    return emby_id


  def _getMovieIdByTitleYear(self, title: str, year: int) -> int:
    query = self._QUERY_MOVIE_BY_TITLE_YEAR.replace('<title>', urllib.parse.quote(title.lower()))

    result = self._make_emby_query(query)
    if 'Items' in result and len(result['Items']) > 0:
      for movie in result['Items']:
        if 'ProductionYear' in movie and str(movie['ProductionYear']) == str(year):
            return int(movie['Id'])

    return -1

  def _make_emby_query(self, query):
    self.logger.debug(f"making emby query {query}")

    response = requests.get(query, timeout=self._EMBY_TIMEOUT)
    status_code = response.status_code
    if status_code == 200:
      try:
          json = response.json()
      except Exception:
          self.logger.error(f"Result was no json!")
          raise LookupError(f"Seems like we couldnt connect to Tmdb! Make sure API Key is set correctly!")
    else:
      raise LookupError(f"Unexpected status code {status_code} from response {response}")    

    self.logger.debug(f"emby query result {json}/{status_code}")
    return json

  @staticmethod
  def getInstance() -> 'Emby' :
    return Emby()