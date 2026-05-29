########################################################
# Start with the node builder image 
########################################################
FROM uselagoon/node-24-builder as builder
ARG LAGOON_ENVIRONMENT_TYPE
RUN echo "$LAGOON_ENVIRONMENT_TYPE: Running image builder"

########################################################
# Install PNPM
########################################################
RUN npm install -g pnpm@8 && pnpm config set store-dir /tmp/cache/pnpm

COPY pnpm-lock.yaml package.json /app/
RUN pnpm install

########################################################
# Switch to the node runner image
########################################################
FROM uselagoon/node-24
ARG LAGOON_ENVIRONMENT_TYPE
ARG SITE_URL
RUN echo "$LAGOON_ENVIRONMENT_TYPE: Switching to image runner"
RUN export

########################################################
# Install PNPM
########################################################
RUN npm install -g pnpm@8 && pnpm config set store-dir /tmp/cache/pnpm

########################################################
# Copy and build
########################################################
COPY --from=builder /app /app
COPY . /app

RUN if [[ "$LAGOON_ENVIRONMENT_TYPE" == "production" ]]; then \
	    echo "$LAGOON_ENVIRONMENT_TYPE: Running production build"; \
	    /app/lagoon/scripts/next-build.sh; \
    else \
	    echo "$LAGOON_ENVIRONMENT_TYPE: Skipping production build"; \
    fi

########################################################
# Set the command to run
########################################################
CMD ["/app/lagoon/scripts/next-run.sh"]