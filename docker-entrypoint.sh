#!/bin/sh

if [ -d /app/web/static/images/cache ]; then
  rm -R /app/web/static/images/cache
fi

ln -s $KT_CACHE_FOLDER /app/web/static/images/cache

exec "$@"