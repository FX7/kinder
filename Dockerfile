FROM python:3.11 AS base

RUN mkdir /app && mkdir /data
COPY requirements.txt /app/requirements.txt
RUN pip install -r /app/requirements.txt


FROM base

COPY . /app
WORKDIR /app

VOLUME /data
EXPOSE 5050/TCP

CMD ["python", "app.py"]
