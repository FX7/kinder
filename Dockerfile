FROM alpine:latest AS base

RUN apk add python3 py3-pip && rm -r /var/cache/apk

RUN mkdir /app && mkdir /data && mkdir /.app
COPY requirements.txt /app/requirements.txt

RUN arch=$(uname -m) && \
    if [ "$arch" = "armv7l" ] || [ "$arch" = "armv7" ]; then \
      sed -i 's|smbprotocol||' /app/requirements.txt; sed -i 's|flasgger||' /app/requirements.txt; sed -i 's|python-dotenv||' /app/requirements.txt; \
    fi

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

ENV KT_KODI_USERNAME='kodi'
ENV KT_KODI_PASSWORD='kodi'
ENV KT_KODI_HOST='127.0.0.1'
ENV KT_KODI_PORT=8080
ENV KT_KODI_TIMEOUT=1

ENV KT_EMBY_TIMEOUT=2
ENV KT_EMBY_URL='http://localhost/'
ENV KT_EMBY_API_KEY=

ENV KT_JELLYFIN_TIMEOUT=2
ENV KT_JELLYFIN_URL='http://localhost/'
ENV KT_JELLYFIN_API_KEY=

ENV KT_PLEX_TIMEOUT=2
ENV KT_PLEX_URL='http://localhost/'
ENV KT_PLEX_API_KEY=

ENV KT_OVERLAY_TITLE=True
ENV KT_OVERLAY_DURATION=True
ENV KT_OVERLAY_GENRES=True
ENV KT_OVERLAY_WATCHED=True
ENV KT_OVERLAY_AGE=True

ENV KT_SMB_USER='samba'
ENV KT_SMB_PASSWORD='samba'

# none : No action for the perfect match will be provided
# play : Direct play in kodi for the perfect match will be provided
ENV KT_MATCH_ACTION='none'
# How many TOP/FLOP movies should be displayed in the stats?
ENV KT_TOP_COUNT=3
ENV KT_FLOP_COUNT=3

# Disable some filter.
# more specific: Hide them from the "Session Create" screen.
# This means the FILTER_DEFAULT settings will still apply, but you can not change them.
ENV KT_FILTER_HIDE_PROVIDER=False
ENV KT_FILTER_HIDE_DISABLED_GENRES=False
ENV KT_FILTER_HIDE_MUST_GENRES=False
ENV KT_FILTER_HIDE_MAX_AGE=False
ENV KT_FILTER_HIDE_MAX_DURATION=False
ENV KT_FILTER_HIDE_INCLUDE_WATCHED=False
ENV KT_FILTER_HIDE_OVERLAY=False
ENV KT_HIDE_END=False
# Comma seperated list of default sources K-inder should fetch movies from.
# Valid (single) values are:
# kodi
# netflix
# amazon_prime
# amazon_video
# disney_plus
# paramount_plus
# apple_tv_plus
# example for multiple would be : 'kodi,netflix')
# Some sources may need further configuration (e.g.: kodi needs KT_KODI_USERNAME, KT_KODI_PASSWORD, KT_KODI_HOST)
ENV KT_FILTER_DEFAULT_PROVIDER='kodi'
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
ENV KT_TMDB_API_LANGUAGE='de-DE'
ENV KT_TMDB_API_REGION='DE'
ENV KT_TMDB_API_TIMEOUT=3
ENV KT_TMDB_API_INCLUDE_ADULT=false
# Possibilitys to fetch movie lists from netflix.
# The movies will NOT be presented in the order you define here.
# But the first 200 of the given order will be randomized an be presented to you.
# original_title.[asc|desc]
# popularity.[asc|desc]
# revenue.[asc|desc]
# primary_release_date.[asc|desc]
# title.[asc|desc]
# vote_average.[asc|desc]
# vote_count.[asc|desc]
ENV KT_TMDB_API_DISCOVER_SORT='popularity.desc'
# Total movies to be fetched from the TMDB API to be presented for voting.
# Values > 1000 will be cut to 1000, so the given api key will not be escausted to fast ;-)
ENV KT_TMDB_API_DISCOVER_TOTAL=200
# Endconditions
# Vote will always be over when no movies for voting are left
ENV KT_DEFAULT_END_MAX_MINUTES=-1
ENV KT_DEFAULT_END_MAX_VOTES=-1
ENV KT_DEFAULT_END_MAX_MATCHES=-1

ENV KT_SERVER_HOST='0.0.0.0'
ENV KT_SERVER_SWAGGER=False
ENV KT_SERVER_DEBUG=False
ENV KT_SERVER_SECRET_KEY='secret_key'
ENV KT_DATA_FOLDER='/data'
ENV KT_DATABASE_URI=sqlite:////$KT_DATA_FOLDER/database.sqlite3
ENV KT_CACHE_FOLDER='/cache'
ENV KT_LOG_FOLDER='/log'
ENV KT_LOG_LEVEL='INFO'
ENV KT_EXECUTOR_WORKERS=3

RUN adduser -D -s /bin/sh kinder

COPY . /app
RUN chmod a+x /app/docker-entrypoint.sh \
    && chmod a+x /app/docker-start.sh \
    && chown -R kinder:kinder /app \
    && mkdir -p $KT_DATA_FOLDER $KT_LOG_FOLDER $KT_CACHE_FOLDER \
    && chown kinder:kinder $KT_DATA_FOLDER \
    && chown kinder:kinder $KT_LOG_FOLDER \
    && chown kinder:kinder $KT_CACHE_FOLDER

VOLUME [ "/data", "/log", "/cache" ]

EXPOSE 5000/TCP

WORKDIR /app

#USER kinder
ENTRYPOINT  ["/app/docker-entrypoint.sh" ]
CMD [ "/app/docker-start.sh" ]