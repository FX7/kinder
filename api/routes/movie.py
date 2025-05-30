import logging
from flask import Blueprint


from api.kodi import make_kodi_query, decode_image_url

logger = logging.getLogger(__name__)

QUERY_GENRES = {
  "jsonrpc": "2.0",
  "method": "VideoLibrary.GetGenres",
  "params": {
    "media": "video"
  },
  "id": 1
}

QUERY_MOVIES = {
  "jsonrpc": "2.0",
  "method": "VideoLibrary.GetMovies",
  "params": {},
  "id": 1
}

QUERY_MOVIE = {
  "jsonrpc": "2.0",
  "method": "VideoLibrary.GetMovieDetails",
  "params": {
    "movieid": 0,
    "properties": ["title", "plot", "thumbnail"]
  },
  "id": 1
}

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
  global QUERY_MOVIES
  data = make_kodi_query(QUERY_MOVIES)

  if 'result' in data and 'movies' in data['result']:
      movies = data['result']['movies']
      ids = []
      for movie in movies:
          ids.append(movie['movieid'])
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
  global QUERY_MOVIE
  query = QUERY_MOVIE.copy()
  query['params']['movieid'] = int(id)
  data = make_kodi_query(query)

  if 'result' in data and 'moviedetails' in data['result']:
    result = {
       "movie_id": id,
       "title": data['result']['moviedetails']['title'],
       "plot": data['result']['moviedetails']['plot'],
    }
    image = decode_image_url(data['result']['moviedetails']['thumbnail'])
    if image is not None:
      result['thumbnail'] = image
    return result, 200

  return {"error": f"movie with id {id} not found"}, 404