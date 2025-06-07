FROM python:3.11 AS base

RUN mkdir /app && mkdir /data
COPY requirements.txt /app/requirements.txt
RUN pip install -r /app/requirements.txt


FROM base AS development

RUN groupadd --gid 1000 vscode \
    && useradd --uid 1000 --gid 1000 -m -s /bin/bash vscode

RUN apt update && apt install -y sqlite3


FROM base

ENV KT_KODI_USERNAME='kodi'
ENV KT_KODI_PASSWORD='kodi'
ENV KT_KODI_HOST='127.0.0.1'

ENV KT_SMB_USER='samba'
ENV KT_SMB_PASSWORD='samba'

ENV KT_SERVER_SWAGGER=False
ENV KT_SERVER_DEBUG=False
ENV KT_SERVER_SECRET_KEY='secret_key'
ENV KT_DATABASE_URI='sqlite:////data/database.sqlite3'
ENV KT_LOG_LEVEL='INFO'

COPY . /app

VOLUME [ "/data", "/log", "/app/web/static/images/cache" ]

EXPOSE 5000/TCP

WORKDIR /app
CMD ["/usr/local/bin/python", "/app/app.py"]
