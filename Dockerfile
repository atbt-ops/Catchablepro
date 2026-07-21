# SkillMatch — minimal production image
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install deps first for better layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY run.py seed.py ./

# Persist the SQLite DB and uploaded resumes on a volume.
RUN mkdir -p data/uploads
VOLUME ["/app/data"]

EXPOSE 8000
# SECRET_KEY should be provided at runtime: docker run -e SECRET_KEY=...
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
