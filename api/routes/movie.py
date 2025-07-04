import logging
import os
from pathlib import Path
from typing import List
from flask import Blueprint, jsonify

from api.imdb import get_poster as get_imdb_poster
from api.models.GenreId import GenreId
import api.kodi as kodi
import api.tmdb as tmmdb
from api.models.MovieId import MovieId
from api.models.MovieSource import MovieSource
from api.models.MovieSource import fromString as ms_fromString
from config import Config

logger = logging.getLogger(__name__)

bp = Blueprint('movie', __name__)

_CACHE_DIR = os.environ.get('KT_CACHE_FOLDER', '/cache')

_MOVIE_MAP = {}

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
    mid = int(movie_id)
  except ValueError:
    return {"error": f"movie_id must be int"}, 400

  try:
    msrc = ms_fromString(movie_source)
  except ValueError:
    return {"error": f"{movie_source} is not a valid value for MovieSource"}, 400

  result = getMovie(MovieId(msrc, mid))

  if result is None:
    return {"error": f"movie with id {movie_id} not found"}, 404

  return result.to_dict(), 200

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
    mid = int(movie_id)
  except ValueError:
    return {"error": f"movie_id must be int"}, 400

  try:
    msrc = ms_fromString(movie_source)
  except ValueError:
    return {"error": f"{movie_source} is not a valid value for MovieSource"}, 400

  movieId = MovieId(msrc, mid)
  movie = getMovie(movieId)

  if movie is None:
    return {"error": f"movie  {movieId} not found"}, 404

  if msrc == MovieSource.KODI:
    result = kodi.playMovie(mid)
  else:
    return {"error": f"dont know how to play {movieId}"}, 400

  return result, 200

# @bp.route('/api/v1/movie/favorite', methods=['POST'])
# def favorite(movie_id: str):

#   if request.json is None:
#       return jsonify({'error': 'invalid JSON data'}), 400

#   data = request.json

#   movie_id = data.get('movie_id')

#   try:
#     mid = int(movie_id)
#   except ValueError:
#     return {"error": f"movie_id must be int"}, 400

#   movie = getMovie(mid)

#   if movie is None:
#     return {"error": f"movie with id {movie_id} not found"}, 404

#   result = kodi.addMovieToFavorite(mid)
#   return result, 200

def getMovie(movie_id: MovieId):
  global _MOVIE_MAP
  if movie_id in _MOVIE_MAP:
    logger.debug(f"getting builded movie with id {movie_id} from cache")
    return _MOVIE_MAP.get(movie_id)

  if movie_id.source == MovieSource.KODI:
    result = kodi.getMovie(movie_id.id)
  elif movie_id.source == MovieSource.TMDB:
    result = tmmdb.getMovie(movie_id)
  else:
    logger.error(f"{movie_id.source} is not a known MovieSource!")
    return None

  if result is None:
    logger.error(f"movie with id {movie_id} not found!")
    return None

  image_fetching_methods = {
    'kodi_thumbnail': kodi.get_thumbnail_poster,
    'kodi_art': kodi.get_art_poster,
    'kodi_file': kodi.get_file_poster,
    'tmdb': tmmdb.get_poster,
    'imdb': get_imdb_poster
  }

  localImageUrl = _checkImage(movie_id)
  if localImageUrl is not None:
    logger.debug(f"using cached image for movie {movie_id} ...")
    result.set_thumbnail(localImageUrl)
  else:
    image, extension = None, None
    for key in Config.IMAGE_PREFERENCE:
      if key not in image_fetching_methods:
        logger.error(f"unknown image fetching method {key}")
        continue
      try:
        image, extension = image_fetching_methods[key](result)
      except Exception as e:
        logger.error(f"Exception during image fetching via {key} for movie {movie_id}; was: {e}")
      if image is not None:
        break

    # finaly store the image on disc and set url in result
    if image is not None and extension is not None:
      result.set_thumbnail(_storeImage(image, extension, movie_id))

  _MOVIE_MAP[movie_id] = result

  return result

def _checkImage(movie_id):
  global _CACHE_DIR
  path = Path(_CACHE_DIR)
  file = next((file for file in path.glob(f"{movie_id}.*")), None)  
  return 'static/images/cache/' + file.name if file else None

def _storeImage(image: bytes, extension: str, movie_id: MovieId) -> str | None:
  global _CACHE_DIR
  try:
    with open(_CACHE_DIR + '/' + str(movie_id) + extension, 'wb') as imageFile:
      imageFile.write(image)
    return 'static/images/cache/' + str(movie_id) + extension
  except Exception as e:
    logger.error(f"Exception during _storeImage for movie {movie_id} : {e}")
    return None

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
  genres = []
  data = kodi.listGenres()
  for g in data:
    if g in genres:
      idx = genres.index(g)
      genres[idx].merge(g)
    else:
      genres.append(g)
  
  data = tmmdb.listGenres()
  for g in data:
    if g in genres:
      idx = genres.index(g)
      genres[idx].merge(g)
    else:
      genres.append(g)

  return genres