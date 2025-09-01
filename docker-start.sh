#!/bin/sh

APP_IP=`hostname -i`

sleep 7 \
  && echo "starting dummy request, to force cache building ..." \
  && wget -O - http://$APP_IP:5000 > /dev/null \
  && echo "... dummy request done."&
. /.app/bin/activate
python /app/app.py
