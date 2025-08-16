FROM node:18-alpine AS frontend-builder

# Build React frontend
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

# Copy built frontend to Django templates
COPY --from=frontend-builder /frontend/dist /app/templates/

# Collect static files (with temporary SECRET_KEY for build)
ENV SECRET_KEY=django-insecure-build-key-only-for-collectstatic
RUN python manage.py collectstatic --noinput
ENV SECRET_KEY=

EXPOSE 8000

# Use gunicorn for production
CMD ["sh", "-c", "python manage.py migrate && gunicorn egstutorting.wsgi:application --bind 0.0.0.0:$PORT"]