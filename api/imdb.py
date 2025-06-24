import logging
import os

import requests

from api.image_fetcher import fetch_http_image

logger = logging.getLogger(__name__)

_OMDB_API_KEY = os.environ.get('KT_OMDB_API_KEY', '-')

def get_poster(data) -> tuple[bytes, str] | tuple[None, None]:
  if 'imdb' not in data['uniqueid']:
    logger.debug(f"no imdb id in data for image receiving...")
    return None, None
  
  imdb_id = data['uniqueid']['imdb']
  return get_poster_by_id(imdb_id)


def get_poster_by_id(imdb_id) -> tuple[bytes, str] | tuple[None, None]:
  global _OMDB_API_KEY
  if _OMDB_API_KEY is None or _OMDB_API_KEY == '' or _OMDB_API_KEY == '-':
    return None, None

  logger.debug(f"try to receive image from imdb id ...")
  url = f"http://www.omdbapi.com/?i={imdb_id}&apikey={_OMDB_API_KEY}"
  response = requests.get(url)

  if response.status_code == 200:
    data = response.json()
    if 'Poster' in data:
      posterUrl = data['Poster']
      return fetch_http_image(posterUrl)

  return None, None