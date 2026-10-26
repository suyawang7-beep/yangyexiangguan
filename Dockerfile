FROM nginx:1.27-alpine
COPY ui-preview/buzhi2/ /usr/share/nginx/html/
EXPOSE 80
