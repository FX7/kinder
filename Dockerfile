FROM alpine:latest AS base

RUN apk add python3 py3-pip

RUN mkdir /app && mkdir /data && mkdir /.app
COPY requirements.txt /app/requirements.txt

RUN /usr/bin/python3 -m venv /.app \
    && . /.app/bin/activate \
    && pip install -r /app/requirements.txt


FROM base AS development

ARG UID=1000
ARG GID=1000
ARG USERNAME=vscode

RUN apk add sqlite sudo bash git openssh

RUN addgroup --gid $GID $USERNAME \
    && adduser -u $UID -G $USERNAME -D -s /bin/bash $USERNAME \
    && echo "$USERNAME ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers \
    && addgroup -S sudo && addgroup $USERNAME sudo


FROM base

ENV KT_KODI_ENABLE_DEMO_API=False

ENV KT_KODI_USERNAME='kodi'
ENV KT_KODI_PASSWORD='kodi'
ENV KT_KODI_HOST='127.0.0.1'
ENV KT_KODI_PORT=8080
ENV KT_KODI_TIMEOUT=3

ENV KT_OVERLAY_TITLE=True
ENV KT_OVERLAY_DURATION=False
ENV KT_OVERLAY_GENRES=True
ENV KT_OVERLAY_WATCHED=False
ENV KT_OVERLAY_AGE=False

ENV KT_SMB_USER='samba'
ENV KT_SMB_PASSWORD='samba'

ENV KT_IMAGE_PREFERENCE='kodi_thumbnail, kodi_art, kodi_file, tmdb, imdb'
# none : No action for the perfect match will be provided
# play : Direct play in kodi for the perfect match will be provided
ENV KT_MATCH_ACTION='none'
# How many TOP/FLOP movies should be displayed in the stats?
ENV KT_TOP_COUNT=3
ENV KT_FLOP_COUNT=3

# Comma seperated list of default sources K-inder should fetch movies from.
# The order also describes the prefered source, if a movie was found in multiple sources
# Some sources may need further configuration (e.g.: kodi needs KT_KODI_USERNAME, KT_KODI_PASSWORD, KT_KODI_HOST)
ENV KT_FILTER_DEFAULT_SOURCES='kodi'
# e.g. : Horror,Action
ENV KT_FILTER_DEFAULT_DISABLED_GENRES=
ENV KT_FILTER_DEFAULT_MUST_GENRES=
# 0 :  0 years
# 1 :  6 years
# 2 : 12 years
# 3 : 16 years
# 4 : 18+ years
ENV KT_FILTER_DEFAULT_MAX_AGE=4
# 0 :  30 minutes
# 1 :  60 minutes
# 2 :  90 minutes
# 3 : 120 minutes
# 4 : 135 minutes
# 5 : 150 minutes
# 6 : 165 minutes
# 7 : 180 minutes
# 8 : 210 minutes
# 9 : 240 minutes
# 10: 240+ minutes
ENV KT_FILTER_DEFAULT_MAX_DURATION=10
ENV KT_FILTER_DEFAULT_INCLUDE_WATCHED=True

ENV KT_OMDB_API_KEY='e26c797e'
ENV KT_TMDB_API_KEY='eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2NjE0NWZjM2MxYzRhYzc0YmRiMTA0M2Q0MmI3MDA3YiIsIm5iZiI6MTc0OTg1Mjc0NS44ODUsInN1YiI6IjY4NGNhMjQ5OTA1NDM2ZjFhZTNkZjJmOSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.NhAxayBq7-Un3tjKWHkWdahkV3e-AbHgUnLGjxuvG8g'
ENV KT_TMBD_API_LANGUAGE='de-DE'
ENV KT_TMBD_API_REGION='de'
ENV KT_TMBD_API_TIMEOUT=3

ENV KT_SERVER_HOST='0.0.0.0'
ENV KT_SERVER_SWAGGER=False
ENV KT_SERVER_DEBUG=False
ENV KT_SERVER_SECRET_KEY='secret_key'
ENV KT_DATABASE_URI='sqlite:////data/database.sqlite3'
ENV KT_CACHE_FOLDER='/cache'
ENV KT_LOG_FOLDER='/log'
ENV KT_LOG_LEVEL='INFO'

COPY . /app
RUN chmod a+x /app/docker-entrypoint.sh \
    &&  chmod a+x /app/alpine-start.sh

VOLUME [ "/data", "/log", "/cache" ]

EXPOSE 5000/TCP

WORKDIR /app

ENTRYPOINT  ["/app/docker-entrypoint.sh" ]
CMD [ "/app/alpine-start.sh" ]