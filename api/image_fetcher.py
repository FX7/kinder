from io import BytesIO
import logging
import os

import requests
import smbclient


logger = logging.getLogger(__name__)

_SMB_USER = os.environ.get('KT_SMB_USER', 'samba')
_SMB_PASSWORD = os.environ.get('KT_SMB_PASSWORD', 'samba')

_OMDB_API_KEY = os.environ.get('KT_OMDB_API_KEY', '-')
_TMDB_API_KEY = os.environ.get('KT_TMDB_API_KEY', '-')
_TMDB_API_LANGUAGE = os.environ.get('KT_TMBD_API_LANGUAGE', 'de-DE')
_TMDB_API_REGION = os.environ.get('KT_TMBD_API_REGION', 'de')

def get_imdb_poster(data) -> tuple[bytes, str] | tuple[None, None]:
  global _OMDB_API_KEY
  if _OMDB_API_KEY is None or _OMDB_API_KEY == '' or _OMDB_API_KEY == '-':
    return None, None

  if 'imdb' not in data['uniqueid']:
    logger.debug(f"no imdb id in data for image receiving...")
    return None, None
  
  logger.debug(f"try to receive image from imdb id ...")
  imdb_id = data['uniqueid']['imdb']

  url = f"http://www.omdbapi.com/?i={imdb_id}&apikey={_OMDB_API_KEY}"
  response = requests.get(url)

  if response.status_code == 200:
    data = response.json()
    if 'Poster' in data:
      posterUrl = data['Poster']
      return fetch_http_image(posterUrl)

  return None, None


def get_tmdb_poster(data) -> tuple[bytes, str] | tuple[None, None]:
  global _TMDB_API_KEY, _TMDB_API_LANGUAGE, _TMDB_API_REGION
  if _TMDB_API_KEY is None or _TMDB_API_KEY == '' or _TMDB_API_KEY == '-':
    return None, None

  if 'tmdb' not in data['uniqueid']:
    logger.debug(f"no tmdb id in data for image receiving...")
    return None, None
  
  logger.debug(f"try to receive image from tmdb id ...")
  tmdb_id = data['uniqueid']['tmdb']

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


def fetch_http_image(image_url: str):
  if image_url is None or image_url == '':
      return None, None

  try:
    response = requests.get(image_url)

    if response.status_code == 200:
      image_data = BytesIO(response.content)
      paths = image_url.split("/")
      offset = 1
      filename = paths[len(paths)-offset]
      while filename == '' and offset < len(paths):
        offset+=1
        filename = paths[len(paths)-offset]
      extension = os.path.splitext(filename)[1]
      return image_data.getvalue(), extension
      # encoded_data = b64encode(image_data.getvalue())
      # return encoded_data.decode('utf-8')
    elif response.status_code == 404:
      logger.debug(f"no (more) image found at {image_url} (returned 404)")
    return None, None

  except Exception as e:
    logger.error(f"Exception during _fetch_http_image for image url {image_url}: {e}")
    return None, None


def fetch_samba_image(image_url: str, offset=0):
  global _SMB_USER, _SMB_PASSWORD
  file_path = 'unknown'
  try:

    logger.debug(f"image url is: {image_url}")
    parts = image_url.split('/')
    smbclient.register_session(parts[2], username=_SMB_USER, password=_SMB_PASSWORD)
    if parts[len(parts) - 2] == 'index.bdmv':
      length = len(parts) - 3 + offset
    else:
      length = len(parts) - 2 + offset
    file_path = "/".join(parts[4:length])

    posterFound = False
    search_path = r'\\{}\\{}\\{}'.format(parts[2], parts[3], file_path)
    logger.debug(f"search path is: {search_path}")
    files = smbclient.listdir(search_path)
    for file in files:
        if file.endswith('poster.jpg'):
            file_path += "/" + file
            posterFound = True
            break

    if posterFound:
        remote_file_path = r'\\{}\\{}\\{}'.format(parts[2], parts[3], file_path)
        logger.debug(f"remote file path is: {remote_file_path}")
        with smbclient.open_file(remote_file_path, 'rb') as remote_file:
            data = remote_file.read()
            _, extension = os.path.splitext(remote_file_path)
            return data, extension
            # encoded_data = b64encode(data)
            # return encoded_data.decode('utf-8')
    elif length <= len(parts):
      offset += 1
      return fetch_samba_image(image_url, offset)
    return None, None

  except Exception as e:
    logger.error(f"Exception during fetch_samba_image for image url {image_url} with file path {file_path}: {e}")
    return None, None