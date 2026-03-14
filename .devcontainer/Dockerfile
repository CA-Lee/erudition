FROM mcr.microsoft.com/devcontainers/typescript-node:4-24-trixie

RUN corepack enable \
    && corepack prepare pnpm@latest --activate \
    && pnpm self-update

# Install cloudflared
RUN mkdir -p --mode=0755 /usr/share/keyrings \
    && curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null \
    && echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' | tee /etc/apt/sources.list.d/cloudflared.list \
    && apt-get update \
    && apt-get install -y cloudflared \
    && rm -rf /var/lib/apt/lists/*
    
USER node

# Claude Code native install (must run as the target user, not root)
RUN curl -fsSL https://claude.ai/install.sh | bash

RUN npm install -g @google/gemini-cli
