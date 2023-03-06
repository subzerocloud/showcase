## start from the official image for PostgreSQL and just add the extension
FROM postgres:15-bullseye
ARG VERSION=0.0.0

# install the extension
COPY subzero_debian-bullseye_pg15-${VERSION}_aarch64.deb .
COPY introspection_query.sql /introspection_query.sql
RUN export ARCH=$(uname -m) && \
    apt-get install -y ./subzero_debian-bullseye_pg15-${VERSION}_$ARCH.deb