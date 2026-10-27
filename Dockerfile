FROM nginx:1.27-alpine
COPY ui-preview/buzhi2/ /usr/share/nginx/html/
COPY ui-preview/assets/ /usr/share/nginx/html/assets/
EXPOSE 80
