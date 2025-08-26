from datetime import datetime
import logging
import os

import requests

from api.models.Poster import Poster
from api.sources.emby import Emby
from api.sources.plex import Plex
from api.sources.jellyfin import Jellyfin
from api.sources.kodi import Kodi
from api.image_fetcher import fetch_http_image
from api.models.Movie import Movie
from api.models.GenreId import GenreId
from api.models.MovieId import MovieId
from api.models.MovieMonetarization import MovieMonetarization
from api.models.MovieProvider import MovieProvider
from api.models.MovieSource import MovieSource
from api.models.db.VotingSession import VotingSession
from api.models.MovieProvider import fromString as mp_fromString
from .source import Source

class Tmdb(Source):
  logger = logging.getLogger(__name__)

  _TMDB_API_KEY = os.environ.get('KT_TMDB_API_KEY', '-')
  _TMDB_API_LANGUAGE = os.environ.get('KT_TMDB_API_LANGUAGE', 'de-DE')
  _TMDB_API_REGION = os.environ.get('KT_TMDB_API_REGION', 'DE')
  _TMDB_API_TIMEOUT = int(os.environ.get('KT_TMDB_API_TIMEOUT', '3'))
  _TMDB_API_DISCOVER_SORT_BY = os.environ.get('KT_TMDB_API_DISCOVER_SORT_BY', 'popularity')
  _TMDB_API_DISCOVER_SORT_ORDER = os.environ.get('KT_TMDB_API_DISCOVER_SORT_ORDER', 'desc')
  _TMDB_API_DISCOVER_START_DATE = os.environ.get('KT_TMDB_API_DISCOVER_RELEASE_DATE_START', '1800-01-01')
  _TMDB_API_DISCOVER_TOTAL = min(int(os.environ.get('KT_TMDB_API_DISCOVER_TOTAL', '200')), 1000)
  _TMDB_API_INCLUDE_ADULT = os.environ.get('KT_TMDB_API_INCLUDE_ADULT', 'false')

  _LANG_REG_POSTFIX = ''
  if _TMDB_API_LANGUAGE is not None and _TMDB_API_LANGUAGE  != '' and _TMDB_API_REGION is not None and _TMDB_API_REGION != '':
    _LANG_REG_POSTFIX = 'language=' + _TMDB_API_LANGUAGE + '&region=' + _TMDB_API_REGION

  _TMDB_API = "https://api.themoviedb.org/3"
  _QUERY_MOVIE = f"{_TMDB_API}/movie/<tmdb_id>?append_to_response=release_dates,videos,watch/providers&{_LANG_REG_POSTFIX}"
  _QUERY_TRAILER = f"{_TMDB_API}/movie/<tmdb_id>/videos?{_LANG_REG_POSTFIX}"
  _QUERY_POSTER = f"https://image.tmdb.org/t/p/w500<poster_path>?{_LANG_REG_POSTFIX}"
  _QUERY_DISCOVER = f"{_TMDB_API}/discover/movie?include_adult={_TMDB_API_INCLUDE_ADULT}&include_video=false&{_LANG_REG_POSTFIX}&page=<page>&sort_by=<sort_by>&watch_region={_TMDB_API_REGION}&with_watch_providers=<provider_id>&release_date.lte=<release_date.lte>&release_date.gte=<release_date.gte>&with_watch_monetization_types=flatrate|free|rent"
  _QUERY_GENRES = f"{_TMDB_API}/genre/movie/list?{_LANG_REG_POSTFIX}"
  _QUERY_PROVIDERS = f"{_TMDB_API}/watch/providers/movie?{_LANG_REG_POSTFIX}"

  _GENRES = None
  _MOVIE_MAP = {}
  _PROVIDERS = None
  _PROVIDER_ID_MAP = {}
  _API_DISABLED = None

  _instance = None

  def __new__(cls, *args, **kwargs):
    if cls._instance is None:
        cls._instance = super(Tmdb, cls).__new__(cls)
    return cls._instance

  def setTrailerIds(self, movie: Movie):
    if movie.movie_id.source != MovieSource.TMDB and len(movie.youtube_trailer_ids) <= 0 and 'tmdb' in movie.uniqueid:
      try:
        trailers = self.getTrailerById(movie.uniqueid['tmdb'])
        movie.add_youtube_trailer_ids(trailers)
      except LookupError as e:
        self.logger.error(f"Error during fetching trailers for movie {movie.movie_id} with tmdb id {movie.uniqueid['tmdb']} !\n{e}")

  def getTrailerById(self, tmdb_id) -> list[str]:
    if self.isApiDisabled():
        return []

    query = self._QUERY_TRAILER.replace('<tmdb_id>', tmdb_id)
    result = self._make_tmdb_query(query)

    trailers = self._extract_youtube_trailer_ids(result)
    return trailers
    
  def _extract_youtube_trailer_ids(self, videos) -> list[str]:
    trailers = []
    for video in videos.get('results', []):
      if video.get('site', '').lower() == 'youtube' and video.get('type', '').lower() == 'trailer':
        key = video.get('key')
        if key:
            trailers.append(key)
    return trailers

  def isApiDisabled(self, forceReCheck = False) -> bool:
    if self._API_DISABLED is None or forceReCheck:
      if forceReCheck:
        self.logger.debug(f"Will force recheck of TMDB API availability.")
      try:
        if self._TMDB_API_KEY is None or self._TMDB_API_KEY == '' or self._TMDB_API_KEY == '-' \
        or self._TMDB_API is None or self._TMDB_API == '' or self._TMDB_API == '-':
          if self._API_DISABLED is None: # log warn only for first check
            self.logger.warning(f"No TMDB API Key / URL set => will be disabled!")
          self._API_DISABLED = True
        else:
          headers = { "Authorization": f"Bearer {self._TMDB_API_KEY}" }
          url = f"https://api.themoviedb.org/3/movie/popular?{self._LANG_REG_POSTFIX}&page=1"
          response = requests.get(url, headers=headers, timeout=self._TMDB_API_TIMEOUT)

          if response.status_code == 200:
              self._API_DISABLED = False
              self.logger.info(f"TMDB API reachable => will be enabled!")
          elif response.status_code == 401:
              self._API_DISABLED = True
              self.logger.warning(f"TMDB API reachable, but API Key invalid => will be disabled!")
          else:
              self._API_DISABLED = True
              self.logger.warning(f"TMDB API not reachable => will be disabled!")
      except Exception as e:
        self._API_DISABLED = True
        self.logger.warning(f"TMDB API throwed Exception {e} => will be disabled!")

    return self._API_DISABLED

  def get_poster_by_id(self, tmdb_id) -> Poster|None:
    if self._TMDB_API_KEY is None or self._TMDB_API_KEY == '' or self._TMDB_API_KEY == '-' or self.isApiDisabled():
      return None

    self.logger.debug(f"try to receive image from tmdb id ...")

    data = self._getPureMovie(tmdb_id)
    
    if data is not None and 'poster_path' in data and data['poster_path'] is not None:
      return self._get_poster_by_poster_path(data['poster_path'])

    return None

  def _get_poster_by_poster_path(self, poster_path: str) -> Poster|None:
    poster_url = self._QUERY_POSTER.replace('<poster_path>', poster_path)
    return fetch_http_image(poster_url)

  def listGenres(self) -> list[GenreId]:
    if self.isApiDisabled():
      return []

    if self._GENRES is None:
      data = self._make_tmdb_query(self._QUERY_GENRES)
      genres = list(map(self._normalise_genre, data['genres']))
      self._GENRES = genres
    return self._GENRES

  def listRegionAvailableProvider(self) -> list[MovieProvider]:
    providers = []
    for provider in MovieProvider:
      if provider.useTmdbAsSource():
        tmbdId = self._movieProvider2TmdbId(provider)
        # if you want all tmbd providers to be displayed,
        # even without region support, just remove the if clause
        if tmbdId > 0:
          providers.append(provider)
      else:
        providers.append(provider)
    return providers

  def listProviders(self) -> list:
    if self.isApiDisabled():
      return []

    if self._PROVIDERS is None:
      data = self._make_tmdb_query(self._QUERY_PROVIDERS)
      providers = []
      for provider in data['results']:
        name = provider['provider_name']
        id = provider['provider_id']
        regions = list(provider['display_priorities'].keys())
        if self._TMDB_API_REGION not in regions:
          self.logger.debug(f"Provider '{name}' not available in region '{self._TMDB_API_REGION}' => skipping.")
          continue

        providers.append({
          'name': name,
          'id': id,
          'regions': regions
        })
      self._PROVIDERS = providers
    return self._PROVIDERS

  def _movieProvider2TmdbId(self, provider : MovieProvider) -> int:     
      if provider in self._PROVIDER_ID_MAP:
        providerID = self._PROVIDER_ID_MAP.get(provider)
        if providerID is not None:
          return providerID
        return -1

      for tmdb_provider in self.listProviders():
          # TODO hier muss ggf angepasst werden für weitere Provider
          try:
            match = mp_fromString(tmdb_provider['name'].lower())
          except ValueError:
            continue

          if match == provider:
            self._PROVIDER_ID_MAP[provider] = tmdb_provider['id']
            return tmdb_provider['id']

      self._PROVIDER_ID_MAP[provider] = -1
      return -1

  def _tmdbId2MovieProvider(self, tmdb_id: int, monetarization: MovieMonetarization) -> MovieProvider|None:
    for provider in MovieProvider:
      if provider.useTmdbAsSource() and provider.getMonetarization() == monetarization:
        provider_tmdb_id = self._movieProvider2TmdbId(provider)
        if provider_tmdb_id == tmdb_id:
          return provider
    return None

  def listMovieIds(self, session: VotingSession) -> list[MovieId]:
    if self.isApiDisabled():
      return []

    providers = []
    for provider in session.getMovieProvider():
      if provider.useTmdbAsSource():
        tmbd_id = self._movieProvider2TmdbId(provider)
        if tmbd_id > 0:
          providers.append(str(tmbd_id))

    if len(providers) <= 0:
      return []
    
    disabledGenreIds = session.getDisabledGenres()
    mustGenreIds = session.getMustGenres()
    miscFilter = session.getMiscFilter()
    discover = session.getTmdbDiscover()
    sort_by = discover.sort_by.value if discover else self._TMDB_API_DISCOVER_SORT_BY
    sort_order = discover.sort_order.value if discover else self._TMDB_API_DISCOVER_SORT_ORDER
    max_duration = miscFilter.max_duration if miscFilter else 60001
    release_end = miscFilter.getMaxDate().isoformat() if miscFilter else datetime.now().isoformat()
    release_start = miscFilter.getMinDate().isoformat() if miscFilter else self._TMDB_API_DISCOVER_START_DATE

    baseQuery = self._QUERY_DISCOVER \
      .replace('<provider_id>', '|'.join(providers)) \
      .replace('<sort_by>', sort_by + '.' + sort_order) \
      .replace('<release_date.lte>', str(release_end)) \
      .replace('<release_date.gte>', str(release_start))
    
    if len(disabledGenreIds) > 0:
      disabledTmdbGenreIds = []
      for g in self.listGenres():
        if g.id in disabledGenreIds:
          disabledTmdbGenreIds.append(str(g.tmdb_id))
      baseQuery += '&without_genres=' + ','.join(disabledTmdbGenreIds)
    if len(mustGenreIds) > 0:
      mustTmdbGenreIds = []
      for g in self.listGenres():
        if g.id in mustGenreIds:
          mustTmdbGenreIds.append(str(g.tmdb_id))
      baseQuery += '&with_genres=' + '|'.join(mustTmdbGenreIds)
    
    if max_duration < 60000:
      baseQuery += '&with_runtime.lte=' + str(max_duration + 1)
    
    if discover is not None and discover.vote_average is not None:
      baseQuery += '&vote_average.gte=' + str(discover.vote_average)
    
    if discover is not None and discover.vote_count is not None:
      baseQuery += '&vote_count.gte=' + str(discover.vote_count)

    total = discover.getTotal() if discover else self._TMDB_API_DISCOVER_TOTAL
    movieIds = []
    i = 1
    while len(movieIds) < total:
      query = baseQuery.replace('<page>', str(i))
      result = self._make_tmdb_query(query)
      if 'results' in result and len(result['results']) == 0:
        break
      i+=1
      if 'results' in result:
        for movie in result['results']:
          movieIds.append(MovieId(MovieSource.TMDB, movie['id']))
    
    return movieIds
    

  def _normalise_genre(self, genre) -> GenreId:
    return GenreId(genre['name'], tmdb_id=genre['id'])

  def _getPureMovie(self, tmdb_id: int):
    if tmdb_id in self._MOVIE_MAP:
      self.logger.debug(f"getting tmdb movie with id {tmdb_id} from cache")
      return self._MOVIE_MAP.get(tmdb_id)

    query = self._QUERY_MOVIE.replace('<tmdb_id>', str(tmdb_id))
    data = self._make_tmdb_query(query)

    if data is None or 'id' not in data:
      data = None

    self._MOVIE_MAP[tmdb_id] = data
    
    return data

  def getMovieById(self, movie_id: int) -> Movie|None:
    if self.isApiDisabled():
      return None

    data = self._getPureMovie(movie_id)

    if data is None:
      return None

    result = Movie(
              MovieId(MovieSource.TMDB, movie_id),
              data['title'],
              data['overview'],
              int(data['release_date'].split('-')[0]),
              self._extract_genres(data['genres']),
              data['runtime'],
              self._extract_age(data['release_dates']['results'])
    )

    result.set_tmdbid(movie_id)
    result.set_original_title(data['original_title'])
    result.set_rating(float(data['vote_average']), int(data['vote_count']))

    if 'videos' in data:
      trailers = self._extract_youtube_trailer_ids(data['videos'])
      result.add_youtube_trailer_ids(trailers)

    kodiId = Kodi.getInstance().getMovieIdByTitleYear(set([result.title, result.original_title]), result.year)
    if kodiId > 0:
      result.add_provider(MovieProvider.KODI)
    jellyfinId = Jellyfin.getInstance().getMovieIdByTitleYear(set([result.title, result.original_title]), result.year)
    if jellyfinId is not None:
      result.add_provider(MovieProvider.JELLYFIN)
    embyId = Emby.getInstance().getMovieIdByTitleYear(set([result.title, result.original_title]), result.year)
    if embyId > 0:
      result.add_provider(MovieProvider.EMBY)
    plexId = Plex.getInstance().getMovieIdByTitleYear(set([result.title, result.original_title]), result.year)
    if plexId > 0:
      result.add_provider(MovieProvider.PLEX)

    result.add_providers(self._extract_provider(data['watch/providers']['results']))

    if 'imdb_id' in data:
      result.set_imdbid(data['imdb_id'])

    if 'poster_path' in data and data['poster_path'] is not None:
      result.thumbnail_sources.append((self._get_poster_by_poster_path, (data['poster_path'], )))

    return result

  def getMovieIdByTitleYear(self, titles: set[str | None], year: int) -> str|None:
    raise NotImplementedError

  def _extract_provider(self, tmdb_providers) -> list[MovieProvider]:
    global _TMDB_API_REGION

    providers = []
    if self._TMDB_API_REGION in tmdb_providers:
      movie_providers = tmdb_providers[self._TMDB_API_REGION]
      if 'flatrate' in movie_providers:
        for provider in movie_providers['flatrate']:
          internal_provider = self._tmdbId2MovieProvider(provider['provider_id'], MovieMonetarization.FLATRATE)
          if internal_provider is not None:
            providers.append(internal_provider)
      if 'rent' in movie_providers:
        for provider in movie_providers['rent']:
          internal_provider = self._tmdbId2MovieProvider(provider['provider_id'], MovieMonetarization.RENT)
          if internal_provider is not None:
            providers.append(internal_provider)
      if 'buy' in movie_providers:
        for provider in movie_providers['buy']:
          internal_provider = self._tmdbId2MovieProvider(provider['provider_id'], MovieMonetarization.BUY)
          if internal_provider is not None:
            providers.append(internal_provider)
      if 'free' in movie_providers:
        for provider in movie_providers['free']:
          internal_provider = self._tmdbId2MovieProvider(provider['provider_id'], MovieMonetarization.FREE)
          if internal_provider is not None:
            providers.append(internal_provider)

    return providers

  def _extract_age(self, release_dates):
    region = self._TMDB_API_REGION.lower()
    for date in release_dates:
      if date['iso_3166_1'].lower() == region:
        age = date['release_dates'][0]['certification']
        if age == '':
          return None
        return int(age)
    
    return None

  def _extract_genres(self, genres) -> list[GenreId]:
    result = []
    for genre in genres:
      result.append(GenreId(genre['name'], tmdb_id=genre['id']))
    return result


  def _make_tmdb_query(self, query):
    self.logger.debug(f"making tmdb query {query}")

    headers = {
      "Authorization": f"Bearer {self._TMDB_API_KEY}"
    }

    response = requests.get(query, headers=headers, timeout=self._TMDB_API_TIMEOUT)
    status_code = response.status_code
    try:
      json = response.json()
    except Exception:
      self.logger.error(f"Result was no json!")
      raise LookupError(f"Seems like we couldnt connect to Tmdb! Make sure API Key is set correctly!")
      
    self.logger.debug(f"tmdb query result {json}/{status_code}")
    if status_code == 200:
      return json

    raise LookupError('Unexpected status code ' + str(status_code))

  @staticmethod
  def getInstance() -> 'Tmdb' :
    return Tmdb()
