FROM node:24-bookworm-slim
WORKDIR /app
COPY index.html ./index.html
COPY admin ./admin
COPY ui-preview ./ui-preview
COPY assets ./assets
COPY server ./server
COPY client ./client
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV DB_PATH=/data/island.sqlite
EXPOSE 4178
CMD ["node", "server/index.mjs"]

