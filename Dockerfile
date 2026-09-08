FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html

# Render injects environment variables at runtime. We use DERIV_APP_ID only
# for the public Deriv WebSocket app_id; never put an API token in the frontend.
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
