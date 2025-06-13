import logging
import os
from pathlib import Path
from flask import Blueprint

import api.kodi as kodi

logger = logging.getLogger(__name__)

bp = Blueprint('movie', __name__)

_CACHE_DIR = os.environ.get('KT_CACHE_FOLDER', '/cache')

_MOVIE_MAP = {}

@bp.route('/api/v1/movie/get/<movie_id>', methods=['GET'])
def get(movie_id: str):
  """
  Get details for given movie id
  ---
  parameters:
    - name: id
      in: path
      type: integer
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

  result = getMovie(mid)

  if result is None:
    return {"error": f"movie with id {movie_id} not found"}, 404

  return result, 200

def getMovie(movie_id: int):
  global _MOVIE_MAP
  if movie_id in _MOVIE_MAP:
    logger.debug(f"getting builded movie with id {movie_id} from cache")
    return _MOVIE_MAP.get(movie_id)

  data = kodi.getMovie(movie_id)

  if 'result' not in data or 'moviedetails' not in data['result']:
    return None

  result = {
      "movie_id": movie_id,
      "title": data['result']['moviedetails']['title'],
      "plot": data['result']['moviedetails']['plot'],
      "year": data['result']['moviedetails']['year'],
      "genre": data['result']['moviedetails']['genre'],
  }

  localImageUrl = _checkImage(movie_id)
  if localImageUrl is not None:
    logger.debug(f"using cached image for movie {movie_id} ...")
    result['thumbnail'] = localImageUrl
  else:
    image = None
    if image is None and 'thumbnail' in data['result']['moviedetails']:
      logger.debug(f"try to decode image url from thumbnail ...")
      image, extension = kodi.decode_image_url(data['result']['moviedetails']['thumbnail'])
    if image is None and 'art' in data['result']['moviedetails'] and 'poster' in data['result']['moviedetails']['art']:
      logger.debug(f"try to decode image url from art.poster ...")
      image, extension  = kodi.decode_image_url(data['result']['moviedetails']['art']['poster'])
    if image is None and 'file' in data['result']['moviedetails']:
      logger.debug(f"try to decode image urla from file path ...")
      image, extension = kodi.decode_image_url(data['result']['moviedetails']['file'])
    
    # finaly store the image on disc and set url in result
    if image is not None and extension is not None:
      result['thumbnail'] = _storeImage(image, extension, int(movie_id))

  _MOVIE_MAP[movie_id] = result

  return result

def _checkImage(movie_id):
  global _CACHE_DIR
  path = Path(_CACHE_DIR)
  file = next((file for file in path.glob(f"{movie_id}.*")), None)  
  return 'static/images/cache/' + file.name if file else None

def _storeImage(image: bytes, extension: str, movie_id: int) -> str | None:
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
  data = kodi.listGenres()
  return data, 200
