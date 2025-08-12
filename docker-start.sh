#!/bin/sh

sleep 3 \
  && echo "starting dummy request, to force cache building ..." \
  && wget -O - http://localhost:5000 > /dev/null \
  && echo "... dummy request done."&
. /.app/bin/activate
python /app/app.py
