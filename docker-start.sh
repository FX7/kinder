#!/bin/sh

sleep 2 && wget -O - http://localhost:5000 > /dev/null 2>&1 &
. /.app/bin/activate
python /app/app.py
