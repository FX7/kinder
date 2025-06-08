from base64 import b64encode
from io import BytesIO
import logging
import os

import requests
from requests.auth import HTTPBasicAuth
import urllib.parse

import smbclient

logger = logging.getLogger(__name__)

KODI_USERNAME = os.environ.get('KT_KODI_USERNAME', 'kodi')
KODI_PASSWORD = os.environ.get('KT_KODI_PASSWORDERNAME', 'kodi')
KODI_URL = 'http://' + os.environ.get('KT_KODI_HOST', '127.0.0.1') + '/jsonrpc'

SMB_USER = os.environ.get('KT_SMB_USER', 'samba')
SMB_PASSWORD = os.environ.get('KT_SMB_PASSWORD', 'samba')

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
    "properties": ["file", "title", "plot", "thumbnail", "year", "genre", "art", "uniqueid", "imdbnumber"]
  },
  "id": 1
}

QUERY_GENRES = {
    "jsonrpc": "2.0",
    "method": "VideoLibrary.GetGenres",
    "params": {
        "type": "movie"
    },
    "id": 1
}

def listMovieIds():
  global QUERY_MOVIES
  return _make_kodi_query(QUERY_MOVIES)

def getMovie(id: int):
  global QUERY_MOVIE
  query = QUERY_MOVIE.copy()
  query['params']['movieid'] = int(id)
  return _make_kodi_query(query)

def listGenres():
  global QUERY_GENRES
  return _make_kodi_query(QUERY_GENRES)

def _make_kodi_query(query):
  logger.debug(f"making kodi query {query}")
  response = requests.post(KODI_URL, json=query, auth=HTTPBasicAuth(KODI_USERNAME, KODI_PASSWORD))
  status_code = response.status_code
  json = response.json()
  logger.debug(f"kodi query result {json}/{status_code}")
  if response.status_code == 200:
    return json

  raise LookupError('Unexpected status code ' + str(status_code))

def decode_image_url(encoded_image_url, logFailAsError=True):
  if encoded_image_url is None or encoded_image_url == '':
    return None

  decoded_image_url = urllib.parse.unquote(encoded_image_url)
  logger.debug(f"Decoded image url: {decoded_image_url}")
  image_url = decoded_image_url.replace("image://video@", "")
  image_url = image_url.replace("image://", "")
  if image_url.lower().startswith('smb'):
    return _fetch_samba_image(image_url)
  elif image_url.lower().startswith('http'):
    return _fetch_http_image(image_url)
  else:
    logger.error(f"unknown protocol in image_url {image_url}")

def _fetch_http_image(image_url: str):
  try:
    response = requests.get(image_url)

    if response.status_code == 200:
      image_data = BytesIO(response.content)
      encoded_data = b64encode(image_data.getvalue())
      return encoded_data.decode('utf-8')
    elif response.status_code == 404:
      logger.debug(f"no (more) image found at {image_url} (returned 404)")

  except Exception as e:
    logger.error(f"Exception during _fetch_http_image for image url {image_url}: {e}")

def _fetch_samba_image(image_url: str, offset=0):
  try:

    logger.debug(f"image url is: {image_url}")
    parts = image_url.split('/')
    smbclient.register_session(parts[2], username=SMB_USER, password=SMB_PASSWORD)
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
            # with open('/data/dbg_file.out', 'wb') as local_file:
            #   local_file.write(data)  # Daten in die lokale Datei schreiben
            encoded_data = b64encode(data)
            return encoded_data.decode('utf-8')
    elif length <= len(parts):
      offset += 1
      return _fetch_samba_image(image_url, offset)

  except Exception as e:
    logger.error(f"Exception during fetch_samba_image for image url {image_url} with file path {file_path}: {e}")