# Builds Sift as one container: the React app is compiled into the API's wwwroot,
# and the ASP.NET Core API serves both the frontend and /api.

# 1. Frontend
FROM node:20-alpine AS web
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Writes to ../backend/Sift.Api/wwwroot (see vite.config.js, "app" mode).
RUN npm run build:app

# 2. API
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS api
WORKDIR /src/backend/Sift.Api
COPY backend/Sift.Api/Sift.Api.csproj ./
RUN dotnet restore
COPY backend/Sift.Api/ ./
COPY --from=web /src/backend/Sift.Api/wwwroot ./wwwroot
RUN dotnet publish -c Release -o /app --no-restore

# 3. Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=api /app ./
ENV ASPNETCORE_ENVIRONMENT=Production
# Hosts like Render terminate HTTPS at a proxy. Trusting its X-Forwarded-Proto/For headers makes the
# app see the real scheme, so the sign-in cookie is Secure and Steam returns to an https:// URL.
# Only safe because the container is reachable solely through that proxy.
ENV ASPNETCORE_FORWARDEDHEADERS_ENABLED=true
# The base image's unprivileged user; 8080 needs no root.
USER $APP_UID
EXPOSE 8080
# Hosts like Render pass the port to listen on in $PORT; default to 8080 elsewhere.
CMD ["sh", "-c", "ASPNETCORE_HTTP_PORTS=${PORT:-8080} exec dotnet Sift.Api.dll"]
