ARG PYTHON_VERSION=3.13-slim

FROM python:${PYTHON_VERSION}

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# install psycopg2 dependencies.
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /code

WORKDIR /code

COPY requirements.txt /tmp/requirements.txt
RUN set -ex && \
    pip install --upgrade pip && \
    pip install -r /tmp/requirements.txt && \
    rm -rf /root/.cache/
COPY . /code

ENV SECRET_KEY "f7tbQF9ZNMkwG9W7ms0CUpY1ONAfsAXLIXWlKzcjDhkpGvHxv9"
RUN python manage.py collectstatic --noinput

EXPOSE 8080

CMD gunicorn --bind :${PORT:-8080} --workers 2 backend.wsgi
