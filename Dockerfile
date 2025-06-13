FROM python:3.11 AS base

RUN mkdir /app && mkdir /data
COPY requirements.txt /app/requirements.txt
RUN pip install -r /app/requirements.txt


FROM base AS development

ARG UID=1000
ARG GID=1000
ARG USERNAME=vscode

RUN groupadd --gid $GID $USERNAME \
    && useradd --uid $UID --gid $GID -m -s /bin/bash $USERNAME

RUN apt update && apt install -y sqlite3 sudo

RUN usermod -aG sudo $USERNAME
RUN echo "$USERNAME ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers


FROM base

ENV KT_KODI_ENABLE_DEMO_API=False

ENV KT_KODI_USERNAME='kodi'
ENV KT_KODI_PASSWORD='kodi'
ENV KT_KODI_HOST='127.0.0.1'
ENV KT_KODI_PORT=8080
ENV KT_KODI_TIMEOUT=3

ENV KT_SMB_USER='samba'
ENV KT_SMB_PASSWORD='samba'

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