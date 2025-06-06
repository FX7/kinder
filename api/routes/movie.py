import logging
from flask import Blueprint


from api.kodi import listMovieIds, getMovie, listGenres, decode_image_url

logger = logging.getLogger(__name__)

bp = Blueprint('kodi', __name__)

@bp.route('/api/v1/movie/list', methods=['GET'])
def list():
  """
  List all movies from kodi
  ---
  responses:
    200:
      description: Ids of movies in the kodi database
      schema:
        type: array
        items:
          type: integer
          example: 1, 2, 3
  """
  data = listMovieIds()

  if 'result' in data and 'movies' in data['result']:
      movies = data['result']['movies']
      ids = []
      for movie in movies:
        ids.append(movie['movieid'])
      logger.debug(f"found {len(ids)} movies")
      return ids, 200

  raise LookupError('No movies found')

@bp.route('/api/v1/movie/get/<id>', methods=['GET'])
def get(id: int):
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
  data = getMovie(int(id))

  if 'result' not in data or 'moviedetails' not in data['result']:
    return {"error": f"movie with id {id} not found"}, 404

  result = {
      "movie_id": id,
      "title": data['result']['moviedetails']['title'],
      "plot": data['result']['moviedetails']['plot'],
      "year": data['result']['moviedetails']['year'],
      "genre": data['result']['moviedetails']['genre'],
  }
  logger.debug(f"try to decode image url from thumbnail ...")
  image = decode_image_url(data['result']['moviedetails']['thumbnail'])
  if image is None and 'art' in data['result']['moviedetails'] and 'poster' in data['result']['moviedetails']['art']:
      logger.debug(f"try to decode image url from art.poster ...")
      image = decode_image_url(data['result']['moviedetails']['art']['poster'])
  if image is None:
      logger.debug(f"try to decode image urla from file path ...")
      image = decode_image_url(data['result']['moviedetails']['file'])
  if image is not None:
    result['thumbnail'] = image
  return result, 200

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
  sorted_genres = sorted(data["result"]["genres"], key=lambda x: x["label"])
  return sorted_genres, 200
