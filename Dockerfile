# ==============================================================================
# Dockerfile — CinemaStellar (High-Performance Nginx Alpine Container)
# Gobernado por el Estándar Google Cloud OKF v0.2
# ==============================================================================

FROM nginx:alpine

LABEL maintainer="Mileidys10 <agamezmileidys@gmail.com>"
LABEL project="CinemaStellar"
LABEL version="2.0.0"

# Copiar archivos de la aplicación web SPA al directorio público de Nginx
COPY index.html /usr/share/nginx/html/index.html
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY assets/ /usr/share/nginx/html/assets/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
