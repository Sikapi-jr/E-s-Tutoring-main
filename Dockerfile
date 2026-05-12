# Stage 1: build the React frontend
FROM node:22.11 AS frontend-builder
WORKDIR /frontend
COPY ./frontend/package.json ./frontend/package-lock.json ./
RUN npm ci
COPY ./frontend .
RUN npm run build

# Stage 2: Django backend
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

# Bring in the compiled frontend (replaces raw source)
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# Collect static files (with temporary SECRET_KEY for build)
ENV SECRET_KEY=django-insecure-build-key-only-for-collectstatic
RUN python manage.py collectstatic --noinput
ENV SECRET_KEY=

EXPOSE 8000

# Use gunicorn for production
CMD ["sh", "-c", "python manage.py migrate && gunicorn egstutorting.wsgi:application --bind 0.0.0.0:$PORT"]
