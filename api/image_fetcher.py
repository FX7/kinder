from io import BytesIO
import logging
import os

import requests
import smbclient


logger = logging.getLogger(__name__)

_SMB_USER = os.environ.get('KT_SMB_USER', 'samba')
_SMB_PASSWORD = os.environ.get('KT_SMB_PASSWORD', 'samba')

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
      return image_data.getvalue(), extension.split('?')[0] # just in case that there are some query parameters left
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