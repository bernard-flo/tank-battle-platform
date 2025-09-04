FROM nvidia/cuda:12.4.0-devel-ubuntu22.04

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y \
      curl \
      git \
      python3-full \
 && rm -rf /var/lib/apt/lists/*

RUN curl -fsSLO --compressed "https://nodejs.org/dist/v22.19.0/node-v22.19.0-linux-x64.tar.xz" \
 && tar -xJf "node-v22.19.0-linux-x64.tar.xz" -C /usr/local --strip-components=1 --no-same-owner \
 && rm "node-v22.19.0-linux-x64.tar.xz" \
 && npm -g install @openai/codex

COPY .codex/ /root/.codex
COPY docker-entrypoint.sh /docker-entrypoint.sh

VOLUME /project
WORKDIR /project

ENTRYPOINT ["/docker-entrypoint.sh"]
