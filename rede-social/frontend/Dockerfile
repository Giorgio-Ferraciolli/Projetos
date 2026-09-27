# Certificados raiz extras (opcional). O docker-compose.yml substitui este estágio vazio
# pela pasta infrastructure/certs, útil atrás de proxies corporativos com inspeção TLS.
FROM scratch AS certs

# ---------- Etapa 1: build da aplicação React ----------
FROM node:22-alpine AS build

WORKDIR /app

COPY --from=certs . /usr/local/share/ca-certificates/extra/

# Dependências primeiro: esta camada fica em cache enquanto o package-lock não mudar.
COPY package.json package-lock.json ./
RUN if ls /usr/local/share/ca-certificates/extra/*.crt >/dev/null 2>&1; then \
      cat /usr/local/share/ca-certificates/extra/*.crt > /tmp/extra-ca.pem; \
      export NODE_EXTRA_CA_CERTS=/tmp/extra-ca.pem; \
    fi; \
    npm ci --no-audit --no-fund --fetch-retries=5 --fetch-retry-maxtimeout=120000

COPY . .
RUN npm run build

# ---------- Etapa 2: nginx servindo os arquivos estáticos ----------
FROM nginx:1.29-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
