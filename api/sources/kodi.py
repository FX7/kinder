import logging
import os
from typing import List, Set

import requests
from requests.auth import HTTPBasicAuth
import urllib.parse

from api import image_fetcher
from api.age_transormer import extract_age_rating
from api.models.Movie import Movie
from api.models.MovieId import MovieId
from api.models.GenreId import GenreId
from api.models.MovieProvider import MovieProvider
from api.models.MovieSource import MovieSource
from api.models.Poster import Poster
from .source import Source

class Kodi(Source):
  logger = logging.getLogger(__name__)

  _KODI_USERNAME = os.environ.get('KT_KODI_USERNAME', 'kodi')
  _KODI_PASSWORD = os.environ.get('KT_KODI_PASSWORDERNAME', 'kodi')
  _KODI_URL = 'http://' + os.environ.get('KT_KODI_HOST', '127.0.0.1') + ':' + os.environ.get('KT_KODI_PORT', '8080') + '/jsonrpc'
  _KODI_TIMEOUT = int(os.environ.get('KT_KODI_TIMEOUT', '1'))

  _QUERY_MOVIES = {
    "jsonrpc": "2.0",
    "method": "VideoLibrary.GetMovies",
    "params": {},
    "id": 1
  }

  _QUERY_MOVIE_BY_ID = {
    "jsonrpc": "2.0",
    "method": "VideoLibrary.GetMovieDetails",
    "params": {
      "movieid": 0,
      "properties": ["file", "title", "originaltitle", "plot", "thumbnail", "year", "genre", "art", "uniqueid", "runtime", "mpaa", "playcount"]
    },
    "id": 1
  }

  _QUERY_GENRES = {
    "jsonrpc": "2.0",
    "method": "VideoLibrary.GetGenres",
    "params": {
      "type": "movie"
    },
    "id": 1
  }

  _QUERY_PLAY_MOVIE = {
    "jsonrpc": "2.0",
    "method": "Player.Open",
    "params": {
      "item": {
        "movieid": 0
      }
    },
    "id": 1
  }

  _MOVIE_IDS = None
  _GENRES = None
  _API_DISABLED = None

  _instance = None

  def __new__(cls, *args, **kwargs):
      if cls._instance is None:
          cls._instance = super(Kodi, cls).__new__(cls)
      return cls._instance

  def isApiDisabled(self) -> bool:
    if self._API_DISABLED is None:
      try:
        response = requests.get(self._KODI_URL, auth=HTTPBasicAuth(self._KODI_USERNAME, self._KODI_PASSWORD), timeout=self._KODI_TIMEOUT)
        if response.status_code == 200:
            self._API_DISABLED = False
            self.logger.info(f"Kodi API reachable => will be enabled!")
        elif response.status_code == 401:
            self._API_DISABLED = True
            self.logger.warning(f"Kodi API reachable, but API Key invalid => will be disabled!")
        else:
            self._API_DISABLED = True
            self.logger.warning(f"Kodi API not reachable => will be disabled!")
      except Exception as e:
        self._API_DISABLED = True
        self.logger.warning(f"Kodi API throwed Exception {e} => will be disabled!")

    return self._API_DISABLED

  def playMovie(self, id: int):
    query = self._QUERY_PLAY_MOVIE.copy()
    query['params']['item']['movieid'] = int(id)
    return self._make_kodi_query(query)

  def listMovieIds(self) -> List[MovieId]:
    if self.isApiDisabled():
      return []

    if self._MOVIE_IDS is None:
      try:
        data = self._make_kodi_query(self._QUERY_MOVIES)
        if 'result' in data and 'movies' in data['result']:
          movies = data['result']['movies']
          ids = []
          for movie in movies:
            ids.append(MovieId(MovieSource.KODI, int(movie['movieid'])))
          self.logger.debug(f"found {len(ids)} movies")
          self._MOVIE_IDS = ids
        else:
          self._MOVIE_IDS = []
      except Exception as e:
        self.logger.error(f"Exception {e} during listMovieIds from Kodi -> No movies will be returned!")
        self._MOVIE_IDS = []
    return self._MOVIE_IDS

  def getMovieIdByTitleYear(self, titles: Set[str|None], year: int) -> int:
    kodi_id = -1

    if self.isApiDisabled():
      return kodi_id

    try:
      for title in titles:
        if title is None:
          continue
        kodi_id = self._getMovieIdByTitleYear(title, year, 'title')
        if kodi_id <= 0:
          kodi_id = self._getMovieIdByTitleYear(title, year, 'originaltitle')
        if kodi_id > 0:
          break
    except Exception as e:
      self.logger.error(f"Exception {e} during getMovieIdByTitleYear from Kodi -> No movie will be returned!")

    return kodi_id

  def _getMovieIdByTitleYear(self, title: str, year: int, titleField: str) -> int:
    query = {
      "jsonrpc": "2.0",
      "method": "VideoLibrary.GetMovies",
      "params": {
      "filter": {
        "and": [
          {
            "field": titleField,
            "operator": "is",
            "value": title
          },
          {
            "field": "year",
            "operator": "is",
            "value": year
          }
        ]
      },
        "properties": ["title", "year", "genre", "plot"]
      },
      "id": 1
    }

    result = self._make_kodi_query(query)
    if 'result' in result and 'movies' in result['result'] and len(result['result']['movies']) > 0:
      return result['result']['movies'][0]['movieid']
    return -1

  def getMovieById(self, kodi_id: int) -> Movie|None:
    if self.isApiDisabled():
      return None

    query = self._QUERY_MOVIE_BY_ID.copy()
    query['params']['movieid'] = int(kodi_id)
    data = self._make_kodi_query(query)

    if 'result' not in data or 'moviedetails' not in data['result']:
      return None

    moviedetails = data['result']['moviedetails']
    result = Movie(MovieId(
              MovieSource.KODI, kodi_id),
              moviedetails['title'],
              moviedetails['plot'],
              moviedetails['year'],
              self._extract_genre(moviedetails['genre']),
              self._runtime_in_minutes(moviedetails['runtime']),
              extract_age_rating(moviedetails['mpaa']),
              moviedetails['playcount'])

    result.set_original_title(moviedetails['originaltitle'])

    if 'uniqueid' in moviedetails and 'tmdb' in moviedetails['uniqueid']:
      result.set_tmdbid(moviedetails['uniqueid']['tmdb'])

    if 'uniqueid' in moviedetails and 'imdb' in moviedetails['uniqueid']:
      result.set_imdbid(moviedetails['uniqueid']['imdb'])

    if 'thumbnail' in moviedetails:
      result.thumbnail_sources.append((self._decode_image_url, (moviedetails['thumbnail'],)))

    if 'art' in moviedetails and 'poster' in moviedetails['art']:
      result.thumbnail_sources.append((self._decode_image_url, (moviedetails['art']['poster'],)))

    if 'file' in moviedetails:
      result.thumbnail_sources.append((self._decode_image_url, (moviedetails['file'],)))

    return result

  def _extract_genre(self, genres) -> List[GenreId]:
    result = []
    for genre in genres:
      result.append(GenreId(genre))
    return result

  def _runtime_in_minutes(self, runtime):
    if runtime is None or runtime <= 0:
      return 0
    
    return round(runtime / 60)

  def listGenres(self) -> List[GenreId]:
    if self.isApiDisabled():
      return []

    if self._GENRES is None:
      try:
        data = self._make_kodi_query(self._QUERY_GENRES)
        genres = list(map(self._normalise_genre, data["result"]["genres"]))
        self._GENRES = genres
      except Exception as e:
        self.logger.error(f"Exception {e} during listGenres from Kodi -> No genres will be returned!")
        self._GENRES = []
    return self._GENRES

  def _normalise_genre(self, genre) -> GenreId:
    return GenreId(genre['label'], kodi_id=genre['genreid'])

  def _make_kodi_query(self, query):
    self.logger.debug(f"making kodi query {query}")
    response = requests.post(self._KODI_URL, json=query, auth=HTTPBasicAuth(self._KODI_USERNAME, self._KODI_PASSWORD), timeout=self._KODI_TIMEOUT)
    status_code = response.status_code
    try:
      json = response.json()
    except Exception:
      self.logger.error(f"Result was no json!")
      raise LookupError(f"Seems like we couldnt connect to Kodi! Make sure host, port, username and password a set correctly!")
      
    self.logger.debug(f"kodi query result {json}/{status_code}")
    if status_code == 200:
      return json

    raise LookupError('Unexpected status code ' + str(status_code))

  def _decode_image_url(self, encoded_image_url) -> Poster|None:
    if encoded_image_url is None or encoded_image_url == '':
      return None

    decoded_image_url = urllib.parse.unquote(encoded_image_url)
    self.logger.debug(f"Decoded image url: {decoded_image_url}")
    image_url = decoded_image_url.replace("image://video@", "")
    image_url = image_url.replace("image://", "")
    if image_url.lower().startswith('smb'):
      return image_fetcher.fetch_samba_image(image_url)
    elif image_url.lower().startswith('http'):
      return image_fetcher.fetch_http_image(image_url)
    else:
      self.logger.error(f"unknown protocol in image_url {image_url}")
      return None
  
  @staticmethod
  def getInstance() -> 'Kodi' :
    return Kodi()