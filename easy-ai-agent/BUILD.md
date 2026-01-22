# Agent Sandbox Image Build Guide

## Overview
This directory contains the Easy AI Agent source code and Dockerfile for building the `agent-sandbox:latest` image used by Agent Lab.

## Building the Image

### Method 1: Using docker-compose (Recommended)
```bash
# From HighStation root directory
cd ~/highstation

# Build agent-sandbox image
docker-compose build agent-sandbox

# Verify
docker images | grep agent-sandbox
```

### Method 2: Manual Build
```bash
# From this directory
cd easy-ai-agent

# Build directly
docker build -t agent-sandbox:latest .
```

## Usage
The built image is automatically used by Agent Lab when users connect to the terminal sandbox.

No manual container start is needed - the image is spawned on-demand by `terminal-pty.ts`.

## Requirements
- Docker
- Node.js 20+ (for local development)

## Related Files
- `Dockerfile` - Image build definition
- `../docker-compose.yml` - Automated build configuration
- `../src/lib/terminal-pty.ts` - Container spawning logic
