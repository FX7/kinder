import logging
import os
from pathlib import Path
from flask import Blueprint, request

from api import image_fetcher
import api.kodi as kodi

logger = logging.getLogger(__name__)

bp = Blueprint('movie', __name__)

_CACHE_DIR = os.environ.get('KT_CACHE_FOLDER', '/cache')

_OVERLAY_TITLE = eval(os.environ.get('KT_OVERLAY_TITLE', 'True'))
_OVERLAY_DURATION = eval(os.environ.get('KT_OVERLAY_DURATION', 'False'))
_OVERLAY_GENRES = eval(os.environ.get('KT_OVERLAY_GENRES', 'True'))
_OVERLAY_WATCHED = eval(os.environ.get('KT_OVERLAY_WATCHED', 'False'))
_OVERLAY_AGE = eval(os.environ.get('KT_OVERLAY_AGE', 'False'))

_MOVIE_MAP = {}

@bp.route('/api/v1/movie/get/<movie_id>', methods=['GET'])
def get(movie_id: str):
  """
  Get details for given movie id
  ---
  parameters:
    - name: movie_id
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

@bp.route('/api/v1/movie/play/<movie_id>', methods=['GET'])
def play(movie_id: str):
  """
  Play the movie with the given  id
  ---
  parameters:
    - name: movie_id
      in: path
      type: integer
      required: true
      description: ID of the movie you want to get
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

  movie = getMovie(mid)

  if movie is None:
    return {"error": f"movie with id {movie_id} not found"}, 404

  result = kodi.playMovie(mid)
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
      "runtime": data['result']['moviedetails']['runtime'],
      "mpaa": data['result']['moviedetails']['mpaa'],
      "age": _mpaa_to_fsk(data['result']['moviedetails']['mpaa']),
      "playcount": data['result']['moviedetails']['playcount'],
      "uniqueid": {},
      "thumbnail.src": {}
  }

  if 'thumbnail' in data['result']['moviedetails']:
    result['thumbnail.src']['thumbnail'] = data['result']['moviedetails']['thumbnail']

  if 'art' in data['result']['moviedetails'] and 'poster' in data['result']['moviedetails']['art']:
    result['thumbnail.src']['art'] = data['result']['moviedetails']['art']['poster']

  if 'file' in data['result']['moviedetails']:
    result['thumbnail.src']['file'] = data['result']['moviedetails']['file']

  if 'uniqueid' in data['result']['moviedetails'] and 'tmdb' in data['result']['moviedetails']['uniqueid']:
    result['uniqueid']['tmdb'] = data['result']['moviedetails']['uniqueid']['tmdb']

  if 'uniqueid' in data['result']['moviedetails'] and 'imdb' in data['result']['moviedetails']['uniqueid']:
    result['uniqueid']['imdb'] = data['result']['moviedetails']['uniqueid']['imdb']

  image_fetching_methods = {
    'kodi_thumbnail': kodi.get_thumbnail_poster,
    'kodi_art': kodi.get_art_poster,
    'kodi_file': kodi.get_file_poster,
    'tmdb': image_fetcher.get_tmdb_poster,
    'imdb': image_fetcher.get_imdb_poster
  }

  localImageUrl = _checkImage(movie_id)
  if localImageUrl is not None:
    logger.debug(f"using cached image for movie {movie_id} ...")
    result['thumbnail'] = localImageUrl
  else:
    image = None
    methods = os.environ.get('KT_IMAGE_PREFERENCE', 'kodi_thumbnail, kodi_art, kodi_file, tmdb, imdb').split(',')
    for key in methods:
      key = key.strip()
      if key not in image_fetching_methods:
        logger.error(f"unknown image fetching method {key}")
        continue
      if image is None:
        image, extension = image_fetching_methods[key](result)
      else:
        break
    
    # finaly store the image on disc and set url in result
    if image is not None and extension is not None:
      result['thumbnail'] = _storeImage(image, extension, int(movie_id))

  # remove possible thumbnail src path from result; was just for the underlaying fetcher
  result.pop('thumbnail.src')

  result['overlay'] = {}
  # include all infos which should be displayed
  if _OVERLAY_TITLE:
    result['overlay']['title'] = result['title']
  if _OVERLAY_DURATION:
    result['overlay']['duration'] = result['runtime']
  if _OVERLAY_GENRES:
    result['overlay']['genres'] = result['genre']
  if _OVERLAY_WATCHED:
    result['overlay']['watched'] = result['playcount']
  if _OVERLAY_AGE:
    result['overlay']['age'] = result['age']

  _MOVIE_MAP[movie_id] = result

  return result

def _mpaa_to_fsk(mpaa) -> int | None:
  if mpaa is None or mpaa == '':
    return None
  
  rated = str(mpaa).lower()

  if rated == 'rated u' or rated == 'rated 0':
    return 0
  elif rated == 'rated pg' or rated == 'rated 6':
    return 6
  elif rated == 'rated t' or rated == 'rated pg-13' or rated == 'rated 12':
    return 12
  elif rated == 'rated 16':
    return 16
  elif rated == 'rated r' or rated == 'rated 18':
    return 18
  elif rated == 'rated':
    return None
  else:
    logger.error(f"dont know how to convert {mpaa} to fsk")
    return None

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
