FROM nginx:alpine

# Metadata
LABEL maintainer="Lê Chí Quốc Hùng"
LABEL description="PhotoFrame Studio - Batch photo watermark & camera frame generator"

# Custom Nginx configuration
COPY default.conf /etc/nginx/conf.d/default.conf

# Clean default html and copy web assets
RUN rm -rf /usr/share/nginx/html/*
COPY index.html style.css fujifilm-logo.svg /usr/share/nginx/html/
COPY src/ /usr/share/nginx/html/src/

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
