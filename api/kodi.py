from base64 import b64encode
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


def make_kodi_query(query):
  logger.debug(f"making kodi query {query}")
  response = requests.post(KODI_URL, json=query, auth=HTTPBasicAuth(KODI_USERNAME, KODI_PASSWORD))
  status_code = response.status_code
  json = response.json()
  logger.debug(f"kodi query result {json}/{status_code}")
  if response.status_code == 200:
    return json

  raise LookupError('Unexpected status code ' + str(status_code))

def decode_image_url(encoded_image_url):
  if encoded_image_url is None or encoded_image_url == '':
    return None

  decoded_image_url = urllib.parse.unquote(encoded_image_url)
  logger.debug(f"Decoded image url: {decoded_image_url}")
  image_url = decoded_image_url.replace("image://video@", "")
  if image_url.startswith('smb'):
    return _fetch_samba_image(image_url)
  else:
    logger.error(f"unknown protocol in image_url {image_url}")

def _fetch_samba_image(image_url: str):
  try:

    logger.debug(f"image url is: {image_url}")
    parts = image_url.split('/')
    smbclient.register_session(parts[2], username=SMB_USER, password=SMB_PASSWORD)
    length = len(parts) - 2
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

  except Exception as e:
    logger.error(f"Exception during _fetch_samba_image for image url {image_url}: {e}")