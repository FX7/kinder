#!/bin/sh

sleep 2 && wget -O - http://localhost:5000 > /dev/null&
. /.app/bin/activate
python /app/app.py
