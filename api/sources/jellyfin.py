import logging
import math
import os
import re

import requests
import urllib.parse
from api.age_transormer import extract_age_rating
from api.image_fetcher import fetch_http_image
from api.models.GenreId import GenreId
from api.models.Movie import Movie
from api.models.MovieId import MovieId
from api.models.MovieSource import MovieSource
from api.models.Poster import Poster
from api.models.db.VotingSession import VotingSession
from .source import Source


class _JellyfinApiImplementation:
  def __init__(self, api_key: str, timeout: int):
    self.api_key = api_key
    self.timeout = timeout

  def headers(self) -> dict[str, str]:
    raise NotImplementedError

  def get(self, url: str) -> requests.Response:
    return requests.get(url, headers=self.headers(), timeout=self.timeout)


class _JellyfinApi11(_JellyfinApiImplementation):
  """Jellyfin API 11 transport using the established X-Emby-Token header."""

  def headers(self) -> dict[str, str]:
    return {"X-Emby-Token": self.api_key}


class _JellyfinApi12(_JellyfinApiImplementation):
  """Jellyfin API 12 transport using MediaBrowser authorization plus the legacy token header."""

  def headers(self) -> dict[str, str]:
    return {
      "Authorization": f'MediaBrowser Token="{self.api_key}"',
      "X-Emby-Token": self.api_key
    }


class Jellyfin(Source):
  logger = logging.getLogger(__name__)

  _JELLYFIN_API_KEY = os.environ.get('KT_JELLYFIN_API_KEY', '-')
  _JELLYFIN_API_VERSION = os.environ.get('KT_JELLYFIN_API_VERSION', '').strip().lower()
  _JELLYFIN_URL = os.environ.get('KT_JELLYFIN_URL', 'http://localhost/').rstrip('/') + '/'
  _JELLYFIN_TIMEOUT = int(os.environ.get('KT_JELLYFIN_TIMEOUT', '1'))

  _QUERY_MOVIES = f"{_JELLYFIN_URL}Items?IncludeItemTypes=Movie&Recursive=True"
  _QUERY_GENRE = f"{_JELLYFIN_URL}Genres"
  _QUERY_MOVIE_BY_ID = f"{_JELLYFIN_URL}Items?Ids=<movie_id>&Fields=Genres,ProductionYear,Overview,OfficialRating,CommunityRating,UserRating,VoteCount"
  _QUERY_IMAGE = f"{_JELLYFIN_URL}Items/<itemId>/Images/<imageType>?tag=<imageTag>"
  _QUERY_MOVIE_BY_TITLE_YEAR = f"{_JELLYFIN_URL}Items?IncludeItemTypes=Movie&Recursive=True&SearchTerm=<title>&Filters=IsNotFolder&Fields=ProductionYear"
  _QUERY_SYSTEM_INFO_PUBLIC = f"{_JELLYFIN_URL}System/Info/Public"

  _API_DISABLED = None

  _instance = None

  def __new__(cls, *args, **kwargs):
    if cls._instance is None:
        cls._instance = super(Jellyfin, cls).__new__(cls)
    return cls._instance

  def __init__(self):
    if getattr(self, '_initialized', False):
      return

    explicit_version = self._parse_api_version(self._JELLYFIN_API_VERSION)
    self._implementation = self._create_implementation(explicit_version or 12)
    self._detected_api_version = explicit_version
    self._initialized = True

    if explicit_version is not None:
      self.logger.info(f"Using explicitly configured Jellyfin API {explicit_version} transport.")

  def _create_implementation(self, api_version: int) -> _JellyfinApiImplementation:
    if api_version == 11:
      return _JellyfinApi11(self._JELLYFIN_API_KEY, self._JELLYFIN_TIMEOUT)
    return _JellyfinApi12(self._JELLYFIN_API_KEY, self._JELLYFIN_TIMEOUT)

  @staticmethod
  def _parse_api_version(value: str) -> int|None:
    if value in ('', 'auto', 'detect', 'default'):
      return None

    match = re.search(r'(11|12)', value)
    if match:
      return int(match.group(1))
    return None

  def _detect_api_version(self) -> int|None:
    if self._detected_api_version is not None:
      return self._detected_api_version

    try:
      response = requests.get(
        self._QUERY_SYSTEM_INFO_PUBLIC,
        timeout=self._JELLYFIN_TIMEOUT
      )
      if response.status_code == 200:
        server_version = str(response.json().get('Version', '')).strip()
        parts = [int(part) for part in re.findall(r'\d+', server_version)[:2]]

        if len(parts) >= 1:
          if parts[0] >= 11:
            detected = 12
          elif len(parts) >= 2 and parts[0] == 10 and parts[1] >= 11:
            detected = 12
          else:
            detected = 11

          self._switch_api_version(detected)
          self.logger.info(
            f"Detected Jellyfin server version {server_version or 'unknown'}; using Jellyfin API {detected} transport."
          )
          return detected
    except Exception as e:
      self.logger.debug(f"Automatic Jellyfin API version detection failed: {e}")

    self.logger.warning("Could not detect the Jellyfin API version; trying the configured/fallback transports.")
    self._switch_api_version(12)
    return None

  def _switch_api_version(self, api_version: int) -> None:
    self._detected_api_version = api_version
    self._implementation = self._create_implementation(api_version)

  def isApiDisabled(self, forceReCheck = False) -> bool:
    if self._API_DISABLED is None or forceReCheck:
      if forceReCheck:
        self.logger.debug(f"Will force recheck of Jellyfin API availability.")
      try:
          if self._JELLYFIN_API_KEY is None or self._JELLYFIN_API_KEY == '' or self._JELLYFIN_API_KEY == '-' \
          or self._JELLYFIN_URL is None or self._JELLYFIN_URL == '' or self._JELLYFIN_URL == '-':
            if self._API_DISABLED is None:
              self.logger.warning(f"No Jellyfin API Key / URL set => will be disabled!")
            self._API_DISABLED = True
          else:
            if self._parse_api_version(self._JELLYFIN_API_VERSION) is None:
              self._detect_api_version()

            response = self._implementation.get(self._QUERY_GENRE)

            # Public server metadata is not always available. As a fallback, probe
            # API 12 first and then API 11 when the server rejects the newer transport.
            if response.status_code == 401 and self._parse_api_version(self._JELLYFIN_API_VERSION) is None:
              if self._detected_api_version == 12:
                self._switch_api_version(11)
              elif self._detected_api_version is None:
                self._switch_api_version(11)
              response = self._implementation.get(self._QUERY_GENRE)

            if response.status_code == 200:
                self._API_DISABLED = False
                self.logger.info(f"Jellyfin API reachable using API {self._detected_api_version or 'legacy'} => will be enabled!")
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

  def getMovieById(self, jellyfin_id: str, language: str) -> Movie|None:
    if self.isApiDisabled():
        return None

    query = self._QUERY_MOVIE_BY_ID.replace('<movie_id>', str(jellyfin_id))
    result = self._make_jellyfin_query(query)
    
    if result is None or 'Items' not in result or len(result['Items']) == 0:
        return None
    
    jellyfinMovie = result['Items'][0]
    movie = Movie(MovieId(
        MovieSource.JELLYFIN, jellyfin_id, language),
        jellyfinMovie['Name'],
        jellyfinMovie['Overview'] if 'Overview' in jellyfinMovie else '',
        jellyfinMovie['ProductionYear'] if 'ProductionYear' in jellyfinMovie else -1,
        self._exract_genre(jellyfinMovie['Genres']),
        math.ceil((jellyfinMovie['RunTimeTicks']/10_000_000)/60) if 'RunTimeTicks' in jellyfinMovie else -1,
        extract_age_rating(jellyfinMovie['OfficialRating'] if 'OfficialRating' in jellyfinMovie else None)
    )

    rating = jellyfinMovie.get('CommunityRating', 0.0) if 'CommunityRating' in jellyfinMovie else None
    votes = jellyfinMovie.get('VoteCount', 0) if 'VoteCount' in jellyfinMovie else None
    movie.set_rating(rating, votes)

    if 'ProviderIds' in jellyfinMovie and 'Tmdb' in jellyfinMovie['ProviderIds']:
        movie.set_tmdbid(jellyfinMovie['ProviderIds']['Tmdb'])

    if 'ProviderIds' in jellyfinMovie and 'Imdb' in jellyfinMovie['ProviderIds']:
        movie.set_imdbid(jellyfinMovie['ProviderIds']['Imdb'])

    if 'ImageTags' in jellyfinMovie and 'Primary' in jellyfinMovie['ImageTags']:
        movie.thumbnail_sources.append((self._fetch_image, (jellyfin_id, 'Primary', jellyfinMovie['ImageTags']['Primary'])))

    return movie

  def _fetch_image(self, itemId, imageType, imageTag) -> Poster|None:
      url = self._QUERY_IMAGE.replace('<itemId>', str(itemId)).replace('<imageType>', imageType).replace('<imageTag>', imageTag)
      return fetch_http_image(url, self._implementation.headers())

  def _exract_genre(self, genres):
      result = []
      for genre in genres:
          result.append(GenreId(genre))
      return result

  def listMovieIds(self, votingSession: VotingSession) -> list[MovieId]:
    if self.isApiDisabled():
        return []

    language = votingSession.getLanguage()
    try:
      response = self._make_jellyfin_query(self._QUERY_MOVIES)
      movieIds = [MovieId(MovieSource.JELLYFIN, item['Id'], language) for item in response['Items']]
      return movieIds
    except Exception as e:
      self.logger.error(f"Exception {e} during listMovieIds from Jellyfin -> No movies will be returned!")
      return []

  def listGenres(self, language: str) -> list[GenreId]:
    if self.isApiDisabled():
      return []

    response = self._make_jellyfin_query(self._QUERY_GENRE)
    genres = []
    if response is not None and 'Items' in response:
        genres = list(map(self._normalise_genre, response["Items"]))
    return genres

  def _normalise_genre(self, genre) -> GenreId:
    return GenreId(genre['Name'], jellyfin_id=genre['Id'])

  def _make_jellyfin_query(self, query):
    self.logger.debug(f"making jellyfin query {query}")

    response = self._implementation.get(query)
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
  def getInstance(reset: bool = False) -> 'Jellyfin' :
    if reset:
      Jellyfin._instance = None
    return Jellyfin()