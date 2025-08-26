import hashlib
import logging
import math
import os

from api.image_fetcher import fetch_http_image

import requests
from api.models.GenreId import GenreId
from api.models.Movie import Movie
from api.models.MovieId import MovieId
from api.models.MovieSource import MovieSource
from .source import Source

import xml.etree.ElementTree as ET
from xml.etree.ElementTree import Element

class Plex(Source):
  logger = logging.getLogger(__name__)

  _PLEX_API_KEY = os.environ.get('KT_PLEX_API_KEY', '-')
  _PLEX_URL = os.environ.get('KT_PLEX_URL', 'http://localhost/')
  _PLEX_TIMEOUT = int(os.environ.get('KT_PLEX_TIMEOUT', '1'))

  _QUERY_SECTIONS = _PLEX_URL + 'library/sections'
  _QUERY_SECTION = _PLEX_URL + 'library/sections/<section_id>/all'
  _QUERY_MOVIE_BY_ID = _PLEX_URL +  'library/metadata/<movie_id>'
  _QUERY_MOVIE_BY_TITLE_YEAR = _PLEX_URL + 'library/sections/<section_id>/search?query=<title>&year=<year>'

  _MOVIE_SECTION_IDS = None
  _MOVIE_IDS = None
  _GENRES = None
  _API_DISABLED = None

  _instance = None

  def __new__(cls, *args, **kwargs):
    if cls._instance is None:
        cls._instance = super(Plex, cls).__new__(cls)
    return cls._instance

  def isApiDisabled(self, forceReCheck = False) -> bool:
    if self._API_DISABLED is None or forceReCheck:
      if forceReCheck:
        self.logger.debug(f"Will force recheck of Plex API availability.")
      try:
        if self._PLEX_API_KEY is None or self._PLEX_API_KEY == '' or self._PLEX_API_KEY == '-' \
        or self._PLEX_URL is None or self._PLEX_URL == '' or self._PLEX_URL == '-':
          if self._API_DISABLED is None: # log warn only for first check
            self.logger.warning(f"No Plex API Key / URL set => will be disabled!")
          self._API_DISABLED = True
        else:
          response = requests.get(self._QUERY_SECTIONS, headers=self._headers(), timeout=self._PLEX_TIMEOUT)
          if response.status_code == 200:
            self._API_DISABLED = False
            self.logger.info(f"Plex API reachable => will be enabled!")
          elif response.status_code == 401:
            self._API_DISABLED = True
            self.logger.warning(f"Plex API reachable, but API Key invalid => will be disabled!")
          else:
            self._API_DISABLED = True
            self.logger.warning(f"Plex API not reachable => will be disabled!")
      except Exception as e:
        self._API_DISABLED = True
        self.logger.warning(f"Plex API throwed Exception {e} => will be disabled!")

    return self._API_DISABLED

  def getMovieIdByTitleYear(self, titles: set[str|None], year: int) -> int:
    plex_id = -1

    if self.isApiDisabled():
      return plex_id
    
    return plex_id
    # TODO doesnt work this way :/
    for title in titles:
      if title is None:
        continue
      for section in self._listMovieSections():
        plex_id = self._getMovieIdBySectionTitleYear(section, title, year)
        if plex_id > 0:
          return plex_id

    return plex_id

  def _getMovieIdBySectionTitleYear(self, section: int, title: str, year: int) -> int:
    query = self._QUERY_MOVIE_BY_TITLE_YEAR.replace('<section_id>', str(section)).replace('<title>', title).replace('<year>', str(year))
    result = self._make_plex_query(query)
    video = result.find('.//Video')
    if video is not None:
      movie_id = video.attrib.get("ratingKey")
      if movie_id is not None:
        return int(movie_id)
    return -1

  def getMovieById(self, plex_id: int) -> Movie|None:
    if self.isApiDisabled():
        return None

    movie = None
    result = self._make_plex_query(self._QUERY_MOVIE_BY_ID.replace('<movie_id>', str(plex_id)))
    video = result.find('.//Video')
    if video is not None:
      title = video.attrib.get('title')
      if title is not None:
        summary = video.attrib.get('summary')
        if summary is None:
          summary = ''
        year = video.attrib.get('year')
        if year is None:
          year = -1
        else:
          year = int(year)
        duration = video.attrib.get('duration')
        if duration is None:
          duration = -1
        else:
          duration = math.ceil(int(duration)/60000)
        movie = Movie(
          MovieId(MovieSource.PLEX, plex_id),
          title,
          summary,
          year,
          self._exract_genre(result.findall('.//Genre')),
          duration,
          self._extract_fsk(video.attrib.get('contentRating')))
        
        for image in result.findall('.//Image'):
          type = image.attrib.get('type')
          if type == 'coverPoster':
            movie.thumbnail_sources.append((self._fetch_image, (image.attrib.get('url'), )))
            break

    return movie

  def _fetch_image(self, url):
    return fetch_http_image(self._PLEX_URL + url, self._headers())

  def _exract_genre(self, genres: list[Element]):
    result = []
    for genre in genres:
        tag = genre.attrib.get('tag')
        if tag is not None:
          result.append(GenreId(tag))
    return result

  def _extract_fsk(self, rating) -> int | None:
    if rating is None or rating == '':
      return None
    
    try:
      rated = str(rating).lower().replace('de/', '')
      return int(rated)
    except ValueError:
      self.logger.error(f"couldnt transform plex rating {rating}")
      return None

  def listMovieIds(self) -> list[MovieId]:
    if self.isApiDisabled():
        return []

    if self._MOVIE_IDS is None:
        movie_ids = []
        sections = self._listMovieSections()
        for section in sections:
          result = self._make_plex_query(self._QUERY_SECTION.replace('<section_id>', str(section)))
          for video in result.findall(".//Video"):
              movie_id = video.attrib.get("ratingKey")
              if movie_id is not None:
                movie_ids.append(MovieId(MovieSource.PLEX, int(movie_id)))
        self._MOVIE_IDS = movie_ids

    return self._MOVIE_IDS

  def _listMovieSections(self) -> list[int]:
    if self._MOVIE_SECTION_IDS is None:    
      movieSectionKeys = []

      result = self._make_plex_query(self._QUERY_SECTIONS)
      for directory in result.findall(".//Directory"):
        if directory.attrib.get("type") == "movie":
          key = directory.attrib.get("key")
          movieSectionKeys.append(key)

      self._MOVIE_SECTION_IDS = movieSectionKeys

    return self._MOVIE_SECTION_IDS

  def listGenres(self) -> list[GenreId]:
    if self.isApiDisabled():
        return []

    if self._GENRES is None:
      genres = []
      sections = self._listMovieSections()
      for section in sections:
        result = self._make_plex_query(self._QUERY_SECTION.replace('<section_id>', str(section)))
        for genre in result.findall(".//Genre"):
          tag = genre.attrib.get('tag')
          if tag is not None:
            genres.append(GenreId(tag, plex_id=hashlib.sha1(tag.strip().lower().encode()).hexdigest()))
      self._GENRES = genres

    return self._GENRES

  def _headers(self):
    headers = {
      "X-PLEX-Token": f"{self._PLEX_API_KEY}"
    }
    return headers
  
  def _make_plex_query(self, query) -> Element:
    self.logger.debug(f"making plex query {query}")

    response = requests.get(query, headers=self._headers(), timeout=self._PLEX_TIMEOUT)
    status_code = response.status_code
    try:
      xml = ET.fromstring(response.content)
    except Exception:
      self.logger.error(f"Result was no json!")
      raise LookupError(f"Seems like we couldnt connect to Jellyfin! Make sure API Key is set correctly!")
      
    self.logger.debug(f"Plex query result {xml}/{status_code}")
    if status_code == 200:
      return xml

    raise LookupError('Unexpected status code ' + str(status_code))
  
  @staticmethod
  def getInstance() -> 'Plex' :
    return Plex()