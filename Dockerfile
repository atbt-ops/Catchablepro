# Catchablepro — minimal production image
#
# Multi-stage: dependencies are resolved in a builder and only the finished
# virtualenv is carried into the runtime image, so pip's caches and any
# build-time artefacts never ship to production.

# --------------------------------------------------------------------------- #
# Build stage — resolve dependencies into a self-contained virtualenv
# --------------------------------------------------------------------------- #
FROM python:3.13-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install deps first for better layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# --------------------------------------------------------------------------- #
# Runtime stage
# --------------------------------------------------------------------------- #
FROM python:3.13-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# Run unprivileged: a container escape from root inside the container is root
# on the node. The fixed high UID also satisfies a Kubernetes
# runAsNonRoot/runAsUser policy without the cluster having to resolve a name.
RUN useradd --system --create-home --uid 10001 app

COPY --from=builder /opt/venv /opt/venv

WORKDIR /app

# Application code stays root-owned and world-readable: the app user needs to
# read it, and nothing at runtime should be able to rewrite it.
COPY app ./app
COPY run.py seed.py ./

# The SQLite DB and uploaded resumes live here, so this is the one path the app
# user must own. Docker seeds a fresh named volume from the image directory and
# preserves this ownership; a bind mount does not, and must be chowned to 10001
# on the host (an unwritable mount shows up as a 503 from /readyz).
RUN mkdir -p data/uploads && chown -R app:app data
VOLUME ["/app/data"]

USER app

EXPOSE 8000

# Readiness, not liveness: this is what tells Docker the container is working
# rather than merely running. urlopen raises on a 503 or a refused connection,
# and an uncaught exception exits non-zero, which is the unhealthy signal —
# with the reason left in `docker inspect`'s health log.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/readyz', timeout=4)"]

# SECRET_KEY should be provided at runtime: docker run -e SECRET_KEY=...
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
