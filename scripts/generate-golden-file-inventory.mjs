#!/usr/bin/env node

import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("..", import.meta.url));
export const inventoryPath = join(root, "docs/golden-file-source-inventory.md");

const knownSourceRoots = new Set([
  "apps/server/src",
  "apps/web/src",
  "packages/agent/src",
  "packages/api/src",
  "packages/auth/src",
  "packages/config/src",
  "packages/db/src",
  "packages/env/src",
  "packages/workspace/src",
]);
const sourceExtensions = new Set([".cjs", ".css", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const scriptExtensions = new Set([".cjs", ".js", ".mjs", ".sh", ".ts", ".tsx"]);
const migrationExtensions = new Set([".json", ".sql"]);
const ignoredDirectories = new Set([
  ".agents",
  ".git",
  ".nuxt",
  ".output",
  ".turbo",
  "dist",
  "node_modules",
]);
const rootConfigurationFiles = new Set([
  ".dockerignore",
  ".env.example",
  ".oxfmtrc.json",
  ".oxlintrc.json",
  ".railwayignore",
  "bun.lock",
  "bunfig.toml",
  "knip.json",
  "nixpacks.toml",
  "package.json",
  "tsconfig.json",
  "turbo.json",
]);
const exactRuntimeArtifacts = new Set(["apps/web/index.html", "apps/web/public/sw.js"]);

export const classifications = new Set([
  "golden-feature",
  "server-operation",
  "shared-infrastructure",
  "static-presentation",
]);

const agencyDomains = new Set([
  "billing",
  "clients",
  "dashboard",
  "integrations",
  "member-profile",
  "projects",
  "reports",
  "resourcing",
  "settings",
  "task-management",
  "time-tracking",
]);
const productDomains = new Set([
  ...agencyDomains,
  "agency-shared",
  "agent",
  "auth",
  "marketplace",
  "marketing",
  "notifications",
  "team",
  "workspace",
]);
const infrastructureDomains = new Set([
  "api-platform",
  "architecture",
  "ci",
  "configuration",
  "database-platform",
  "deployment",
  "environment",
  "performance",
  "repository",
  "server-platform",
  "web-platform",
]);
const sharedProductDomains = new Set(["agency-shared", "auth"]);

const ownersByDomain = new Map([
  ["agency-shared", "agency-platform"],
  ["agent", "agent-domain"],
  ["api-platform", "api-platform"],
  ["architecture", "architecture"],
  ["auth", "identity-domain"],
  ["billing", "billing-domain"],
  ["ci", "developer-experience"],
  ["clients", "clients-domain"],
  ["configuration", "platform-configuration"],
  ["dashboard", "agency-dashboard-domain"],
  ["database-platform", "data-platform"],
  ["deployment", "platform-operations"],
  ["environment", "platform-configuration"],
  ["integrations", "integrations-domain"],
  ["marketplace", "marketplace-domain"],
  ["marketing", "web-experience"],
  ["member-profile", "member-profile-domain"],
  ["notifications", "notifications-domain"],
  ["performance", "web-performance"],
  ["projects", "projects-domain"],
  ["reports", "reports-domain"],
  ["repository", "developer-experience"],
  ["resourcing", "resourcing-domain"],
  ["server-platform", "server-platform"],
  ["settings", "agency-settings-domain"],
  ["task-management", "task-management-domain"],
  ["team", "team-domain"],
  ["time-tracking", "time-tracking-domain"],
  ["web-platform", "web-platform"],
  ["workspace", "workspace-domain"],
]);

const featureDomainAliases = new Map([
  ["agent", "agent"],
  ["app-shell", "web-platform"],
  ["auth", "auth"],
  ["billing", "billing"],
  ["clients", "clients"],
  ["dashboard", "dashboard"],
  ["dashboard-agent", "agent"],
  ["departments", "resourcing"],
  ["dev", "web-platform"],
  ["workspace-agent", "agent"],
  ["favorites", "time-tracking"],
  ["first-run", "team"],
  ["integrations", "integrations"],
  ["marketplace", "marketplace"],
  ["management", "settings"],
  ["member-profile", "member-profile"],
  ["money", "billing"],
  ["notifications", "notifications"],
  ["onboarding", "team"],
  ["people", "resourcing"],
  ["projects", "projects"],
  ["project-templates", "projects"],
  ["reports", "reports"],
  ["resourcing", "resourcing"],
  ["settings", "settings"],
  ["shared", "agency-shared"],
  ["task-management", "task-management"],
  ["task-messages", "task-management"],
  ["tasks", "task-management"],
  ["tags", "time-tracking"],
  ["team", "team"],
  ["team-billing", "team"],
  ["team-billing-credits", "team"],
  ["time-tracking", "time-tracking"],
  ["user-settings", "web-platform"],
  ["workspace", "workspace"],
  ["workspace-knowledge", "workspace"],
]);

const goldenLayers = new Set([
  "api-contract",
  "api-router",
  "api-service",
  "client-state",
  "container",
  "domain-contract",
  "domain-logic",
  "domain-service",
  "feature-entry",
  "feature-hook",
  "persistence-migration",
  "persistence-schema",
  "presentational-view",
  "server-runtime",
  "test",
  "web-query",
]);
const infrastructureLayers = new Set([
  ...goldenLayers,
  "architecture-tooling",
  "build-config",
  "build-tooling",
  "ci-config",
  "db-config",
  "dependency-config",
  "persistence-metadata",
  "quality-config",
  "shared-ui",
  "test-config",
  "test-tooling",
  "runtime-config",
]);

function normalizePath(path) {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function collectTree(directory) {
  if (!(await exists(directory))) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectTree(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

async function workspaceDirectories() {
  const directories = [];
  for (const parent of ["apps", "packages"]) {
    const entries = await readdir(join(root, parent), { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
        directories.push(`${parent}/${entry.name}`);
      }
    }
  }
  return directories.sort();
}

function isWorkspaceConfiguration(path) {
  const name = basename(path);
  return (
    name === ".env.example" ||
    name === "components.json" ||
    name === "docker-compose.yml" ||
    name === "docker-compose.yaml" ||
    name === "package.json" ||
    /^tsconfig(?:\.[^.]+)*\.json$/.test(name) ||
    /[.]config[.](?:cjs|js|json|mjs|ts)$/.test(name)
  );
}

async function discoverScriptDirectories(workspaces) {
  const directories = ["scripts"];
  for (const workspace of workspaces) {
    const candidate = `${workspace}/scripts`;
    if (await exists(join(root, candidate))) directories.push(candidate);
  }
  return directories;
}

/**
 * Collect the full architectural inventory scope. Unknown source roots or source/script/migration
 * extensions deliberately fail generation instead of disappearing from the artifact.
 */
export async function collectInventoryPaths() {
  const paths = new Set();
  const scopeErrors = [];
  const workspaces = await workspaceDirectories();
  const discoveredSourceRoots = [];

  for (const workspace of workspaces) {
    const candidate = `${workspace}/src`;
    if (await exists(join(root, candidate))) discoveredSourceRoots.push(candidate);
  }
  for (const sourceRoot of discoveredSourceRoots) {
    if (!knownSourceRoots.has(sourceRoot)) {
      scopeErrors.push(`Unknown source root requires an ownership rule: ${sourceRoot}`);
      continue;
    }
    for (const file of await collectTree(join(root, sourceRoot))) {
      const path = normalizePath(relative(root, file));
      if (path.startsWith("packages/db/src/migrations/")) continue;
      if (!sourceExtensions.has(extname(path))) {
        scopeErrors.push(`Unsupported source extension requires a scope decision: ${path}`);
        continue;
      }
      paths.add(path);
    }
  }
  for (const expectedRoot of knownSourceRoots) {
    if (!discoveredSourceRoots.includes(expectedRoot)) {
      scopeErrors.push(`Expected source root is missing: ${expectedRoot}`);
    }
  }

  for (const file of await collectTree(join(root, "packages/db/src/migrations"))) {
    const path = normalizePath(relative(root, file));
    if (!migrationExtensions.has(extname(path))) {
      scopeErrors.push(`Unsupported migration extension requires a scope decision: ${path}`);
      continue;
    }
    paths.add(path);
  }

  for (const scriptDirectory of await discoverScriptDirectories(workspaces)) {
    for (const file of await collectTree(join(root, scriptDirectory))) {
      const path = normalizePath(relative(root, file));
      if (!scriptExtensions.has(extname(path))) {
        scopeErrors.push(`Unsupported script extension requires a scope decision: ${path}`);
        continue;
      }
      paths.add(path);
    }
  }

  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (
      entry.isFile() &&
      (rootConfigurationFiles.has(entry.name) || isWorkspaceConfiguration(entry.name))
    ) {
      paths.add(entry.name);
    }
  }
  for (const workspace of workspaces) {
    for (const file of await collectTree(join(root, workspace))) {
      const path = normalizePath(relative(root, file));
      if (relative(join(root, workspace), file).includes("/")) continue;
      if (isWorkspaceConfiguration(path)) paths.add(path);
    }
  }
  for (const file of await collectTree(join(root, ".github/workflows"))) {
    const path = normalizePath(relative(root, file));
    if (!/[.]ya?ml$/.test(path)) {
      scopeErrors.push(`Unsupported CI workflow extension requires a scope decision: ${path}`);
      continue;
    }
    paths.add(path);
  }
  for (const file of await collectTree(join(root, ".railway"))) {
    const path = normalizePath(relative(root, file));
    if (!/[.](?:ts|md)$/.test(path)) {
      scopeErrors.push(`Unsupported Railway IaC artifact requires a scope decision: ${path}`);
      continue;
    }
    paths.add(path);
  }
  for (const file of await collectTree(join(root, "apps/web/perf"))) {
    const path = normalizePath(relative(root, file));
    if (![".json", ".mjs"].includes(extname(path))) {
      scopeErrors.push(`Unsupported performance artifact requires a scope decision: ${path}`);
      continue;
    }
    paths.add(path);
  }
  for (const artifact of exactRuntimeArtifacts) {
    if (await exists(join(root, artifact))) paths.add(artifact);
  }

  if (scopeErrors.length) throw new Error(scopeErrors.join("\n"));
  return [...paths].sort();
}

function inferMigrationDomain(contents) {
  const matches = new Set();
  const tableNames = [
    ...contents.matchAll(
      /(?:CREATE TABLE(?: IF NOT EXISTS)?|ALTER TABLE|DROP TABLE(?: IF EXISTS)?)\s+"([^"]+)"/gi,
    ),
    ...contents.matchAll(
      /CREATE(?: UNIQUE)? INDEX(?: IF NOT EXISTS)?\s+"[^"]+"\s+ON\s+"([^"]+)"/gi,
    ),
  ].map((match) => match[1]);
  const touches = (pattern) => tableNames.some((tableName) => pattern.test(tableName));
  const rules = [
    ["notifications", /^(?:notification|notification_preference|push_subscription)$/i],
    ["time-tracking", /^agency_ops_(?:time_entry|active_timer)$/i],
    ["billing", /^agency_ops_(?:invoice|invoice_line_item|member_rate|client_rate.*)$/i],
    ["clients", /^agency_ops_client(?:$|_contact$)/i],
    ["reports", /^agency_ops_saved_report$/i],
    ["resourcing", /^agency_ops_(?:department|member_capacity|tenure.*)$/i],
    [
      "task-management",
      /^agency_ops_(?:project_task.*|task_thread.*|task_blueprint.*|task_message.*|task_attachment.*)$/i,
    ],
    ["projects", /^agency_ops_(?:project|project_journey.*|journey.*)$/i],
    ["workspace", /^(?:workspace_marketplace.*|dashboard_workspace)$/i],
    ["agent", /^dashboard_conversation.*$/i],
    ["auth", /^(?:account|session|user|verification)$/i],
    ["team", /^workspace_team(?:_member)?$/i],
  ];
  for (const [domain, pattern] of rules) {
    if (touches(pattern)) matches.add(domain);
  }
  if (matches.size === 1) return [...matches][0];
  if (matches.size > 1 && [...matches].every((domain) => agencyDomains.has(domain))) {
    return "agency-shared";
  }
  return "database-platform";
}

function inferOperationDomain(path) {
  if (/clockify/i.test(path)) return "time-tracking";
  if (/grant-lifetime-pro/i.test(path)) return "billing";
  if (/clear-team-data/i.test(path)) return "team";
  if (/workspace-knowledge/i.test(path)) return "workspace";
  if (/agency/i.test(path)) return "agency-shared";
  return "server-platform";
}

function inferWebDomain(path, contents) {
  const featureMatch = path.match(/^apps\/web\/src\/features\/([^/]+)/);
  if (featureMatch) {
    const domain = featureDomainAliases.get(featureMatch[1]);
    if (!domain)
      throw new Error(`Unknown web feature domain requires an owner: ${featureMatch[1]}`);
    return domain;
  }
  if (path === "apps/web/public/sw.js" || /(?:notification|push)/i.test(path)) {
    return "notifications";
  }
  if (/landing-pricing/.test(path) && /useBilling|billing-queries/.test(contents)) {
    return "billing";
  }
  if (
    /components\/marketing|marketing-page-shell|landing-page|privacy-page|terms-page/.test(path)
  ) {
    return "marketing";
  }
  if (/billing/.test(path)) return "billing";
  if (/login|auth-client|auth-provider/.test(path)) return "auth";
  if (/agency/.test(path)) return "agency-shared";
  if (/marketplace/.test(path)) return "marketplace";
  if (/workspace|canvas|node-page|dashboard-page/.test(path)) return "workspace";
  if (/team/.test(path)) return "team";
  if (/agent/.test(path)) return "agent";
  if (/features\/app-shell|authenticated-routes|stores\/theme|lib\/theme/.test(path)) {
    return "web-platform";
  }
  return "web-platform";
}

function inferApiDomain(path) {
  const agencyMatch = path.match(/^packages\/api\/src\/routers\/agency-ops(?:\/([^/]+))?/);
  if (agencyMatch) {
    if (
      !agencyMatch[1] ||
      agencyMatch[1].endsWith(".ts") ||
      agencyMatch[1] === "shared" ||
      agencyMatch[1] === "live"
    ) {
      return "agency-shared";
    }
    const domain = featureDomainAliases.get(agencyMatch[1]);
    if (!domain) throw new Error(`Unknown agency API domain requires an owner: ${agencyMatch[1]}`);
    return domain;
  }
  const routerMatch = path.match(/^packages\/api\/src\/routers\/([^/]+)/);
  if (routerMatch) {
    if (routerMatch[1] === "system.ts" || routerMatch[1] === "index.ts") return "api-platform";
    return featureDomainAliases.get(routerMatch[1]) ?? routerMatch[1];
  }
  const schemaMatch = path.match(/^packages\/api\/src\/schemas\/([^/.]+)/);
  if (schemaMatch) {
    if (schemaMatch[1].startsWith("agency-ops")) return "agency-shared";
    if (schemaMatch[1] === "index") return "api-platform";
    return featureDomainAliases.get(schemaMatch[1]) ?? schemaMatch[1];
  }
  if (/billing/.test(path)) return "billing";
  if (/team-membership/.test(path)) return "team";
  return "api-platform";
}

function inferDatabaseDomain(path, contents) {
  if (path.includes("/migrations/meta/")) return "database-platform";
  if (path.includes("/migrations/")) return inferMigrationDomain(contents);
  const schemaMatch = path.match(/\/schema\/([^/.]+)[.]ts$/);
  if (schemaMatch) {
    if (schemaMatch[1] === "agency-ops") return "agency-shared";
    if (schemaMatch[1] === "index") return "database-platform";
    return featureDomainAliases.get(schemaMatch[1]) ?? schemaMatch[1];
  }
  return "database-platform";
}

function inferConfigurationDomain(path) {
  if (path.startsWith(".github/workflows/")) return "ci";
  if (path.startsWith(".railway/")) return "deployment";
  if (path.startsWith("apps/web/perf/")) return "performance";
  if (/^(?:nixpacks)[.]toml$|^[.]railwayignore$/.test(path)) return "deployment";
  if (path.startsWith("apps/web/")) return "web-platform";
  if (path.startsWith("apps/server/")) return "server-platform";
  if (path.startsWith("packages/db/")) return "database-platform";
  const packageMatch = path.match(/^packages\/([^/]+)\//);
  if (packageMatch) {
    if (packageMatch[1] === "config") return "configuration";
    if (packageMatch[1] === "env") return "environment";
    return featureDomainAliases.get(packageMatch[1]) ?? `${packageMatch[1]}-platform`;
  }
  return "repository";
}

function inferScriptDomain(path) {
  if (/golden-file|realtime-registry|conventions/.test(path)) return "architecture";
  if (/perf/.test(path)) return "performance";
  if (/railway|write-railway/.test(path)) return "deployment";
  if (/bucket-cors/.test(path)) return "server-platform";
  return "repository";
}

function isConfiguration(path) {
  return (
    rootConfigurationFiles.has(path) ||
    path.startsWith(".github/workflows/") ||
    path.startsWith(".railway/") ||
    path.startsWith("apps/web/perf/") ||
    (exactRuntimeArtifacts.has(path) && path !== "apps/web/public/sw.js") ||
    isWorkspaceConfiguration(path)
  );
}

function inferDomain(path, contents) {
  if (path.startsWith("packages/db/src/")) return inferDatabaseDomain(path, contents);
  if (path.startsWith("packages/api/src/")) return inferApiDomain(path);
  if (path.startsWith("apps/web/src/") || path === "apps/web/public/sw.js") {
    return inferWebDomain(path, contents);
  }
  if (path.startsWith("apps/server/src/operations/")) return inferOperationDomain(path);
  if (path.startsWith("apps/server/src/lib/")) {
    if (/clockify/.test(path)) return "time-tracking";
    if (/notification|web-push/.test(path)) return "notifications";
    if (/task-attachments/.test(path)) return "task-management";
    if (/knowledge-sources/.test(path)) return "workspace";
    return "server-platform";
  }
  if (path.startsWith("apps/server/src/")) return "server-platform";
  if (path.startsWith("packages/agent/src/")) return "agent";
  if (path.startsWith("packages/auth/src/")) return "auth";
  if (path.startsWith("packages/config/src/")) return "configuration";
  if (path.startsWith("packages/env/src/")) return "environment";
  if (path.startsWith("packages/workspace/src/")) return "workspace";
  if (path === "apps/web/public/sw.js") return "notifications";
  if (path === "scripts" || path.startsWith("scripts/") || path.includes("/scripts/")) {
    return inferScriptDomain(path);
  }
  if (isConfiguration(path)) return inferConfigurationDomain(path);
  throw new Error(`No domain rule for in-scope artifact: ${path}`);
}

function contentSignals(path, contents) {
  const signals = [];
  const add = (label, pattern) => {
    if (pattern.test(contents)) signals.push(label);
  };
  if (path.endsWith(".sql")) signals.push("SQL schema mutation statements");
  if (path.includes("/migrations/meta/")) signals.push("Drizzle migration metadata");
  if (path.endsWith(".css")) signals.push("CSS selectors and declarations");
  if (path.endsWith(".html")) signals.push("HTML application entry markup");
  if (path.endsWith(".json")) signals.push("JSON configuration or metadata");
  if (path.endsWith(".toml")) signals.push("TOML configuration");
  if (/[.]ya?ml$/.test(path)) signals.push("YAML service or workflow configuration");
  if (path.endsWith(".d.ts")) signals.push("ambient TypeScript declarations");
  if (/^[.]github\/workflows\//.test(path)) signals.push("GitHub Actions workflow jobs");
  if (path.endsWith(".sh")) signals.push("shell operation commands");
  if (path === "bun.lock") signals.push("resolved dependency graph");
  if (isTestPath(path) || /from\s+["']bun:test["']/.test(contents)) {
    signals.push("Bun test declarations");
  }
  add("database access", /@orch\/db|drizzle-orm|\bdb\.(?:insert|select|update|delete|transaction)/);
  add("Zod contracts", /\bz\.(?:object|enum|array|union|discriminatedUnion)\s*\(/);
  add("oRPC procedures or clients", /protected\w*Procedure|publicProcedure|orpcClient|\borpc\./);
  add("TanStack Query orchestration", /@tanstack\/react-query|\buse(?:Infinite)?Query\s*\(/);
  add(
    "feature query orchestration",
    /from\s+["'][^"']*(?:queries|query-options)["']|\buseBilling\s*\(/,
  );
  add("Zustand client state", /from\s+["']zustand["']|\bcreate\s*<[^>]+>\s*\(/);
  if (path.endsWith(".tsx") || /from\s+["']react["']/.test(contents)) {
    signals.push("React component or hook code");
  }
  add("server runtime wiring", /Bun\.serve|new Hono|createServer|WebSocket|process\.on\s*\(/);
  add("service worker event handlers", /self\.addEventListener\s*\(/);
  add("process or filesystem tooling", /node:(?:child_process|fs)|process\.exit(?:Code)?\b/);
  add(
    "exported declarations",
    /\bexport\s+(?:async\s+)?(?:const|function|class|type|interface|default|\*|\{)/,
  );
  add(
    "package or task configuration",
    /"(?:scripts|dependencies|devDependencies|tasks|compilerOptions|workspaces)"\s*:/,
  );
  add("environment contract", /process\.env|import\.meta\.env|createEnv|\.env/);
  if (!signals.length && contents.trim()) signals.push("non-empty declarative source content");
  return signals;
}

function isTestPath(path) {
  return /(?:^|\/)[^/]+[.](?:integration[.])?(?:test|spec)[.](?:ts|tsx)$/.test(path);
}

function isStaticPresentation(path, contents) {
  const staticPath =
    /components\/marketing|marketing-page-shell|landing-page|privacy-page|terms-page/.test(path);
  const orchestration =
    /@tanstack\/react-query|\borpcClient\b|\bauthClient\b|\buseBilling\b|\bcheckout\s*\(|\bfetch\s*\(/.test(
      contents,
    );
  return staticPath && !orchestration;
}

function configurationLayer(path) {
  if (path.startsWith(".github/workflows/")) return "ci-config";
  if (/drizzle[.]config|docker-compose/.test(path)) return "db-config";
  if (/bunfig[.]toml|apps\/web\/perf\/.*[.]json$/.test(path)) return "test-config";
  if (/knip[.]json|[.]ox(?:fmt|lint)rc[.]json/.test(path)) return "quality-config";
  if (/package[.]json$|bun[.]lock$/.test(path)) return "dependency-config";
  if (/[.]env[.]example$/.test(path)) return "runtime-config";
  if (/railway|nixpacks|dockerignore/.test(path)) return "runtime-config";
  return "build-config";
}

function scriptLayer(path) {
  if (/configure-bucket-cors/.test(path)) return "server-operation";
  if (/golden-file|realtime-registry|conventions/.test(path)) return "architecture-tooling";
  if (/test-setup|run-bruno/.test(path)) return "test-tooling";
  if (/perf/.test(path)) return "test-tooling";
  if (/railway-start|write-railway/.test(path)) return "build-tooling";
  return "build-tooling";
}

function inferLayer(path, contents, domain) {
  if (path.includes("/migrations/meta/")) return "persistence-metadata";
  if (path.includes("/migrations/") && path.endsWith(".sql")) return "persistence-migration";
  if (path === "apps/web/public/sw.js") return "client-state";
  if (path.startsWith("scripts/") || path.includes("/scripts/")) return scriptLayer(path);
  if (path.startsWith("apps/web/perf/") && path.endsWith(".mjs")) return "test-tooling";
  if (isConfiguration(path)) return configurationLayer(path);
  if (path.startsWith("apps/server/src/operations/")) return "server-operation";
  if (isTestPath(path)) return "test";
  if (path.startsWith("packages/db/src/schema")) return "persistence-schema";
  if (path.startsWith("packages/db/src/")) return "persistence-schema";
  if (path.startsWith("packages/api/src/")) {
    if (/\/schemas\/|\/shared\/schemas[.]ts$|\/schemas[.]ts$/.test(path)) return "api-contract";
    if (/\/router[.]ts$|\/routers\/index[.]ts$|\/routers\/system[.]ts$/.test(path)) {
      return "api-router";
    }
    if (/\/service[.]ts$|billing(?:-guard)?[.]ts$/.test(path)) return "api-service";
    if (/\/routers\//.test(path) && /Procedure|\.handler\s*\(/.test(contents)) return "api-router";
    if (/\/routers\//.test(path) && /@orch\/db|drizzle-orm/.test(contents)) {
      return "api-service";
    }
    return domain === "api-platform" ? "domain-service" : "domain-logic";
  }
  if (path.startsWith("packages/workspace/src/")) {
    return /\bz\.(?:object|enum|union)\s*\(/.test(contents) ? "domain-contract" : "domain-logic";
  }
  if (path.startsWith("packages/agent/src/")) return "domain-service";
  if (path.startsWith("packages/auth/src/")) return "domain-service";
  if (path.startsWith("packages/env/src/") || path.startsWith("packages/config/src/")) {
    return "domain-contract";
  }
  if (path.startsWith("apps/server/src/")) {
    return domain === "server-platform" ? "server-runtime" : "domain-service";
  }
  if (isStaticPresentation(path, contents)) return "static-presentation";
  if (path.endsWith(".css")) {
    return domain === "web-platform" ? "shared-ui" : "presentational-view";
  }
  if (/\/containers\/|[-]container[.]tsx$/.test(path)) return "container";
  if (/\/hooks\/use-|\/use-[^/]+[.]ts$/.test(path)) return "feature-hook";
  if (/\/stores\/|[-]store[.]ts$/.test(path) || /from\s+["']zustand["']/.test(contents)) {
    return "client-state";
  }
  if (/[-]view[.]tsx$|\/views\//.test(path)) return "presentational-view";
  if (/\/pages\/|[-]page[.]tsx$/.test(path)) return "feature-entry";
  if (
    /queries?[.]ts$|@tanstack\/react-query|\borpcClient\b|\buseBilling\s*\(|from\s+["'][^"']*(?:queries|query-options)["']/.test(
      path + "\n" + contents,
    )
  ) {
    return "web-query";
  }
  if (/^apps\/web\/src\/ui\//.test(path)) return "shared-ui";
  if (path.endsWith(".tsx") || /from\s+["']react["']/.test(contents)) {
    return "presentational-view";
  }
  return "domain-logic";
}

function inferClassification(path, domain, layer, signals) {
  if (!signals.length) throw new Error(`No content evidence for in-scope artifact: ${path}`);
  if (layer === "server-operation") return "server-operation";
  if (layer === "static-presentation") return "static-presentation";
  if (isConfiguration(path) || /(?:^|\/)scripts\//.test(path)) return "shared-infrastructure";
  if (infrastructureDomains.has(domain)) return "shared-infrastructure";
  if (path.startsWith("packages/auth/src/") || path === "apps/web/src/lib/auth-client.ts") {
    return "shared-infrastructure";
  }
  if (
    domain === "agency-shared" &&
    (/apps\/web\/src\/features\/shared\//.test(path) ||
      /packages\/api\/src\/routers\/agency-ops\/shared\//.test(path) ||
      /packages\/api\/src\/schemas\/agency-ops/.test(path))
  ) {
    return "shared-infrastructure";
  }
  if (signals.every((signal) => signal === "non-empty declarative source content")) {
    throw new Error(
      `${path}: golden-feature classification requires semantic content evidence, not path location alone`,
    );
  }
  return "golden-feature";
}

function roleEvidence(path, layer) {
  if (path.includes("/migrations/meta/")) return "migration metadata path";
  if (path.includes("/migrations/")) return "ordered migration path";
  if (path.startsWith(".github/workflows/")) return "CI workflow path";
  if (path.startsWith("scripts/") || path.includes("/scripts/"))
    return "source-controlled script path";
  if (isConfiguration(path)) return "recognized build, test, database, runtime, or package config";
  if (layer === "test") return "test filename";
  if (layer === "container") return "container naming";
  if (layer === "feature-hook") return "hook naming";
  if (layer === "presentational-view") return "view or component role";
  if (layer === "api-router") return "router role and procedure declarations";
  if (layer === "api-service") return "service role or data-access behavior";
  return "source role and exported behavior";
}

function rationaleFor(domain, layer, classification) {
  if (classification === "server-operation") {
    return `Deliberate ${domain} operation with isolated runtime side effects.`;
  }
  if (classification === "static-presentation") {
    return "Marketing or legal presentation with no server query or mutation orchestration.";
  }
  if (classification === "shared-infrastructure") {
    return `Cross-cutting ${domain} ${layer} support rather than a feature-owned business workflow.`;
  }
  return `Feature-owned ${domain} artifact in the canonical ${layer} layer.`;
}

export function validateCombination({ path, domain, layer, classification }) {
  if (!classifications.has(classification)) return `unknown classification ${classification}`;
  if (!ownersByDomain.has(domain)) return `unknown domain ${domain}`;
  if (classification === "server-operation") {
    return layer === "server-operation"
      ? null
      : "server-operation rows require server-operation layer";
  }
  if (classification === "static-presentation") {
    if (layer !== "static-presentation")
      return "static-presentation rows require static-presentation layer";
    return domain === "marketing" ? null : "static-presentation is limited to the marketing domain";
  }
  if (classification === "golden-feature") {
    if (!productDomains.has(domain))
      return `golden-feature cannot use infrastructure domain ${domain}`;
    if (!goldenLayers.has(layer)) return `golden-feature cannot use infrastructure layer ${layer}`;
    return null;
  }
  if (!infrastructureLayers.has(layer)) return `shared-infrastructure cannot use layer ${layer}`;
  if (
    !infrastructureDomains.has(domain) &&
    !sharedProductDomains.has(domain) &&
    !["agent", "billing", "notifications", "team", "workspace"].includes(domain) &&
    !isConfiguration(path)
  ) {
    return `shared-infrastructure requires a platform, shared, or configuration domain, got ${domain}`;
  }
  return null;
}

export async function analyzeArtifact(path) {
  const contents = await readFile(join(root, path), "utf8");
  const domain = inferDomain(path, contents);
  const signals = contentSignals(path, contents);
  const layer = inferLayer(path, contents, domain);
  const classification = inferClassification(path, domain, layer, signals);
  const record = {
    path,
    domain,
    layer,
    classification,
    owner: ownersByDomain.get(domain),
    rationale: rationaleFor(domain, layer, classification),
    evidence: `content: ${signals.slice(0, 3).join(", ")}; structure: ${roleEvidence(path, layer)}`,
  };
  const combinationError = validateCombination(record);
  if (combinationError) throw new Error(`${path}: ${combinationError}`);
  return record;
}

export async function buildInventoryRecords() {
  const paths = await collectInventoryPaths();
  return Promise.all(paths.map((path) => analyzeArtifact(path)));
}

function safeCell(value) {
  return String(value).replaceAll("|", "and").replaceAll(/\s+/g, " ").trim();
}

export function renderInventory(records, date = new Date().toISOString().slice(0, 10)) {
  const classificationCounts = new Map();
  const domainCounts = new Map();
  for (const record of records) {
    classificationCounts.set(
      record.classification,
      (classificationCounts.get(record.classification) ?? 0) + 1,
    );
    domainCounts.set(record.domain, (domainCounts.get(record.domain) ?? 0) + 1);
  }
  const lines = [
    "# Golden File Source Inventory",
    "",
    `Generated on ${date} by \`scripts/generate-golden-file-inventory.mjs\`. Every semantic field is recomputed from the current path and file content by \`scripts/check-golden-file-inventory.mjs\`.`,
    "",
    "## Scope policy",
    "",
    "Included: all product JavaScript/TypeScript and CSS files in the declared app/package source roots; Drizzle SQL and metadata; source-controlled scripts; package, build, test, database, runtime, performance, and CI configuration; and the web service worker/runtime entry.",
    "",
    "Explicit exclusions:",
    "",
    "- `node_modules/**`, `**/dist/**`, `.turbo/**`, `.nuxt/**`, and `.output/**`: installed dependencies or generated build/cache output.",
    "- `.agents/**` and other editor/agent skill state: vendored agent assets, not Orch product source.",
    "- Documentation, design artifacts, screenshots, fonts, SVGs, and other static public media: governed as content/assets rather than executable architecture.",
    "- Git metadata and source-control ignore files, local logs, scratch output, and local-only tool caches: repository housekeeping or non-product machine state.",
    "",
    "Unknown source roots and unrecognized extensions inside an included source, migration, script, performance, or CI root fail generation and checking.",
    "",
    "## Counts by classification",
    "",
    "| Classification | Artifacts |",
    "| --- | ---: |",
    ...[...classificationCounts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([classification, count]) => `| ${classification} | ${count} |`),
    "",
    "## Counts by domain",
    "",
    "| Domain | Artifacts |",
    "| --- | ---: |",
    ...[...domainCounts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([domain, count]) => `| ${domain} | ${count} |`),
    "",
    "## Artifacts",
    "",
    "| Path | Domain | Canonical layer | Classification | Owner | Rationale | Evidence |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...records.map(
      (record) =>
        `| \`${record.path}\` | ${safeCell(record.domain)} | ${safeCell(record.layer)} | ${safeCell(record.classification)} | ${safeCell(record.owner)} | ${safeCell(record.rationale)} | ${safeCell(record.evidence)} |`,
    ),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

async function main() {
  const records = await buildInventoryRecords();
  await mkdir(join(root, "docs"), { recursive: true });
  await writeFile(inventoryPath, renderInventory(records));
  console.log(
    `generate-golden: wrote ${records.length} semantic inventory rows across ${new Set(records.map((record) => record.domain)).size} domains`,
  );
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main();
}
