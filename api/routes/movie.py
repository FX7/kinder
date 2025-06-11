import logging
from pathlib import Path
from flask import Blueprint


from api.kodi import listMovieIds, getMovie, listGenres, decode_image_url

logger = logging.getLogger(__name__)

bp = Blueprint('kodi', __name__)

# @bp.route('/api/v1/movie/list', methods=['GET'])
# def list():
#   """
#   List all movies from kodi
#   ---
#   responses:
#     200:
#       description: Ids of movies in the kodi database
#       schema:
#         type: array
#         items:
#           type: integer
#           example: 1, 2, 3
#   """
#   return listMovieIds()

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

  data = getMovie(mid)

  if 'result' not in data or 'moviedetails' not in data['result']:
    return {"error": f"movie with id {movie_id} not found"}, 404

  result = {
      "movie_id": mid,
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
    logger.debug(f"try to decode image url from thumbnail ...")
    image, extension = decode_image_url(data['result']['moviedetails']['thumbnail'])
    if image is None and 'art' in data['result']['moviedetails'] and 'poster' in data['result']['moviedetails']['art']:
        logger.debug(f"try to decode image url from art.poster ...")
        image, extension  = decode_image_url(data['result']['moviedetails']['art']['poster'])
    if image is None and 'file' in data['result']['moviedetails']:
        logger.debug(f"try to decode image urla from file path ...")
        image, extension = decode_image_url(data['result']['moviedetails']['file'])
    if image is not None and extension is not None:
      result['thumbnail'] = _storeImage(image, extension, int(movie_id))

  return result, 200

def _checkImage(movie_id):
  path = Path('/cache/')
  file = next((file for file in path.glob(f"{movie_id}.*")), None)  
  return 'static/images/cache/' + file.name if file else None

def _storeImage(image: bytes, extension: str, movie_id: int) -> str | None:
  try:
    with open('/cache/' + str(movie_id) + extension, 'wb') as imageFile:
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
  data = listGenres()
  return data, 200
