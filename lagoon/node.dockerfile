FROM uselagoon/node-24-builder AS builder
ARG LAGOON_ENVIRONMENT_TYPE
WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm ci

COPY . /app
RUN /bin/sh /app/lagoon/scripts/next-build.sh

FROM uselagoon/node-24 AS runner
ARG LAGOON_ENVIRONMENT_TYPE
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app /app

EXPOSE 3000

CMD ["/bin/sh", "/app/lagoon/scripts/next-run.sh"]