/**
 * versionlens-registry updater
 *
 * Fetches latest versions from npm, PyPI, Docker/endoflife.date,
 * runtime APIs, and GitHub releases. Writes markdown files that
 * AI coding agents can read directly from raw.githubusercontent.com.
 *
 * Zero dependencies — uses Node 18+ built-in fetch.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "registry");
const TIMEOUT = 10_000;

// ─── Helpers ────────────────────────────────────────────────────────

async function fetchJson(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", ...headers },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function ts() {
  return new Date().toISOString();
}

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── npm ────────────────────────────────────────────────────────────

const NPM_PACKAGES = [
  // Frameworks
  "react", "react-dom", "next", "vue", "nuxt", "svelte", "@sveltejs/kit",
  "angular", "@angular/core", "solid-js", "astro", "remix", "gatsby",
  // React Native / Mobile
  "react-native", "expo", "@expo/cli", "@react-navigation/native",
  // Routing
  "react-router-dom", "@tanstack/router",
  // State & Data
  "@tanstack/react-query", "@tanstack/react-table", "zustand", "jotai",
  "redux", "@reduxjs/toolkit", "mobx", "recoil", "swr",
  // UI Libraries
  "@mui/material", "@chakra-ui/react", "@mantine/core",
  "@radix-ui/react-dialog", "@headlessui/react", "antd",
  // Styling
  "tailwindcss", "styled-components", "@emotion/react", "sass",
  // Animation
  "framer-motion", "gsap", "@react-spring/web",
  // Forms & Validation
  "zod", "yup", "joi", "react-hook-form", "@hookform/resolvers", "valibot",
  // API & Server
  "express", "fastify", "hono", "koa", "nest", "@nestjs/core",
  "trpc", "@trpc/server", "@trpc/client",
  "axios", "ky", "got",
  // GraphQL
  "@apollo/client", "@apollo/server", "graphql", "urql",
  // WebSocket / Realtime
  "socket.io", "ws",
  // Database & ORM
  "drizzle-orm", "prisma", "@prisma/client", "typeorm", "knex",
  "mongoose", "sequelize", "ioredis", "pg",
  // Auth
  "next-auth", "passport", "jsonwebtoken", "bcrypt",
  // Payments
  "stripe", "@stripe/stripe-js", "@stripe/react-stripe-js",
  // Firebase / Supabase
  "firebase", "firebase-admin", "firebase-tools",
  "@supabase/supabase-js",
  // Cloud SDKs
  "@aws-sdk/client-s3", "@google-cloud/storage", "@azure/storage-blob",
  // AI SDKs
  "openai", "@anthropic-ai/sdk", "@google/generative-ai", "ai",
  "langchain", "@langchain/core",
  // Testing
  "vitest", "jest", "@testing-library/react", "@testing-library/jest-dom",
  "playwright", "@playwright/test", "cypress", "supertest",
  "puppeteer", "selenium-webdriver", "@storybook/react",
  // Build & Dev
  "typescript", "vite", "webpack", "esbuild", "tsup", "turbo", "rollup",
  "eslint", "prettier", "biome", "oxlint",
  // Bundlers & Config
  "@swc/core", "babel-loader", "postcss", "autoprefixer",
  // Email
  "nodemailer", "resend", "@sendgrid/mail",
  // File & Image
  "multer", "sharp", "jimp",
  // Queue & Jobs
  "bullmq", "bee-queue",
  // i18n
  "i18next", "react-i18next",
  // Markdown / Content
  "marked", "remark", "mdx",
  // Utilities
  "lodash", "date-fns", "dayjs", "luxon", "moment",
  "uuid", "nanoid", "semver", "glob", "minimatch",
  "dotenv", "commander", "inquirer", "chalk", "ora",
  "zx", "execa",
  // Monorepo
  "lerna", "nx", "@changesets/cli",
  // Runtime
  "bun", "tsx", "ts-node",
  // Package Managers (track their npm versions)
  "pnpm", "yarn",
];

async function fetchNpmVersions() {
  const results = await Promise.allSettled(
    NPM_PACKAGES.map(async (pkg) => {
      const encoded = pkg.startsWith("@") ? pkg.replace("/", "%2f") : pkg;
      const data = await fetchJson(`https://registry.npmjs.org/${encoded}/latest`);
      return { name: pkg, version: data.version };
    }),
  );

  return results.map((r, i) =>
    r.status === "fulfilled" ? r.value : { name: NPM_PACKAGES[i], version: "unknown" },
  );
}

// ─── PyPI ───────────────────────────────────────────────────────────

const PIP_PACKAGES = [
  // Web Frameworks
  "fastapi", "uvicorn", "flask", "django", "starlette", "gunicorn",
  "sanic", "litestar",
  // HTTP Clients
  "httpx", "requests", "aiohttp", "urllib3",
  // Data & Validation
  "pydantic", "sqlalchemy", "alembic", "tortoise-orm", "marshmallow",
  // Data Science
  "pandas", "numpy", "polars", "scipy",
  // Data Visualization
  "matplotlib", "seaborn", "plotly",
  // Jupyter
  "jupyter", "notebook", "ipykernel",
  // AI/ML
  "openai", "anthropic", "google-generativeai", "langchain", "langchain-core",
  "transformers", "torch", "tensorflow", "scikit-learn",
  "huggingface-hub", "diffusers", "accelerate",
  // AI Frameworks
  "crewai", "autogen", "llama-index",
  // Cloud
  "boto3", "google-cloud-storage", "firebase-admin",
  "azure-storage-blob",
  // Testing
  "pytest", "pytest-asyncio", "pytest-cov", "coverage",
  "mypy", "ruff", "pyright",
  "selenium", "playwright", "locust",
  // CLI & Utils
  "click", "typer", "rich", "pyyaml", "python-dotenv",
  "argparse", "tqdm",
  // Payments
  "stripe",
  // Auth & Crypto
  "pyjwt", "passlib", "cryptography", "bcrypt",
  // Database Drivers
  "psycopg2-binary", "asyncpg", "redis", "pymongo",
  "pymysql", "motor",
  // Vector Databases
  "qdrant-client", "pinecone-client", "chromadb", "weaviate-client",
  // Task Queues
  "celery", "dramatiq", "rq",
  // Image / Media
  "pillow", "opencv-python", "moviepy",
  // Scraping
  "beautifulsoup4", "scrapy", "lxml",
  // NLP
  "spacy", "nltk",
  // GraphQL
  "graphene", "strawberry-graphql",
  // Config / Env
  "dynaconf", "pydantic-settings",
  // Package Managers & Build
  "poetry-core", "setuptools", "wheel", "hatchling",
  // Async
  "anyio", "uvloop",
];

// ─── Maven (Java/Kotlin) ────────────────────────────────────────────

const MAVEN_PACKAGES = [
  // Spring Boot
  { g: "org.springframework.boot", a: "spring-boot-starter", name: "Spring Boot" },
  { g: "org.springframework.boot", a: "spring-boot-starter-web", name: "Spring Boot Web" },
  { g: "org.springframework.boot", a: "spring-boot-starter-data-jpa", name: "Spring Data JPA" },
  { g: "org.springframework.boot", a: "spring-boot-starter-security", name: "Spring Security" },
  { g: "org.springframework.boot", a: "spring-boot-starter-test", name: "Spring Boot Test" },
  // Spring Framework
  { g: "org.springframework", a: "spring-core", name: "Spring Core" },
  { g: "org.springframework", a: "spring-webflux", name: "Spring WebFlux" },
  // Kotlin
  { g: "org.jetbrains.kotlin", a: "kotlin-stdlib", name: "Kotlin" },
  { g: "org.jetbrains.kotlinx", a: "kotlinx-coroutines-core", name: "Kotlin Coroutines" },
  // Build
  { g: "org.apache.maven", a: "maven-core", name: "Maven" },
  // Database
  { g: "org.hibernate.orm", a: "hibernate-core", name: "Hibernate ORM" },
  { g: "org.mybatis", a: "mybatis", name: "MyBatis" },
  { g: "org.flywaydb", a: "flyway-core", name: "Flyway" },
  { g: "org.liquibase", a: "liquibase-core", name: "Liquibase" },
  // JSON
  { g: "com.fasterxml.jackson.core", a: "jackson-databind", name: "Jackson" },
  { g: "com.google.code.gson", a: "gson", name: "Gson" },
  // HTTP
  { g: "com.squareup.okhttp3", a: "okhttp", name: "OkHttp" },
  { g: "com.squareup.retrofit2", a: "retrofit", name: "Retrofit" },
  // Logging
  { g: "org.slf4j", a: "slf4j-api", name: "SLF4J" },
  { g: "ch.qos.logback", a: "logback-classic", name: "Logback" },
  { g: "org.apache.logging.log4j", a: "log4j-core", name: "Log4j" },
  // Testing
  { g: "org.junit.jupiter", a: "junit-jupiter", name: "JUnit 5" },
  { g: "org.mockito", a: "mockito-core", name: "Mockito" },
  { g: "org.assertj", a: "assertj-core", name: "AssertJ" },
  // Utility
  { g: "org.projectlombok", a: "lombok", name: "Lombok" },
  { g: "org.mapstruct", a: "mapstruct", name: "MapStruct" },
  { g: "com.google.guava", a: "guava", name: "Guava" },
  { g: "org.apache.commons", a: "commons-lang3", name: "Commons Lang3" },
  // Messaging
  { g: "org.apache.kafka", a: "kafka-clients", name: "Kafka Clients" },
  // gRPC
  { g: "io.grpc", a: "grpc-core", name: "gRPC" },
  // Reactive
  { g: "io.projectreactor", a: "reactor-core", name: "Project Reactor" },
  // Quarkus / Micronaut
  { g: "io.quarkus", a: "quarkus-core", name: "Quarkus" },
  { g: "io.micronaut", a: "micronaut-core", name: "Micronaut" },
  // HTTP Client
  { g: "org.apache.httpcomponents.client5", a: "httpclient5", name: "Apache HttpClient 5" },
  // Testing
  { g: "org.testcontainers", a: "testcontainers", name: "Testcontainers" },
  // Gradle tracked via GitHub releases
  // Validation
  { g: "org.hibernate.validator", a: "hibernate-validator", name: "Hibernate Validator" },
  // Security
  { g: "io.jsonwebtoken", a: "jjwt-api", name: "JJWT" },
  // Monitoring
  { g: "io.micrometer", a: "micrometer-core", name: "Micrometer" },
  // OpenAPI
  { g: "org.springdoc", a: "springdoc-openapi-starter-webmvc-ui", name: "SpringDoc OpenAPI" },
];

async function fetchMavenVersions() {
  const results = await Promise.allSettled(
    MAVEN_PACKAGES.map(async ({ g, a, name }) => {
      const data = await fetchJson(
        `https://search.maven.org/solrsearch/select?q=g:${g}+AND+a:${a}&rows=1&wt=json`,
      );
      const version = data.response?.docs?.[0]?.latestVersion ?? "unknown";
      return { name, id: `${g}:${a}`, version };
    }),
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { name: MAVEN_PACKAGES[i].name, id: `${MAVEN_PACKAGES[i].g}:${MAVEN_PACKAGES[i].a}`, version: "unknown" },
  );
}

// ─── Go modules ─────────────────────────────────────────────────────

const GO_MODULES = [
  // Web
  { mod: "github.com/gin-gonic/gin", name: "Gin" },
  { mod: "github.com/gofiber/fiber/v2", name: "Fiber" },
  { mod: "github.com/labstack/echo/v4", name: "Echo" },
  { mod: "github.com/gorilla/mux", name: "Gorilla Mux" },
  // Database
  { mod: "gorm.io/gorm", name: "GORM" },
  { mod: "github.com/jmoiron/sqlx", name: "sqlx" },
  { mod: "github.com/jackc/pgx/v5", name: "pgx (Postgres)" },
  { mod: "go.mongodb.org/mongo-driver", name: "MongoDB Driver" },
  { mod: "github.com/redis/go-redis/v9", name: "go-redis" },
  // gRPC & Protocol Buffers
  { mod: "google.golang.org/grpc", name: "gRPC-Go" },
  { mod: "google.golang.org/protobuf", name: "Protobuf-Go" },
  // Logging
  { mod: "go.uber.org/zap", name: "Zap Logger" },
  { mod: "github.com/sirupsen/logrus", name: "Logrus" },
  // Testing
  { mod: "github.com/stretchr/testify", name: "Testify" },
  // CLI
  { mod: "github.com/spf13/cobra", name: "Cobra" },
  { mod: "github.com/spf13/viper", name: "Viper" },
  // Cloud
  { mod: "github.com/aws/aws-sdk-go-v2", name: "AWS SDK Go v2" },
  { mod: "cloud.google.com/go", name: "Google Cloud Go" },
  // Validation
  { mod: "github.com/go-playground/validator/v10", name: "Validator" },
  // Config
  { mod: "github.com/joho/godotenv", name: "godotenv" },
  // Misc
  { mod: "github.com/google/uuid", name: "UUID" },
  { mod: "github.com/golang-jwt/jwt/v5", name: "JWT-Go" },
  // HTTP Router
  { mod: "github.com/go-chi/chi/v5", name: "Chi" },
  // DI
  { mod: "go.uber.org/fx", name: "Uber Fx" },
  // OpenTelemetry
  { mod: "go.opentelemetry.io/otel", name: "OpenTelemetry" },
  // Swagger
  { mod: "github.com/swaggo/swag", name: "Swag (Swagger)" },
  // WebSocket
  { mod: "github.com/gorilla/websocket", name: "Gorilla WebSocket" },
  // Zerolog
  { mod: "github.com/rs/zerolog", name: "Zerolog" },
  // Wire (DI)
  { mod: "github.com/google/wire", name: "Wire" },
  // Task queue
  { mod: "github.com/hibiken/asynq", name: "Asynq" },
];

async function fetchGoModuleVersions() {
  const results = await Promise.allSettled(
    GO_MODULES.map(async ({ mod, name }) => {
      const data = await fetchJson(`https://proxy.golang.org/${mod}/@latest`);
      return { name, id: mod, version: data.Version?.replace(/^v/, "") ?? "unknown" };
    }),
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { name: GO_MODULES[i].name, id: GO_MODULES[i].mod, version: "unknown" },
  );
}

// ─── Rust crates ────────────────────────────────────────────────────

const RUST_CRATES = [
  // Async Runtime
  "tokio", "async-std", "smol",
  // Web Frameworks
  "actix-web", "axum", "rocket", "warp", "poem",
  // HTTP
  "hyper", "reqwest", "ureq",
  // Serialization
  "serde", "serde_json", "toml", "csv",
  // Database
  "sqlx", "diesel", "sea-orm", "rusqlite",
  // Redis
  "redis", "deadpool-redis",
  // CLI
  "clap", "structopt",
  // Error Handling
  "anyhow", "thiserror", "color-eyre",
  // Logging & Tracing
  "tracing", "tracing-subscriber", "log", "env_logger",
  // Crypto & Security
  "rand", "ring", "rustls", "argon2",
  // Async Utils
  "futures", "rayon", "crossbeam",
  // gRPC
  "tonic", "prost",
  // Tower (middleware)
  "tower", "tower-http",
  // Config
  "config", "dotenvy",
  // Template
  "askama", "tera",
  // Testing
  "mockall", "wiremock",
  // UUID
  "uuid",
];

async function fetchRustCrateVersions() {
  const results = await Promise.allSettled(
    RUST_CRATES.map(async (crate) => {
      const data = await fetchJson(`https://crates.io/api/v1/crates/${crate}`, {
        "User-Agent": "versionlens-registry (https://github.com/CCicek22/versionlens-registry)",
      });
      return { name: crate, version: data.crate?.max_version ?? "unknown" };
    }),
  );

  return results.map((r, i) =>
    r.status === "fulfilled" ? r.value : { name: RUST_CRATES[i], version: "unknown" },
  );
}

async function fetchPipVersions() {
  const results = await Promise.allSettled(
    PIP_PACKAGES.map(async (pkg) => {
      const data = await fetchJson(`https://pypi.org/pypi/${pkg}/json`);
      return { name: pkg, version: data.info.version };
    }),
  );

  return results.map((r, i) =>
    r.status === "fulfilled" ? r.value : { name: PIP_PACKAGES[i], version: "unknown" },
  );
}

// ─── Runtimes ───────────────────────────────────────────────────────

async function fetchRuntimes() {
  const fetchers = {
    "Node.js": async () => {
      const releases = await fetchJson("https://nodejs.org/dist/index.json");
      const lts = releases.find((r) => r.lts !== false);
      const current = releases[0];
      return `${lts.version.replace(/^v/, "")} (LTS) / ${current.version.replace(/^v/, "")} (Current)`;
    },
    Python: async () => {
      const releases = await fetchJson("https://endoflife.date/api/python.json");
      const stable = releases.find(
        (r) => r.eol === false || (typeof r.eol === "string" && new Date(r.eol) > new Date()),
      );
      return stable?.latest ?? "unknown";
    },
    Bun: async () => {
      const data = await fetchJson("https://api.github.com/repos/oven-sh/bun/releases/latest", githubHeaders());
      return data.tag_name.replace(/^v|^bun-v/, "");
    },
    Deno: async () => {
      const data = await fetchJson("https://api.github.com/repos/denoland/deno/releases/latest", githubHeaders());
      return data.tag_name.replace(/^v/, "");
    },
    "Java (OpenJDK)": async () => {
      const data = await fetchJson("https://api.adoptium.net/v3/info/available_releases");
      return `${data.most_recent_lts} (LTS) / ${data.available_releases.at(-1)} (Latest)`;
    },
    Go: async () => {
      const releases = await fetchJson("https://go.dev/dl/?mode=json");
      const stable = releases.find((r) => r.stable);
      return stable ? stable.version.replace(/^go/, "") : "unknown";
    },
    Rust: async () => {
      const data = await fetchJson("https://api.github.com/repos/rust-lang/rust/releases/latest", githubHeaders());
      return data.tag_name;
    },
    Ruby: async () => {
      const releases = await fetchJson("https://endoflife.date/api/ruby.json");
      const stable = releases.find(
        (r) => r.eol === false || (typeof r.eol === "string" && new Date(r.eol) > new Date()),
      );
      return stable?.latest ?? "unknown";
    },
    PHP: async () => {
      const releases = await fetchJson("https://endoflife.date/api/php.json");
      const stable = releases.find(
        (r) => r.eol === false || (typeof r.eol === "string" && new Date(r.eol) > new Date()),
      );
      return stable?.latest ?? "unknown";
    },
    ".NET": async () => {
      const releases = await fetchJson("https://endoflife.date/api/dotnet.json");
      const stable = releases.find(
        (r) => r.eol === false || (typeof r.eol === "string" && new Date(r.eol) > new Date()),
      );
      return stable?.latest ?? "unknown";
    },
  };

  const results = [];
  for (const [name, fetcher] of Object.entries(fetchers)) {
    try {
      const version = await fetcher();
      results.push({ name, version });
    } catch {
      results.push({ name, version: "unknown" });
    }
  }
  return results;
}

// ─── Docker ─────────────────────────────────────────────────────────

const DOCKER_IMAGES = [
  // Runtimes
  { image: "node", eol: "nodejs" },
  { image: "python", eol: "python" },
  { image: "ruby", eol: "ruby" },
  { image: "php", eol: "php" },
  { image: "golang", eol: "go" },
  { image: "openjdk", eol: "java" },
  { image: "rust", eol: "rust" },
  // Databases
  { image: "postgres", eol: "postgresql" },
  { image: "mysql", eol: "mysql" },
  { image: "mariadb", eol: "mariadb" },
  { image: "mongo", eol: "mongodb" },
  { image: "redis", eol: "redis" },
  // Infrastructure
  { image: "nginx", eol: "nginx" },
  { image: "httpd", eol: "apache-http-server" },
  { image: "traefik", eol: "traefik" },
  { image: "haproxy", eol: "haproxy" },
  // Messaging & Cache
  { image: "rabbitmq", eol: "rabbitmq" },
  { image: "memcached", eol: "memcached" },
  // Search
  { image: "elasticsearch", eol: "elasticsearch" },
  // OS Base
  { image: "ubuntu", eol: "ubuntu" },
  { image: "debian", eol: "debian" },
  { image: "alpine", eol: "alpine" },
  // Monitoring / Observability
  { image: "grafana/grafana", eol: "grafana" },
  { image: "prom/prometheus", eol: "prometheus" },
  // Monitoring / Observability
  { image: "influxdb", eol: null },
  // Auth / Identity
  { image: "keycloak/keycloak", eol: null },
  // Storage
  { image: "minio/minio", eol: null },
  // CI/CD
  { image: "jenkins/jenkins", eol: null },
  { image: "gitea/gitea", eol: null },
  { image: "registry", eol: null },
  { image: "docker", eol: null },
  // Databases (additional)
  { image: "cassandra", eol: null },
  { image: "couchdb", eol: null },
  { image: "neo4j", eol: null },
  { image: "nats", eol: null },
  // CMS / Web Apps
  { image: "wordpress", eol: null },
  { image: "nextcloud", eol: null },
  { image: "ghost", eol: null },
  { image: "drupal", eol: null },
  // App Servers
  { image: "tomcat", eol: null },
  { image: "caddy", eol: null },
  // API Gateway
  { image: "kong", eol: null },
  // Base Images
  { image: "busybox", eol: null },
  { image: "amazonlinux", eol: null },
  // Other
  { image: "vault", eol: null },
  { image: "consul", eol: null },
  { image: "sonarqube", eol: null },
];

async function fetchDockerVersions() {
  const results = await Promise.allSettled(
    DOCKER_IMAGES.map(async ({ image, eol }) => {
      let latestVersion = "";

      // Use endoflife.date for version
      if (eol) {
        try {
          const releases = await fetchJson(`https://endoflife.date/api/${eol}.json`);
          const active = releases.find(
            (r) =>
              r.eol === false ||
              (typeof r.eol === "string" && new Date(r.eol) > new Date()),
          );
          if (active) latestVersion = active.latest;
        } catch {
          // Fall through
        }
      }

      // Verify on Docker Hub and find all tag variants
      if (latestVersion) {
        const repo = image.includes("/") ? image : `library/${image}`;
        try {
          const data = await fetchJson(
            `https://hub.docker.com/v2/repositories/${repo}/tags?page_size=50&name=${latestVersion}`,
          );
          const tags = data.results ?? [];

          // Find tag variants
          const slim = tags.find((t) => t.name === `${latestVersion}-slim`)?.name
            ?? tags.find((t) => t.name === `${latestVersion}-slim-bookworm`)?.name
            ?? "";
          const alpine = tags.find((t) => t.name === `${latestVersion}-alpine`)?.name
            ?? tags.find((t) => t.name.startsWith(`${latestVersion}-alpine3`))?.name
            ?? "";
          const debian = tags.find((t) => t.name === `${latestVersion}-trixie`)?.name
            ?? tags.find((t) => t.name === `${latestVersion}-bookworm`)?.name
            ?? tags.find((t) => t.name === `${latestVersion}-bullseye`)?.name
            ?? "";

          return {
            name: image,
            version: latestVersion,
            slim: slim || "-",
            alpine: alpine || "-",
            debian: debian || "-",
          };
        } catch {
          return { name: image, version: latestVersion, slim: "-", alpine: "-", debian: "-" };
        }
      }

      // Fallback
      return { name: image, version: "latest", slim: "-", alpine: "-", debian: "-" };
    }),
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { name: DOCKER_IMAGES[i].image, version: "unknown", slim: "-", alpine: "-", debian: "-" },
  );
}

// ─── GitHub CLI tools ───────────────────────────────────────────────

const GITHUB_TOOLS = [
  // Package Managers
  { repo: "pnpm/pnpm", name: "pnpm" },
  { repo: "yarnpkg/berry", name: "Yarn" },
  { repo: "astral-sh/uv", name: "uv (Python)" },
  { repo: "python-poetry/poetry", name: "Poetry" },
  // Cargo ships with Rust — tracked via runtimes
  // CLI Tools
  { repo: "cli/cli", name: "GitHub CLI (gh)" },
  { repo: "vercel/vercel", name: "Vercel CLI" },
  { repo: "supabase/cli", name: "Supabase CLI" },
  { repo: "firebase/firebase-tools", name: "Firebase CLI" },
  // Expo CLI tracked via npm
  { repo: "netlify/cli", name: "Netlify CLI" },
  // DevOps / Infra
  { repo: "hashicorp/terraform", name: "Terraform" },
  { repo: "kubernetes/kubernetes", name: "Kubernetes" },
  { repo: "helm/helm", name: "Helm" },
  { repo: "docker/compose", name: "Docker Compose" },
  { repo: "pulumi/pulumi", name: "Pulumi" },
  { repo: "argoproj/argo-cd", name: "Argo CD" },
  // Build & Dev
  { repo: "tailwindlabs/tailwindcss", name: "Tailwind CSS" },
  { repo: "biomejs/biome", name: "Biome" },
  { repo: "astral-sh/ruff", name: "Ruff" },
  { repo: "gradle/gradle", name: "Gradle" },
  // Editors
  { repo: "neovim/neovim", name: "Neovim" },
  // Monitoring
  { repo: "grafana/grafana", name: "Grafana" },
  { repo: "prometheus/prometheus", name: "Prometheus" },
];

async function fetchGithubReleases() {
  const results = await Promise.allSettled(
    GITHUB_TOOLS.map(async ({ repo, name }) => {
      const data = await fetchJson(
        `https://api.github.com/repos/${repo}/releases/latest`,
        githubHeaders(),
      );
      return { name, repo, version: data.tag_name.replace(/^v/, "") };
    }),
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { name: GITHUB_TOOLS[i].name, repo: GITHUB_TOOLS[i].repo, version: "unknown" },
  );
}

// ─── AI Models ──────────────────────────────────────────────────────

/**
 * Hybrid approach:
 * - Closed API models (Claude, GPT, Gemini, Grok): curated, updated by PRs
 * - Open-weight models (Llama, DeepSeek, Qwen, etc): auto-fetched from HuggingFace
 *
 * HuggingFace API is fully public, no auth needed.
 */

// Closed API models — verified from live APIs on 2026-03-27
const CLOSED_API_MODELS = {
  anthropic: {
    provider: "Anthropic (Closed API)",
    models: [
      { id: "claude-opus-4-6", name: "Claude Opus 4.6", context: "1M" },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", context: "200K" },
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", context: "200K" },
    ],
  },
  openai: {
    provider: "OpenAI (Closed API)",
    models: [
      { id: "gpt-5.4", name: "GPT-5.4", context: "128K" },
      { id: "gpt-5.4-pro", name: "GPT-5.4 Pro", context: "128K" },
      { id: "gpt-5.4-mini", name: "GPT-5.4 Mini", context: "128K" },
      { id: "gpt-5.4-nano", name: "GPT-5.4 Nano", context: "128K" },
      { id: "o3", name: "o3", context: "200K" },
      { id: "o4-mini", name: "o4-mini", context: "200K" },
    ],
  },
  google_gemini: {
    provider: "Google Gemini (Closed API)",
    models: [
      // Verified from Gemini API 2026-03-27
      { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview", context: "1M" },
      { id: "gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash Lite Preview", context: "1M" },
      { id: "gemini-3.1-flash-live-preview", name: "Gemini 3.1 Flash Live Preview", context: "128K" },
      { id: "gemini-3.1-flash-image-preview", name: "Gemini 3.1 Flash Image Preview", context: "64K" },
      { id: "gemini-3-pro-preview", name: "Gemini 3 Pro Preview", context: "1M" },
      { id: "gemini-3-flash-preview", name: "Gemini 3 Flash Preview", context: "1M" },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", context: "1M" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", context: "1M" },
      { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", context: "1M" },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", context: "1M" },
      { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite", context: "1M" },
    ],
  },
  xai: {
    provider: "xAI (Closed API)",
    models: [
      // Verified from xAI API 2026-03-27
      { id: "grok-4.20-0309-reasoning", name: "Grok 4.20 Reasoning", context: "?" },
      { id: "grok-4.20-0309-non-reasoning", name: "Grok 4.20 Non-Reasoning", context: "?" },
      { id: "grok-4.20-multi-agent-0309", name: "Grok 4.20 Multi-Agent", context: "?" },
      { id: "grok-4-fast-reasoning", name: "Grok 4 Fast Reasoning", context: "?" },
      { id: "grok-4-fast-non-reasoning", name: "Grok 4 Fast Non-Reasoning", context: "?" },
      { id: "grok-4-1-fast-reasoning", name: "Grok 4.1 Fast Reasoning", context: "?" },
      { id: "grok-4-1-fast-non-reasoning", name: "Grok 4.1 Fast Non-Reasoning", context: "?" },
      { id: "grok-4-0709", name: "Grok 4 (0709)", context: "?" },
      { id: "grok-code-fast-1", name: "Grok Code Fast", context: "?" },
      { id: "grok-3", name: "Grok 3", context: "?" },
      { id: "grok-3-mini", name: "Grok 3 Mini", context: "?" },
      { id: "grok-imagine-image", name: "Grok Imagine Image", context: "?" },
      { id: "grok-imagine-image-pro", name: "Grok Imagine Image Pro", context: "?" },
      { id: "grok-imagine-video", name: "Grok Imagine Video", context: "?" },
    ],
  },
};

// Open-weight models — auto-fetched from HuggingFace
const HF_OPEN_MODELS = [
  { author: "meta-llama", provider: "Meta (Llama)", prefix: "Llama", limit: 8 },
  { author: "deepseek-ai", provider: "DeepSeek", prefix: "DeepSeek", limit: 6 },
  { author: "Qwen", provider: "Qwen (Alibaba)", prefix: "Qwen", limit: 8 },
  { author: "mistralai", provider: "Mistral", prefix: "Mistral", limit: 6 },
  { author: "google", provider: "Google Gemma (Open)", prefix: "Gemma", limit: 6 },
  { author: "microsoft", provider: "Microsoft (Phi)", prefix: "Phi", limit: 6 },
  { author: "nvidia", provider: "NVIDIA", prefix: "Llama", limit: 4 },
  { author: "openai", provider: "OpenAI (Open-weight)", prefix: "GPT-OSS", limit: 4 },
];

function formatParams(params) {
  if (!params) return "?";
  if (params >= 1e12) return `${(params / 1e12).toFixed(1)}T`;
  if (params >= 1e9) return `${(params / 1e9).toFixed(1)}B`;
  if (params >= 1e6) return `${(params / 1e6).toFixed(0)}M`;
  return `${params}`;
}

async function fetchHuggingFaceModels() {
  const results = {};

  const fetches = await Promise.allSettled(
    HF_OPEN_MODELS.map(async ({ author, provider, prefix, limit }) => {
      const data = await fetchJson(
        `https://huggingface.co/api/models?author=${author}&sort=downloads&direction=-1&limit=${limit}&filter=text-generation`,
      );

      const models = data.map((m) => {
        const params = m.safetensors?.total || 0;
        const name = m.id.split("/")[1] || m.id;
        return {
          id: m.id,
          name,
          context: formatParams(params) + " params",
          downloads: m.downloads || 0,
        };
      });

      return { key: author.toLowerCase().replace("-", "_"), provider, models };
    }),
  );

  for (const result of fetches) {
    if (result.status === "fulfilled" && result.value.models.length > 0) {
      results[result.value.key] = {
        provider: result.value.provider,
        models: result.value.models,
      };
    }
  }

  return results;
}

async function getAiModels() {
  // Fetch open-weight models from HuggingFace
  let openModels = {};
  try {
    openModels = await fetchHuggingFaceModels();
  } catch {
    console.warn("  Warning: HuggingFace API unreachable, using curated fallback");
  }

  return {
    ...CLOSED_API_MODELS,
    ...openModels,
  };
}

function renderAiModelsMd(models) {
  let md = renderHeader(
    "AI Model IDs",
    "Closed API model IDs (curated) + open-weight models (auto-fetched from HuggingFace).\nNo API keys needed.",
  );

  // Separate closed and open
  const closed = Object.entries(models).filter(([, v]) => v.provider.includes("Closed API"));
  const open = Object.entries(models).filter(([, v]) => !v.provider.includes("Closed API"));

  if (closed.length) {
    md += "## Closed API Models\n\n";
    md += "> These model IDs are for API calls. Curated from official docs.\n\n";
    for (const [, info] of closed) {
      md += `### ${info.provider}\n\n`;
      md += "| Model | ID | Context |\n";
      md += "|-------|----|--------|\n";
      for (const m of info.models) {
        md += `| ${m.name} | \`${m.id}\` | ${m.context} |\n`;
      }
      md += "\n";
    }
  }

  if (open.length) {
    md += "## Open-Weight Models (from HuggingFace)\n\n";
    md += "> Auto-fetched from HuggingFace API. Sorted by downloads.\n\n";
    for (const [, info] of open) {
      md += `### ${info.provider}\n\n`;
      md += "| Model | HuggingFace ID | Size | Downloads |\n";
      md += "|-------|----------------|------|-----------|\n";
      for (const m of info.models) {
        const downloads = m.downloads ? `${(m.downloads / 1e6).toFixed(1)}M` : "-";
        md += `| ${m.name} | \`${m.id}\` | ${m.context} | ${downloads} |\n`;
      }
      md += "\n";
    }
  }

  md += `---\n*Last updated: ${ts().split("T")[0]} | Open models auto-fetched from HuggingFace*\n`;
  return md;
}

// ─── Renderers ──────────────────────────────────────────────────────

function renderHeader(title, description) {
  return `# ${title}

> Auto-updated by [versionlens-registry](https://github.com/CCicek22/versionlens-registry)
> Last updated: ${ts()}
>
> **AI agents: use these versions instead of guessing. Do NOT hallucinate version numbers.**

${description}

`;
}

function renderNpm(packages) {
  let md = renderHeader(
    "npm Package Versions",
    "Latest stable versions of popular npm packages.",
  );

  // Group by category
  const categories = {
    "Frameworks": ["react", "react-dom", "next", "vue", "nuxt", "svelte", "@sveltejs/kit", "angular", "@angular/core", "solid-js", "astro", "remix", "gatsby"],
    "React Native / Mobile": ["react-native", "expo", "@expo/cli", "@react-navigation/native"],
    "Routing": ["react-router-dom", "@tanstack/router"],
    "State & Data Fetching": ["@tanstack/react-query", "@tanstack/react-table", "zustand", "jotai", "redux", "@reduxjs/toolkit", "mobx", "recoil", "swr"],
    "UI Libraries": ["@mui/material", "@chakra-ui/react", "@mantine/core", "@radix-ui/react-dialog", "@headlessui/react", "antd"],
    "Styling": ["tailwindcss", "styled-components", "@emotion/react", "sass"],
    "Animation": ["framer-motion", "gsap", "@react-spring/web"],
    "Forms & Validation": ["zod", "yup", "joi", "react-hook-form", "@hookform/resolvers", "valibot"],
    "API & Server": ["express", "fastify", "hono", "koa", "nest", "@nestjs/core", "trpc", "@trpc/server", "@trpc/client", "axios", "ky", "got"],
    "GraphQL": ["@apollo/client", "@apollo/server", "graphql", "urql"],
    "WebSocket / Realtime": ["socket.io", "ws"],
    "Database & ORM": ["drizzle-orm", "prisma", "@prisma/client", "typeorm", "knex", "mongoose", "sequelize", "ioredis", "pg"],
    "Auth": ["next-auth", "passport", "jsonwebtoken", "bcrypt"],
    "Payments": ["stripe", "@stripe/stripe-js", "@stripe/react-stripe-js"],
    "Firebase / Supabase": ["firebase", "firebase-admin", "firebase-tools", "@supabase/supabase-js"],
    "Cloud SDKs": ["@aws-sdk/client-s3", "@google-cloud/storage", "@azure/storage-blob"],
    "AI SDKs": ["openai", "@anthropic-ai/sdk", "@google/generative-ai", "ai", "langchain", "@langchain/core"],
    "Testing": ["vitest", "jest", "@testing-library/react", "@testing-library/jest-dom", "playwright", "@playwright/test", "cypress", "supertest", "puppeteer", "selenium-webdriver", "@storybook/react"],
    "Build & Dev Tools": ["typescript", "vite", "webpack", "esbuild", "tsup", "turbo", "rollup", "eslint", "prettier", "biome", "oxlint"],
    "Bundlers & Config": ["@swc/core", "babel-loader", "postcss", "autoprefixer"],
    "Email": ["nodemailer", "resend", "@sendgrid/mail"],
    "File & Image": ["multer", "sharp", "jimp"],
    "Queue & Jobs": ["bullmq", "bee-queue"],
    "i18n": ["i18next", "react-i18next"],
    "Markdown / Content": ["marked", "remark", "mdx"],
    "Utilities": ["lodash", "date-fns", "dayjs", "luxon", "moment", "uuid", "nanoid", "semver", "glob", "minimatch", "dotenv", "commander", "inquirer", "chalk", "ora", "zx", "execa"],
    "Monorepo": ["lerna", "nx", "@changesets/cli"],
    "Runtime & Package Managers": ["bun", "tsx", "ts-node", "pnpm", "yarn"],
  };

  const pkgMap = Object.fromEntries(packages.map((p) => [p.name, p.version]));

  for (const [category, pkgNames] of Object.entries(categories)) {
    const items = pkgNames.filter((n) => pkgMap[n]);
    if (items.length === 0) continue;

    md += `### ${category}\n\n`;
    md += "| Package | Latest |\n";
    md += "|---------|--------|\n";
    for (const name of items) {
      md += `| ${name} | ${pkgMap[name]} |\n`;
    }
    md += "\n";
  }

  return md;
}

function renderPip(packages) {
  let md = renderHeader(
    "pip Package Versions",
    "Latest stable versions of popular Python packages.",
  );

  const categories = {
    "Web Frameworks": ["fastapi", "uvicorn", "flask", "django", "starlette", "gunicorn", "sanic", "litestar"],
    "HTTP Clients": ["httpx", "requests", "aiohttp", "urllib3"],
    "Data & Validation": ["pydantic", "sqlalchemy", "alembic", "tortoise-orm", "marshmallow"],
    "Data Science": ["pandas", "numpy", "polars", "scipy"],
    "Data Visualization": ["matplotlib", "seaborn", "plotly"],
    "Jupyter": ["jupyter", "notebook", "ipykernel"],
    "AI & ML": ["openai", "anthropic", "google-generativeai", "langchain", "langchain-core", "transformers", "torch", "tensorflow", "scikit-learn", "huggingface-hub", "diffusers", "accelerate"],
    "AI Frameworks": ["crewai", "autogen", "llama-index"],
    "Cloud": ["boto3", "google-cloud-storage", "firebase-admin", "azure-storage-blob"],
    "Testing & Quality": ["pytest", "pytest-asyncio", "pytest-cov", "coverage", "mypy", "ruff", "pyright", "selenium", "playwright", "locust"],
    "CLI & Utils": ["click", "typer", "rich", "pyyaml", "python-dotenv", "argparse", "tqdm"],
    "Auth & Crypto": ["pyjwt", "passlib", "cryptography", "bcrypt"],
    "Payments": ["stripe"],
    "Database Drivers": ["psycopg2-binary", "asyncpg", "redis", "pymongo", "pymysql", "motor"],
    "Vector Databases": ["qdrant-client", "pinecone-client", "chromadb", "weaviate-client"],
    "Task Queues": ["celery", "dramatiq", "rq"],
    "Image / Media": ["pillow", "opencv-python", "moviepy"],
    "Scraping": ["beautifulsoup4", "scrapy", "lxml"],
    "NLP": ["spacy", "nltk"],
    "GraphQL": ["graphene", "strawberry-graphql"],
    "Config / Env": ["dynaconf", "pydantic-settings"],
    "Build Tools": ["poetry-core", "setuptools", "wheel", "hatchling"],
    "Async": ["anyio", "uvloop"],
  };

  const pkgMap = Object.fromEntries(packages.map((p) => [p.name, p.version]));

  for (const [category, pkgNames] of Object.entries(categories)) {
    const items = pkgNames.filter((n) => pkgMap[n]);
    if (items.length === 0) continue;

    md += `### ${category}\n\n`;
    md += "| Package | Latest |\n";
    md += "|---------|--------|\n";
    for (const name of items) {
      md += `| ${name} | ${pkgMap[name]} |\n`;
    }
    md += "\n";
  }

  return md;
}

function renderDocker(images) {
  let md = renderHeader(
    "Docker Image Versions",
    "Latest stable tags for popular Docker images. Use these instead of `latest`.\nShows 3 variants: slim (smallest), alpine (minimal), debian (full).",
  );

  md += "| Image | Version | Slim | Alpine | Debian |\n";
  md += "|-------|---------|------|--------|--------|\n";
  for (const img of images) {
    md += `| ${img.name} | ${img.version} | ${img.slim} | ${img.alpine} | ${img.debian} |\n`;
  }
  md += "\n";

  return md;
}

function renderRuntimes(runtimes) {
  let md = renderHeader(
    "Runtime & Language Versions",
    "Latest stable versions of programming language runtimes.",
  );

  md += "| Runtime | Latest Stable |\n";
  md += "|---------|---------------|\n";
  for (const rt of runtimes) {
    md += `| ${rt.name} | ${rt.version} |\n`;
  }
  md += "\n";

  return md;
}

function renderTools(tools) {
  let md = renderHeader(
    "CLI Tools & GitHub Releases",
    "Latest versions of popular developer tools.",
  );

  md += "| Tool | Latest | Repository |\n";
  md += "|------|--------|------------|\n";
  for (const tool of tools) {
    md += `| ${tool.name} | ${tool.version} | ${tool.repo} |\n`;
  }
  md += "\n";

  return md;
}

// ─── New Renderers ──────────────────────────────────────────────────

function renderMaven(packages) {
  let md = renderHeader(
    "Java / Kotlin (Maven) Package Versions",
    "Latest stable versions from Maven Central.",
  );

  const categories = {
    "Spring Boot": ["Spring Boot", "Spring Boot Web", "Spring Data JPA", "Spring Security", "Spring Boot Test"],
    "Spring Framework": ["Spring Core", "Spring WebFlux"],
    "Kotlin": ["Kotlin", "Kotlin Coroutines"],
    "Build": ["Maven"],
    "Database & ORM": ["Hibernate ORM", "MyBatis", "Flyway", "Liquibase"],
    "JSON": ["Jackson", "Gson"],
    "HTTP": ["OkHttp", "Retrofit"],
    "Logging": ["SLF4J", "Logback", "Log4j"],
    "Testing": ["JUnit 5", "Mockito", "AssertJ"],
    "Utilities": ["Lombok", "MapStruct", "Guava", "Commons Lang3"],
    "Messaging": ["Kafka Clients"],
    "gRPC": ["gRPC"],
    "Reactive": ["Project Reactor"],
    "Alternative Frameworks": ["Quarkus", "Micronaut"],
    "HTTP Client": ["Apache HttpClient 5"],
    "Security": ["JJWT"],
    "Testing (Java)": ["Testcontainers"],
    // Gradle tracked via GitHub releases
    "Monitoring": ["Micrometer"],
    "OpenAPI / Docs": ["SpringDoc OpenAPI"],
    "Validation": ["Hibernate Validator"],
  };

  const pkgMap = Object.fromEntries(packages.map((p) => [p.name, p]));

  for (const [cat, names] of Object.entries(categories)) {
    const items = names.filter((n) => pkgMap[n]);
    if (items.length === 0) continue;
    md += `### ${cat}\n\n`;
    md += "| Package | Maven ID | Latest |\n";
    md += "|---------|----------|--------|\n";
    for (const name of items) {
      const p = pkgMap[name];
      md += `| ${p.name} | \`${p.id}\` | ${p.version} |\n`;
    }
    md += "\n";
  }

  return md;
}

function renderGo(modules) {
  let md = renderHeader(
    "Go Module Versions",
    "Latest stable versions from proxy.golang.org.",
  );

  md += "| Module | Import Path | Latest |\n";
  md += "|--------|-------------|--------|\n";
  for (const m of modules) {
    md += `| ${m.name} | \`${m.id}\` | ${m.version} |\n`;
  }
  md += "\n";

  return md;
}

function renderRust(crates) {
  let md = renderHeader(
    "Rust Crate Versions",
    "Latest stable versions from crates.io.",
  );

  md += "| Crate | Latest |\n";
  md += "|-------|--------|\n";
  for (const c of crates) {
    md += `| ${c.name} | ${c.version} |\n`;
  }
  md += "\n";

  return md;
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("versionlens-registry: starting update...");
  const start = Date.now();

  // Fetch everything in parallel
  const [npm, pip, maven, goMods, rust, runtimes, docker, github] = await Promise.all([
    fetchNpmVersions().then((r) => { console.log(`  npm: ${r.length} packages`); return r; }),
    fetchPipVersions().then((r) => { console.log(`  pip: ${r.length} packages`); return r; }),
    fetchMavenVersions().then((r) => { console.log(`  maven: ${r.length} packages`); return r; }),
    fetchGoModuleVersions().then((r) => { console.log(`  go: ${r.length} modules`); return r; }),
    fetchRustCrateVersions().then((r) => { console.log(`  rust: ${r.length} crates`); return r; }),
    fetchRuntimes().then((r) => { console.log(`  runtimes: ${r.length}`); return r; }),
    fetchDockerVersions().then((r) => { console.log(`  docker: ${r.length} images`); return r; }),
    fetchGithubReleases().then((r) => { console.log(`  github: ${r.length} tools`); return r; }),
  ]);

  // AI models (closed curated + open from HuggingFace)
  const aiModels = await getAiModels();
  console.log(`  ai-models: ${Object.keys(aiModels).length} providers`);

  // Write files
  await Promise.all([
    writeFile(join(ROOT, "npm.md"), renderNpm(npm)),
    writeFile(join(ROOT, "pip.md"), renderPip(pip)),
    writeFile(join(ROOT, "maven.md"), renderMaven(maven)),
    writeFile(join(ROOT, "go.md"), renderGo(goMods)),
    writeFile(join(ROOT, "rust.md"), renderRust(rust)),
    writeFile(join(ROOT, "runtimes.md"), renderRuntimes(runtimes)),
    writeFile(join(ROOT, "docker.md"), renderDocker(docker)),
    writeFile(join(ROOT, "tools.md"), renderTools(github)),
    writeFile(join(ROOT, "ai-models.md"), renderAiModelsMd(aiModels)),
  ]);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const total = npm.length + pip.length + maven.length + goMods.length + rust.length + runtimes.length + docker.length + github.length;
  console.log(`\nDone! ${total} items updated in ${elapsed}s`);

  // Report unknowns
  const unknowns = [
    ...npm.filter((p) => p.version === "unknown"),
    ...pip.filter((p) => p.version === "unknown"),
    ...maven.filter((p) => p.version === "unknown"),
    ...goMods.filter((p) => p.version === "unknown"),
    ...rust.filter((p) => p.version === "unknown"),
    ...runtimes.filter((p) => p.version === "unknown"),
    ...docker.filter((p) => p.tag === "unknown"),
    ...github.filter((p) => p.version === "unknown"),
  ];
  if (unknowns.length > 0) {
    console.warn(`Warning: ${unknowns.length} items could not be fetched:`);
    for (const u of unknowns) console.warn(`  - ${u.name}`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
