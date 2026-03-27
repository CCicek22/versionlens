# versionlens

Stop your AI coding agent from hallucinating package versions.

AI tools like Claude Code, Cursor, GitHub Copilot, and OpenAI Codex frequently suggest outdated package versions, deprecated APIs, wrong Docker image tags, and non-existent AI model IDs. They don't know what was released yesterday.

**versionlens** generates a single `versions.md` file with real, verified versions from live registries — and tells your AI to read it before suggesting anything.

## Quick Start

### Option 1: Zero setup (use the built-in registry)

Add one line to your AI tool's config file:

**CLAUDE.md:**
```markdown
Before suggesting any package version, read the relevant file from:
https://raw.githubusercontent.com/CCicek22/versionlens/main/registry/

Available: npm.md, pip.md, maven.md, go.md, rust.md, docker.md, runtimes.md, tools.md, ai-models.md
```

**Cursor (.cursorrules):**
```
When suggesting package versions, reference:
https://raw.githubusercontent.com/CCicek22/versionlens/main/registry/npm.md
https://raw.githubusercontent.com/CCicek22/versionlens/main/registry/pip.md
https://raw.githubusercontent.com/CCicek22/versionlens/main/registry/maven.md
https://raw.githubusercontent.com/CCicek22/versionlens/main/registry/go.md
https://raw.githubusercontent.com/CCicek22/versionlens/main/registry/rust.md
https://raw.githubusercontent.com/CCicek22/versionlens/main/registry/docker.md
```

**GitHub Copilot / Codex:** Same approach — add the raw URLs to `.github/copilot-instructions.md` or `AGENTS.md`.

### Option 2: CLI (custom tracking for your project)

```bash
npx versionlens init
```

Follow the prompts, and in under 2 minutes you'll have:

1. A `versionlens.yaml` config listing what to track
2. A `versions.md` with real versions from npm, PyPI, Docker Hub, and more
3. An instruction snippet in your AI tool's config file

Or pull 450+ packages from the built-in registry (no config needed):

```bash
npx versionlens update --from-registry
```

## Built-in Registry

The [`registry/`](registry/) folder contains pre-fetched versions for 450+ packages, updated hourly by GitHub Actions. No install needed — just point your AI at the raw URLs.

| File | Contents | Count |
|------|----------|-------|
| [npm.md](registry/npm.md) | JavaScript/TypeScript (React, Next, Vue, Express, etc.) | ~158 |
| [pip.md](registry/pip.md) | Python (FastAPI, Django, PyTorch, LangChain, etc.) | ~99 |
| [maven.md](registry/maven.md) | Java/Kotlin (Spring Boot, Hibernate, JUnit, Kafka, etc.) | ~39 |
| [go.md](registry/go.md) | Go (Gin, GORM, gRPC, Cobra, etc.) | ~30 |
| [rust.md](registry/rust.md) | Rust (Tokio, Axum, Serde, SQLx, Tonic, etc.) | ~48 |
| [docker.md](registry/docker.md) | Docker images with slim/alpine/debian variants | ~47 |
| [runtimes.md](registry/runtimes.md) | Node, Python, Bun, Deno, Go, Rust, Java, Ruby, PHP, .NET | 10 |
| [tools.md](registry/tools.md) | CLI tools (pnpm, gh, Terraform, Gradle, etc.) | ~22 |
| [ai-models.md](registry/ai-models.md) | Closed API IDs + open-weight models from HuggingFace | ~80+ |

**AI models:**
- Open-weight models (Llama, Qwen, DeepSeek, Gemma, Phi, Mistral) are auto-fetched from HuggingFace API
- Closed API models (Claude, GPT, Gemini, Grok) are verified from live APIs and updated via commit

## What It Tracks

| Source | API | Auth Required |
|--------|-----|:---:|
| npm packages | registry.npmjs.org | No |
| PyPI packages | pypi.org | No |
| Maven/Java/Kotlin | search.maven.org | No |
| Go modules | proxy.golang.org | No |
| Rust crates | crates.io | No |
| Docker images | hub.docker.com + endoflife.date | No |
| Runtimes (Node, Python, Bun, Java, Go, Rust, Deno) | Official APIs | No |
| GitHub releases | api.github.com | Optional `GITHUB_TOKEN` |
| AI models (Claude, GPT, Gemini, Grok, Llama, etc.) | Curated + HuggingFace | No |

## CLI Commands

```bash
versionlens init                   # Interactive setup
versionlens update                 # Refresh versions.md from live registries
versionlens update --from-registry # Pull from built-in registry (450+ packages)
versionlens update --json          # Output as JSON
versionlens add npm react zod      # Add packages to track
versionlens add docker mongo       # Add Docker images
versionlens remove pip flask       # Stop tracking a package
versionlens list                   # Show tracked packages
versionlens integrate              # Re-inject AI tool instruction snippets
versionlens doctor                 # Check config + connectivity
```

## Config

`versionlens.yaml` — lives in your project root:

```yaml
npm:
  - react
  - next
  - typescript

pip:
  - fastapi
  - pydantic

runtimes:
  - node
  - python

docker:
  - node
  - postgres
  - redis

ai_models:
  - anthropic
  - openai
  - google
  - xai

integrations:
  - claude     # CLAUDE.md
  - cursor     # .cursorrules
  - copilot    # .github/copilot-instructions.md
  - codex      # AGENTS.md
```

## Docker Image Tracking

Docker images show 3 tag variants so your AI picks the right base:

| Image | Version | Slim | Alpine | Debian |
|-------|---------|------|--------|--------|
| node | 25.8.2 | 25.8.2-slim | 25.8.2-alpine | 25.8.2-trixie |
| python | 3.14.3 | 3.14.3-slim | 3.14.3-alpine | 3.14.3-trixie |
| postgres | 18.3 | - | 18.3-alpine | 18.3-trixie |

## AI Tool Integration

When you run `init` or `integrate`, versionlens injects an instruction block wrapped in sentinel markers (idempotent, won't duplicate):

| Tool | Config file |
|------|-------------|
| Claude Code | `CLAUDE.md` |
| Cursor | `.cursorrules` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| OpenAI Codex | `AGENTS.md` |

## Contributing

Want to add a package to the registry? Edit the arrays in `scripts/update.mjs` and submit a PR:

- `NPM_PACKAGES` — npm packages
- `PIP_PACKAGES` — PyPI packages
- `MAVEN_PACKAGES` — Java/Kotlin Maven packages
- `GO_MODULES` — Go modules
- `RUST_CRATES` — Rust crates
- `DOCKER_IMAGES` — Docker images
- `GITHUB_TOOLS` — CLI tools from GitHub releases
- `HF_OPEN_MODELS` — HuggingFace open-weight model families

## How It Works

1. **Registry** (zero setup): GitHub Actions runs `scripts/update.mjs` hourly, fetches from 9 registries in parallel, writes markdown tables to `registry/`, auto-commits
2. **CLI** (custom): Reads `versionlens.yaml`, fetches your specific packages, writes `versions.md`, injects AI instruction snippet
3. **`--from-registry`**: Pulls pre-fetched versions from this repo's `registry/` folder

No server. No MCP. No API keys. Just markdown files.

## Why Not Context7 / MCP?

| | versionlens | Context7 |
|---|---|---|
| Setup | One line in config | MCP server install |
| Speed | File read (~0 tokens) | API call per query |
| Works offline | Yes (git clone) | No |
| Works with any AI tool | Yes | MCP-compatible only |
| You control the data | Fork it | No |

## License

MIT
