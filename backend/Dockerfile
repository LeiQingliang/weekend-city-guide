FROM node:22-bookworm-slim

ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787
WORKDIR /app
COPY --chown=node:node server.mjs ./server.mjs
USER node
EXPOSE 8787
CMD ["node", "server.mjs"]
