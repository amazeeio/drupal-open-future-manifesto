########################################################
# Start with the Python builder image
########################################################
FROM uselagoon/python-3.12 as builder
ARG LAGOON_ENVIRONMENT_TYPE
RUN echo "$LAGOON_ENVIRONMENT_TYPE: Running image builder"

########################################################
# Install dependencies
########################################################
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /app/requirements.txt

########################################################
# Copy application code
########################################################
COPY . /app

########################################################
# Set the command to run
########################################################
# Production: run with Gunicorn + Uvicorn workers
# Development: Lagoon will override this via docker-compose command
CMD if [[ "$LAGOON_ENVIRONMENT_TYPE" == "production" ]]; then \
        echo "Production: starting Gunicorn"; \
        gunicorn app.main:app \
            --worker-class uvicorn.workers.UvicornWorker \
            --workers 2 \
            --bind 0.0.0.0:3000 \
            --timeout 120 \
            --access-logfile - \
            --error-logfile -; \
    else \
        echo "Development: starting Uvicorn with reload"; \
        uvicorn app.main:app --host 0.0.0.0 --port 3000 --reload; \
    fi
