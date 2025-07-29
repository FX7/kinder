#!/bin/sh

test -w "$KT_CACHE_FOLDER" && test -r "$KT_CACHE_FOLDER"
if [ "$?" != "0" ]; then
  echo "$KT_CACHE_FOLDER directory not writeable/readable!"
  echo "Please set correct access rights."
  exit 1
fi

test -w "$KT_DATA_FOLDER" && test -r "$KT_DATA_FOLDER"
if [ "$?" != "0" ]; then
  echo "$KT_DATA_FOLDER directory not writeable/readable!"
  echo "Please set correct access rights."
  exit 1
fi

test -w "$KT_LOG_FOLDER" && test -r "$KT_LOG_FOLDER"
if [ "$?" != "0" ]; then
  echo "$KT_LOG_FOLDER directory not writeable/readable!"
  echo "Please set correct access rights."
  exit 1
fi

# Link the /cache dir to the browser accessable cache dir
if [ -d /app/web/static/images/cache ]; then
  rm -R /app/web/static/images/cache
fi

ln -s $KT_CACHE_FOLDER /app/web/static/images/cache

exec "$@"