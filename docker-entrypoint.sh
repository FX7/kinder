#!/bin/sh

if [ -d /app/web/static/images/cache ]; then
  rm -R /app/web/static/images/cache
fi

ln -s /cache /app/web/static/images/cache

exec "$@"