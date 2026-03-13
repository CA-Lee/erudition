FROM mcr.microsoft.com/devcontainers/typescript-node:4-24-trixie

RUN corepack enable && corepack prepare pnpm@latest --activate

RUN npm install -g @google/gemini-cli

# Claude Code native install (must run as the target user, not root)
USER node
RUN curl -fsSL https://claude.ai/install.sh | bash
USER root
