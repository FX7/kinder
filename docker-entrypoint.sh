#!/bin/sh

test -w /cache && test -r /cache
if [ "$?" != "0" ]; then
  echo "/cache directory not writeable/readable!"
  echo "Please set correct access rights."
  exit 1
fi

test -w /data && test -r /data
if [ "$?" != "0" ]; then
  echo "/data directory not writeable/readable!"
  echo "Please set correct access rights."
  exit 1
fi

test -w /log && test -r /log
if [ "$?" != "0" ]; then
  echo "/log directory not writeable/readable!"
  echo "Please set correct access rights."
  exit 1
fi

# Link the /cache dir to the browser accessable cache dir
if [ -d /app/web/static/images/cache ]; then
  rm -R /app/web/static/images/cache
fi

ln -s $KT_CACHE_FOLDER /app/web/static/images/cache

exec "$@"