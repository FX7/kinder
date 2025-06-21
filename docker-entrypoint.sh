#!/bin/sh

# Link the /cache dir to the browser accessable cache dir
if [ -d /app/web/static/images/cache ]; then
  rm -R /app/web/static/images/cache
fi

ln -s $KT_CACHE_FOLDER /app/web/static/images/cache

# If not exists, provide a kodi-dummy-data.json in /data dir
if [ ! -f /data/kodi-dummy-data.json ]; then
  mv /app/kodi-dummy-data.json /data/kodi-dummy-data.json
fi

if [ -f /app/kodi-dummy-data.json ]; then
  rm /app/kodi-dummy-data.json
fi

exec "$@"