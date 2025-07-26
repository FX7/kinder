#/bin/sh

arch=$(uname -m) && \
if [ "$arch" = "armv7l" ] || [ "$arch" = "armv7" ]; then
  echo "Installing build dependencies for armv7 ..."
  #apk add --no-cache --virtual .build-deps \
  apk add --no-cache python3 py3-pip build-base libffi-dev openssl-dev musl-dev rust cargo linux-headers gcc python3-dev
  rm -r /var/cache/apk
else
  echo "Installing build dependencies for none armv7..."
  apk add --no-cache python3 py3-pip
  rm -r /var/cache/apk
fi
