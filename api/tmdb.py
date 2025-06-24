import logging
import os

import requests

from api.image_fetcher import fetch_http_image


logger = logging.getLogger(__name__)

_TMDB_API_KEY = os.environ.get('KT_TMDB_API_KEY', '-')
_TMDB_API_LANGUAGE = os.environ.get('KT_TMBD_API_LANGUAGE', 'de-DE')
_TMDB_API_REGION = os.environ.get('KT_TMBD_API_REGION', 'de')

def get_poster(data) -> tuple[bytes, str] | tuple[None, None]:
  if 'tmdb' not in data['uniqueid']:
    logger.debug(f"no tmdb id in data for image receiving...")
    return None, None

  tmdb_id = data['uniqueid']['tmdb']
  return get_poster_by_id(tmdb_id)


def get_poster_by_id(tmdb_id) -> tuple[bytes, str] | tuple[None, None]:
  global _TMDB_API_KEY, _TMDB_API_LANGUAGE, _TMDB_API_REGION
  if _TMDB_API_KEY is None or _TMDB_API_KEY == '' or _TMDB_API_KEY == '-':
    return None, None

  logger.debug(f"try to receive image from tmdb id ...")

  headers = {
    "Authorization": f"Bearer {_TMDB_API_KEY}"
  }

  langReg = ''
  if _TMDB_API_LANGUAGE is not None and _TMDB_API_LANGUAGE  != '' and _TMDB_API_REGION is not None and _TMDB_API_REGION != '':
    langReg = '?language=' + _TMDB_API_LANGUAGE + '&region=' + _TMDB_API_REGION
  url = f"https://api.themoviedb.org/3/movie/{tmdb_id}{langReg}"
  response = requests.get(url, headers=headers)
  
  if response.status_code == 200:
    data = response.json()
    if 'poster_path' in data:
      poster_url = f"https://image.tmdb.org/t/p/w500{data['poster_path']}"
      return fetch_http_image(poster_url)

  return None, None