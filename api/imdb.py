import logging
import os

import requests

from api.image_fetcher import fetch_http_image
from api.models.Poster import Poster

logger = logging.getLogger(__name__)

_OMDB_API_KEY = os.environ.get('KT_OMDB_API_KEY', '-')

def get_poster_by_id(imdb_id) -> Poster|None:
  global _OMDB_API_KEY
  if _OMDB_API_KEY is None or _OMDB_API_KEY == '' or _OMDB_API_KEY == '-':
    return None

  logger.debug(f"try to receive image from imdb id ...")
  url = f"http://www.omdbapi.com/?i={imdb_id}&apikey={_OMDB_API_KEY}"
  response = requests.get(url)

  if response.status_code == 200:
    data = response.json()
    if 'Poster' in data:
      posterUrl = data['Poster']
      return fetch_http_image(posterUrl)

  return None