FROM python:3.11 AS base

RUN mkdir /app && mkdir /data
COPY requirements.txt /app/requirements.txt
RUN pip install -r /app/requirements.txt


FROM base AS development

ARG UID=1000
ARG GID=1000
ARG USERNAME=vscode

RUN apt update && apt install -y sqlite3 sudo

RUN groupadd --gid $GID $USERNAME \
    && useradd --uid $UID --gid $GID -m -s /bin/bash $USERNAME \
    && usermod -aG sudo $USERNAME \
    && echo "$USERNAME ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers


FROM base

ENV KT_KODI_ENABLE_DEMO_API=False

ENV KT_KODI_USERNAME='kodi'
ENV KT_KODI_PASSWORD='kodi'
ENV KT_KODI_HOST='127.0.0.1'
ENV KT_KODI_PORT=8080
ENV KT_KODI_TIMEOUT=3

ENV KT_SMB_USER='samba'
ENV KT_SMB_PASSWORD='samba'

ENV KT_IMAGE_PREFERENCE='kodi_thumbnail, kodi_art, kodi_file, tmdb, imdb'
ENV KT_OMDB_API_KEY='e26c797e'
ENV KT_TMDB_API_KEY='eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2NjE0NWZjM2MxYzRhYzc0YmRiMTA0M2Q0MmI3MDA3YiIsIm5iZiI6MTc0OTg1Mjc0NS44ODUsInN1YiI6IjY4NGNhMjQ5OTA1NDM2ZjFhZTNkZjJmOSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.NhAxayBq7-Un3tjKWHkWdahkV3e-AbHgUnLGjxuvG8g'
ENV KT_TMBD_API_LANGUAGE='de-DE'
ENV KT_TMBD_API_REGION='de'

ENV KT_SERVER_HOST='0.0.0.0'
ENV KT_SERVER_SWAGGER=False
ENV KT_SERVER_DEBUG=False
ENV KT_SERVER_SECRET_KEY='secret_key'
ENV KT_DATABASE_URI='sqlite:////data/database.sqlite3'
ENV KT_CACHE_FOLDER='/cache'
ENV KT_LOG_FOLDER='/log'
ENV KT_LOG_LEVEL='INFO'

COPY . /app
RUN chmod a+x /app/docker-entrypoint.sh

VOLUME [ "/data", "/log", "/cache" ]

EXPOSE 5000/TCP

WORKDIR /app

ENTRYPOINT  ["/app/docker-entrypoint.sh" ]
CMD [ "/usr/local/bin/python", "/app/app.py" ]