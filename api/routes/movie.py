import logging
import os
from pathlib import Path
from typing import Dict, List
from flask import Blueprint, jsonify

from api import imdb
from api.models.GenreId import GenreId
from api.models.Poster import Poster
from api.sources.emby import Emby
from api.sources.jellyfin import Jellyfin
from api.sources.kodi import Kodi
from api.sources.tmdb import Tmdb
from api.sources.plex import Plex
from api.models.Movie import Movie
from api.models.MovieId import MovieId
from api.models.MovieSource import MovieSource
from api.models.MovieSource import fromString as ms_fromString
from api.models.MovieProvider import providerToDict

logger = logging.getLogger(__name__)

bp = Blueprint('movie', __name__)

_CACHE_DIR = os.environ.get('KT_CACHE_FOLDER', '/cache')

_MOVIE_MAP: Dict[MovieId, Movie] = {}
_GENRES = None

@bp.route('/api/v1/movie/get/<movie_source>/<movie_id>', methods=['GET'])
def get(movie_source: str, movie_id: str):
  """
  Get details for given movie id
  ---
  parameters:
    - name: movie_source
      in: path
      type: string
      required: true
      description: Source of the movie you want to get
    - name: movie_id
      in: path
      type: string
      required: true
      description: ID of the movie you want to get
  responses:
    200:
      description: Ids of movies in the kodi database
      schema:
        type: object
        properties:
          movie_id:
            type: integer
            example: 1
          title:
            type: string
            example: Movietitle
          plot:
            type: string
            example: Lorem Ipsum
          thumbnail:
            type: string
            example: base64 encoded image (if any)
    404:
      description: No movie wiht given id found
      schema:
        type: object
        properties:
          error:
            type: string
            example: movie with id 1 not found
  """

  try:
    msrc = ms_fromString(movie_source)
  except ValueError:
    return {"error": f"{movie_source} is not a valid value for MovieSource"}, 400

  movie, fromCache = getMovie(MovieId(msrc, movie_id))

  if movie is None:
    return {"error": f"movie with id {movie_id} not found"}, 404

  return movie.to_dict(), 200

@bp.route('/api/v1/movie/play/<movie_source>/<movie_id>', methods=['GET'])
def play(movie_source: str, movie_id: str):
  """
  Play the movie with the given  id
  ---
  parameters:
    - name: movie_source
      in: path
      type: string
      required: true
      description: Source of the movie you want to play
    - name: movie_id
      in: path
      type: string
      required: true
      description: ID of the movie you want to play
  responses:
    200:
      description: kodi result for the movie you startet to play
      schema:
        type: object
        properties:
          id:
            type: integer
            example: 1
          jsonrpc:
            type: string
            example: 2.0
          result:
            type: string
            example: OK
    404:
      description: No movie wiht given id found
      schema:
        type: object
        properties:
          error:
            type: string
            example: movie with id 1 not found
  """

  try:
    msrc = ms_fromString(movie_source)
  except ValueError:
    return {"error": f"{movie_source} is not a valid value for MovieSource"}, 400

  movieId = MovieId(msrc, movie_id)
  movie, fromCache = getMovie(movieId)

  if movie is None:
    return {"error": f"movie  {movieId} not found"}, 404

  if msrc == MovieSource.KODI:
    result = Kodi.getInstance().playMovie(int(movie_source))
  else:
    kodi_modie_id = Kodi.getInstance().getMovieIdByTitleYear(set([movie.title, movie.original_title]), movie.year)
    if kodi_modie_id > 0:
      result = Kodi.getInstance().playMovie(kodi_modie_id)
    return {"error": f"dont know how to play {movieId}"}, 400

  return result, 200

def getMovie(movie_id: MovieId) -> tuple[Movie,bool]|tuple[None,bool]:
  global _MOVIE_MAP
  if movie_id in _MOVIE_MAP:
    logger.debug(f"getting builded movie with id {movie_id} from cache")
    movie = _MOVIE_MAP.get(movie_id)
    if movie is None:
      return None, False
    return movie, True

  if movie_id.source == MovieSource.KODI:
    result = Kodi.getInstance().getMovieById(movie_id.id)
  elif movie_id.source == MovieSource.TMDB:
    result = Tmdb.getInstance().getMovieById(movie_id.id)
  elif movie_id.source == MovieSource.EMBY:
    result = Emby.getInstance().getMovieById(movie_id.id)
  elif movie_id.source == MovieSource.JELLYFIN:
    result = Jellyfin.getInstance().getMovieById(movie_id.id)
  elif movie_id.source == MovieSource.PLEX:
    result = Plex.getInstance().getMovieById(movie_id.id)
  else:
    logger.error(f"{movie_id.source} is not a known MovieSource!")
    return None, False

  if result is None:
    logger.error(f"movie with id {movie_id} not found!")
    return None, False

  Tmdb.getInstance().setTrailerIds(result)

  localImageUrl = _checkImage(movie_id)
  if localImageUrl is not None:
    logger.debug(f"using cached image for movie {movie_id} ...")
    result.set_thumbnail(localImageUrl)
  else:
    poster = None
    for fetcher, uri in result.thumbnail_sources:
      poster = fetcher(*uri)
      if poster is not None:
        break

    if poster is None and 'tmdb' in result.uniqueid:
      poster = Tmdb.getInstance().get_poster_by_id(result.uniqueid['tmdb'])
    if poster is None and 'imdb' in result.uniqueid:
      poster = imdb.get_poster_by_id(result.uniqueid['imdb'])

    # finaly store the image on disc and set url in result
    if poster is not None:
      result.set_thumbnail(_storeImage(poster, movie_id))

  _MOVIE_MAP[movie_id] = result

  return result, False

def _checkImage(movie_id: MovieId) -> str|None:
  global _CACHE_DIR
  path = Path(_CACHE_DIR)
  file = next((file for file in path.glob(f"{movie_id}.*")), None)  
  return 'static/images/cache/' + file.name if file else None

def _storeImage(poster: Poster, movie_id: MovieId) -> str | None:
  global _CACHE_DIR
  try:
    with open(_CACHE_DIR + '/' + str(movie_id) + poster.extension, 'wb') as imageFile:
      imageFile.write(poster.data)
    return 'static/images/cache/' + str(movie_id) + poster.extension
  except Exception as e:
    logger.error(f"Exception during _storeImage for movie {movie_id} : {e}")
    return None

@bp.route('/api/v1/movie/providers/<region>', methods=['GET'])
def providers(region: str):
  """
  List available movie providers
  ---
  parameters:
    - name: region
      in: path
      type: string
      required: true
      description: Region code to filter providers (e.g. US, DE, ...)
  responses:
    200:
      description: Movie providers with id, name and regions
      schema:
        type: array
        items:
          type: object
          properties:
            id:
              type: integer
              description: Id of the provider
              example: 1
            name:
              type: string
              description: Name of the provider
              example: Netflix
            regions:
              type: array
              items:
                type: string
              description: Regions where the provider is available
              example: [US, DE]
  """

  providers = [providerToDict(p) for p in Tmdb.getInstance().listRegionAvailableProvider(region)]
  return jsonify(providers), 200

@bp.route('/api/v1/movie/genres', methods=['GET'])
def genres():
  """
  List available movie genres
  ---
  responses:
    200:
      description: Genres with id an label
      schema:
        type: array
        items:
          type: object
          properties:
            genreid:
              type: int
              description: Id of the genre
              example: 1
            label:
              type: string
              description: Name of the genre
              example: Horror
  """

  genres = []
  for genre in list_genres():
    genres.append(genre.to_dict())
  return jsonify(genres), 200

def list_genres() -> List[GenreId]:
  global _GENRES
  if _GENRES is None:
    genres = []
    _merge_genres(genres, Kodi.getInstance().listGenres())
    _merge_genres(genres, Tmdb.getInstance().listGenres())
    _merge_genres(genres, Emby.getInstance().listGenres())
    _merge_genres(genres, Jellyfin.getInstance().listGenres())
    _merge_genres(genres, Plex.getInstance().listGenres())
    genres = sorted(genres, key=lambda x: x.name)
    _GENRES = genres

  return _GENRES

def _merge_genres(allGenres: List[GenreId], toMergeGenres: List[GenreId]):
    for g in toMergeGenres:
      if g in allGenres:
        idx = allGenres.index(g)
        allGenres[idx].merge(g)
      else:
        allGenres.append(g)