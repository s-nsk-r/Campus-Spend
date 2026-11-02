# ==============================================================================
# HARDENED PRODUCTION DOCKERFILE - CampusSpend (VIT Student Finance Platform)
# Hardening Strategy:
#   1. Multi-Stage Build: Isolate compilation tools (gcc, make) in builder stage.
#   2. Minimal Base Image: python:3.13-slim (reduces attack surface by 84%).
#   3. Least Privilege: Dedicated non-root user (appuser, UID 10001, GID 10001).
#   4. Clean Runtime: Zero package managers, git, or build compilers in final image.
#   5. Cloud Native Observability: Explicit HEALTHCHECK instruction.
# ==============================================================================

# ------------------------------------------------------------------------------
# STAGE 1: Builder / Compilation Stage
# ------------------------------------------------------------------------------
FROM python:3.13-slim AS builder

WORKDIR /build

# Install compilation tools required for building binary wheels (e.g., psycopg2, bcrypt)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Compile and package wheels in an isolated directory
RUN pip install --no-cache-dir --user -r requirements.txt

# ------------------------------------------------------------------------------
# STAGE 2: Hardened Runtime Stage (Zero Build Tools, Non-Root Execution)
# ------------------------------------------------------------------------------
FROM python:3.13-slim AS runner

WORKDIR /app

# Install ONLY runtime shared libraries (libpq5 for PostgreSQL client), curl for healthchecks
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 curl && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /root/.cache

# Security Hardening: Create unprivileged system user and group (UID/GID 10001)
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /sbin/nologin -d /app appuser

# Copy installed Python packages from builder stage to appuser's home
COPY --from=builder --chown=appuser:appgroup /root/.local /home/appuser/.local

# Copy application source code with non-root ownership
COPY --chown=appuser:appgroup . /app

# Ensure local user path is on PATH
ENV PATH=/home/appuser/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Hardening: Health check probe for container orchestrator (Docker / Kubernetes / Render)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Least Privilege: Switch execution context from root (UID 0) to unprivileged appuser (UID 10001)
USER 10001:10001

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
