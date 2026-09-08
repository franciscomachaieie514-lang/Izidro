FROM node:20-alpine

WORKDIR /app
COPY index.html /app/index.html
COPY favicon.svg /app/favicon.svg
COPY auth.js /app/auth.js
COPY server.js /app/server.js
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 10000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
