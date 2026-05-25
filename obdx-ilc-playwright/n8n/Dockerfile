# OBDX Full QA Pipeline — single fat container
#
# Bundles:
#   - Playwright 1.44 + Chromium + all system deps (from the official image)
#   - n8n (global npm install)
#   - The project source at /workspace, with node_modules installed
#
# The n8n workflow's executeCommand nodes shell out inside this container,
# so npx tsc, npx playwright test, npm run report:custom, and the Jira
# helper all "just work" without Docker-in-Docker or RPC to a sidecar.

FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# n8n expects to run as a non-root user; the Playwright image already has
# a `pwuser` (uid 1000). Keep it.
USER root

# Install n8n + Claude Code CLI globally.
# Claude Code is the LLM driver — no Anthropic API key required;
# auth is interactive (subscription) and persists at /home/node/.claude.
ARG N8N_VERSION=1.66.0
ARG CLAUDE_CODE_VERSION=latest
RUN npm install -g n8n@${N8N_VERSION} @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION} \
    && npm cache clean --force

# Working directory = the project mounted from the host.
# The host bind-mount (see docker-compose.yml) replaces this at runtime,
# but having it here keeps the image self-contained for ad-hoc runs.
WORKDIR /workspace

# Install project dependencies at image build time so the first `up` is fast.
# The host bind-mount will shadow node_modules; the compose file uses a named
# volume for /workspace/node_modules so the in-image deps survive.
COPY package.json package-lock.json* /workspace/
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# Ensure Playwright browser binaries are present (the base image already has
# them, but a `npm install` of @playwright/test can shadow them — re-link).
RUN npx playwright install --with-deps chromium

# n8n config — paths n8n looks at inside the container.
ENV N8N_USER_FOLDER=/home/node/.n8n \
    N8N_DIAGNOSTICS_ENABLED=false \
    NODE_ENV=production \
    HEADLESS=true \
    NPM_CONFIG_UPDATE_NOTIFIER=false

# n8n stores creds + workflows under N8N_USER_FOLDER; Claude CLI stores
# auth/session under /home/node/.claude. Create both eagerly so the volume
# mounts have the right owner.
RUN mkdir -p ${N8N_USER_FOLDER} /home/node/.claude \
    && chown -R 1000:1000 ${N8N_USER_FOLDER} /home/node/.claude /workspace

USER 1000

# Note: n8n/project-context.md is regenerated on every workflow run by
# the "Load Project Context" node (it runs scripts/build-project-context.js
# against the bind-mounted .claude/skills/ before reading). No build-time
# pre-generation needed.

EXPOSE 5678

# Run n8n in long-running mode. Use exec form so signals (SIGTERM on
# `docker compose down`) reach n8n directly.
CMD ["n8n", "start"]
