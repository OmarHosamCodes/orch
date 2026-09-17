#!/usr/bin/env node
/**
 * Cursor convention checks that oxlint cannot cover.
 * Run via: bun run check:conventions
 */
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SCAN_ROOTS = ["apps", "packages"];

const SKIP_DIRS = new Set(["node_modules", "dist", ".turbo", ".nuxt", ".output"]);

const DYNAMIC_IMPORT_ALLOWLIST = [
  /railway-ssr-server\.mjs$/,
  /workspace-block-registry\.ts$/,
  /lazy-infinite-canvas\.tsx$/,
  /workspace-agent-host\.tsx$/,
  /export-agency-report-xlsx\.ts$/,
  /\.test\.(ts|tsx)$/,
];

// Transitional golden-view exceptions are not permitted at final verification.
const GOLDEN_VIEW_ALLOWLIST = new Set();

const GOLDEN_LIB_STORE_ALLOWLIST = new Set();

/** @type {{ file: string; line: number; rule: string; detail: string }[]} */
const violations = [];

function normalizePath(filePath) {
  return relative(ROOT, filePath).replaceAll("\\", "/");
}

function isAllowed(filePath, allowlist) {
  const normalized = normalizePath(filePath);
  return allowlist.some((pattern) => pattern.test(normalized));
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      files.push(...(await walk(fullPath)));
      continue;
    }

    if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function createSourceFile(filePath, content) {
  const scriptKind = filePath.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : filePath.endsWith(".ts")
      ? ts.ScriptKind.TS
      : filePath.endsWith(".mjs")
        ? ts.ScriptKind.JS
        : ts.ScriptKind.JSX;

  return ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, scriptKind);
}

function nodeLine(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function visitNodes(root, visitor) {
  function visit(node) {
    visitor(node);
    ts.forEachChild(node, visit);
  }

  visit(root);
}

function isRuntimeImport(statement) {
  const clause = statement.importClause;
  if (!clause) return true;
  if (clause.isTypeOnly) return false;
  if (clause.name) return true;
  if (!clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) return true;
  return clause.namedBindings.elements.some((element) => !element.isTypeOnly);
}

function runtimeImports(sourceFile) {
  return sourceFile.statements
    .filter(ts.isImportDeclaration)
    .filter(isRuntimeImport)
    .map((statement) => ({
      source: statement.moduleSpecifier.text,
      line: nodeLine(sourceFile, statement),
    }));
}

function resolveLocalImport(importer, source, recordsByPath) {
  let basePath;
  if (source.startsWith("@/")) {
    basePath = join(ROOT, "apps/web/src", source.slice(2));
  } else if (source.startsWith(".")) {
    basePath = resolve(dirname(importer), source);
  } else {
    return null;
  }

  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.mjs`,
    join(basePath, "index.ts"),
    join(basePath, "index.tsx"),
    join(basePath, "index.js"),
    join(basePath, "index.mjs"),
  ];

  for (const candidate of candidates) {
    const normalized = normalizePath(candidate);
    if (recordsByPath.has(normalized)) return normalized;
  }

  return null;
}

function isHookCall(node) {
  if (!ts.isCallExpression(node)) return false;
  const expression = node.expression;
  return ts.isIdentifier(expression) && /^use[A-Z][A-Za-z0-9]*$/.test(expression.text);
}

function isNamedCall(node, name) {
  return (
    ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name
  );
}

function forbiddenViewImport(source) {
  if (
    source.includes("@tanstack/react-query") ||
    source.includes("@tanstack/vue-query") ||
    source.includes("@tanstack/query") ||
    source.includes("@/lib/orpc") ||
    source.includes("@orpc/") ||
    source.includes("orpcClient") ||
    source.includes("zustand") ||
    source.includes("/stores/") ||
    source.startsWith("@/stores/")
  ) {
    return "query, oRPC, or store orchestration";
  }

  if (
    source === "react-router-dom" ||
    source.includes("/auth-client") ||
    source.includes("/auth/") ||
    source.startsWith("better-auth") ||
    source.startsWith("@orch/auth")
  ) {
    return "auth or router orchestration";
  }

  if (source.includes("/containers/") || /(^|\/)containers?(\/|$)/.test(source)) {
    return "a stateful container";
  }

  if (
    (source.includes("/hooks/") || /(^|\/)hooks?(\/|$)/.test(source)) &&
    !source.includes("@/lib/hooks/")
  ) {
    return "a feature hook module";
  }

  return null;
}

function localOrchestrationEvidence(record) {
  const evidence = [];

  if (
    record.normalized.includes("/containers/") ||
    record.normalized.includes("/stores/") ||
    /\/hooks\/use-[^/]+\.[cm]?[jt]sx?$/.test(record.normalized)
  ) {
    evidence.push({ line: 1, detail: `orchestration module ${record.normalized}` });
  }

  for (const imported of runtimeImports(record.sourceFile)) {
    const reason = forbiddenViewImport(imported.source);
    if (reason) evidence.push({ line: imported.line, detail: `${reason} via ${imported.source}` });
  }

  return evidence;
}

function scanGoldenView(record, recordsByPath) {
  const { normalized, sourceFile } = record;
  if (GOLDEN_VIEW_ALLOWLIST.has(normalized)) return;

  for (const imported of runtimeImports(sourceFile)) {
    const reason = forbiddenViewImport(imported.source);
    if (reason) {
      violations.push({
        file: normalized,
        line: imported.line,
        rule: "golden-view-props-only",
        detail: `View cannot import ${reason}: ${imported.source}`,
      });
    }
  }

  visitNodes(sourceFile, (node) => {
    if (isHookCall(node)) {
      violations.push({
        file: normalized,
        line: nodeLine(sourceFile, node),
        rule: "golden-view-no-hooks",
        detail: `View cannot call hook ${node.expression.text}()`,
      });
    }

    if (isNamedCall(node, "getErrorMessage")) {
      violations.push({
        file: normalized,
        line: nodeLine(sourceFile, node),
        rule: "golden-view-display-ready-errors",
        detail: "Views receive display-ready errors and cannot normalize exceptions",
      });
    }
  });

  const queue = runtimeImports(sourceFile)
    .map((item) => resolveLocalImport(record.filePath, item.source, recordsByPath))
    .filter(Boolean)
    .map((dependency) => ({ dependency, path: [normalized, dependency] }));
  const visited = new Set([normalized]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current.dependency)) continue;
    visited.add(current.dependency);

    if (!current.dependency.startsWith("apps/web/src/features/")) continue;
    const dependencyRecord = recordsByPath.get(current.dependency);
    if (!dependencyRecord) continue;
    const evidence = localOrchestrationEvidence(dependencyRecord)[0];

    if (evidence) {
      violations.push({
        file: normalized,
        line: 1,
        rule: "golden-view-no-indirect-orchestration",
        detail: `${current.path.join(" -> ")} reaches ${evidence.detail}`,
      });
      continue;
    }

    for (const imported of runtimeImports(dependencyRecord.sourceFile)) {
      const next = resolveLocalImport(dependencyRecord.filePath, imported.source, recordsByPath);
      if (next && !visited.has(next)) {
        queue.push({ dependency: next, path: [...current.path, next] });
      }
    }
  }
}

function scanGoldenContainer(record) {
  const { normalized, sourceFile } = record;
  const hookCalls = [];

  visitNodes(sourceFile, (node) => {
    if (isHookCall(node)) hookCalls.push(node);
  });

  const viewImports = new Set(
    runtimeImports(sourceFile)
      .map((item) => item.source)
      .filter((source) => source.includes("/views/") || /(^|\/)[^/]+-view$/.test(source)),
  );

  if (hookCalls.length !== 1) {
    violations.push({
      file: normalized,
      line: 1,
      rule: "golden-container-one-hook",
      detail: `Container must call exactly one feature hook; found ${hookCalls.length}`,
    });
  }

  if (viewImports.size !== 1) {
    violations.push({
      file: normalized,
      line: 1,
      rule: "golden-container-one-view",
      detail: `Container must bind exactly one presentational view module; found ${viewImports.size}`,
    });
  }

  for (const imported of runtimeImports(sourceFile)) {
    const source = imported.source;
    if (
      source.includes("@tanstack/") ||
      source.includes("@/lib/orpc") ||
      source.includes("@orpc/") ||
      source.includes("orpcClient") ||
      source.includes("zustand") ||
      source.includes("/stores/") ||
      source === "react-router-dom" ||
      source.includes("/auth-client")
    ) {
      violations.push({
        file: normalized,
        line: imported.line,
        rule: "golden-container-bind-only",
        detail: `Container must delegate orchestration to its feature hook: ${source}`,
      });
    }
  }
}

function containsParseCall(node) {
  let found = false;

  visitNodes(node, (candidate) => {
    if (
      ts.isCallExpression(candidate) &&
      ts.isPropertyAccessExpression(candidate.expression) &&
      candidate.expression.name.text === "parse"
    ) {
      found = true;
    }
  });

  return found;
}

function findVariableInitializer(callback, identifierName) {
  let initializer = null;

  function visit(node) {
    if (initializer) return;
    if (node !== callback && ts.isFunctionLike(node)) return;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (node.name.text === identifierName && node.initializer) {
        initializer = node.initializer;
        return;
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(callback.body);
  return initializer;
}

function isParsedHandlerExpression(expression, callback) {
  if (containsParseCall(expression)) return true;
  if (ts.isIdentifier(expression)) {
    const initializer = findVariableInitializer(callback, expression.text);
    return Boolean(initializer && containsParseCall(initializer));
  }
  return false;
}

function handlerResultExpressions(callback) {
  if (!ts.isBlock(callback.body)) return [callback.body];
  const results = [];

  function visit(node) {
    if (node !== callback.body && ts.isFunctionLike(node)) return;
    if (ts.isReturnStatement(node) && node.expression) {
      results.push(node.expression);
      return;
    }
    if (ts.isYieldExpression(node) && node.expression) {
      results.push(node.expression);
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(callback.body);
  return results;
}

function scanGoldenRouter(record) {
  const { normalized, sourceFile } = record;

  for (const imported of runtimeImports(sourceFile)) {
    if (imported.source.includes("@orch/db") || imported.source.includes("drizzle-orm")) {
      violations.push({
        file: normalized,
        line: imported.line,
        rule: "golden-router-no-db",
        detail: `Router file cannot import persistence directly: ${imported.source}`,
      });
    }
  }

  visitNodes(sourceFile, (node) => {
    if (
      !ts.isCallExpression(node) ||
      !ts.isPropertyAccessExpression(node.expression) ||
      node.expression.name.text !== "handler"
    ) {
      return;
    }

    const callback = node.arguments[0];
    if (!callback || (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))) return;
    const results = handlerResultExpressions(callback);

    if (results.length === 0) {
      violations.push({
        file: normalized,
        line: nodeLine(sourceFile, callback),
        rule: "golden-router-output-parse",
        detail: "Router handler must return or yield an output parsed through Zod",
      });
      return;
    }

    for (const expression of results) {
      if (isParsedHandlerExpression(expression, callback)) continue;
      violations.push({
        file: normalized,
        line: nodeLine(sourceFile, expression),
        rule: "golden-router-output-parse",
        detail: "Router output must parse through Zod before returning",
      });
    }
  });
}

function hasExportModifier(node) {
  return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function serviceFunctionName(node, fallback) {
  if (node.name && ts.isIdentifier(node.name)) return node.name.text;
  return fallback;
}

function scanServiceFunction(record, node, fallbackName) {
  const { normalized, sourceFile } = record;
  const name = serviceFunctionName(node, fallbackName) || "anonymous service function";
  const parameters = node.parameters;
  const firstName =
    parameters[0] && ts.isIdentifier(parameters[0].name) ? parameters[0].name.text : null;
  const secondName =
    parameters[1] && ts.isIdentifier(parameters[1].name) ? parameters[1].name.text : null;

  if (!firstName || !/^_?actorUserId$/.test(firstName)) {
    violations.push({
      file: normalized,
      line: nodeLine(sourceFile, node),
      rule: "golden-service-actor-first",
      detail: `${name} must accept actorUserId as its first parameter`,
    });
  }

  if (!secondName || !/^_?input$/.test(secondName) || !parameters[1]?.type) {
    violations.push({
      file: normalized,
      line: nodeLine(sourceFile, node),
      rule: "golden-service-input-object",
      detail: `${name} must accept a typed input object as its second parameter`,
    });
  }

  if (parameters.length !== 2) {
    violations.push({
      file: normalized,
      line: nodeLine(sourceFile, node),
      rule: "golden-service-two-arguments",
      detail: `${name} must expose exactly actorUserId and one input object; found ${parameters.length} parameters`,
    });
  }
}

function scanGoldenService(record) {
  const { sourceFile } = record;

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && hasExportModifier(statement)) {
      scanServiceFunction(record, statement, null);
      continue;
    }

    if (!ts.isVariableStatement(statement) || !hasExportModifier(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        declaration.initializer &&
        (ts.isArrowFunction(declaration.initializer) ||
          ts.isFunctionExpression(declaration.initializer))
      ) {
        scanServiceFunction(
          record,
          declaration.initializer,
          ts.isIdentifier(declaration.name) ? declaration.name.text : null,
        );
      }
    }
  }
}

function scanPickerUnification(record) {
  const { normalized, sourceFile } = record;
  if (!normalized.startsWith("apps/web/src/") || !normalized.endsWith(".tsx")) return;

  visitNodes(sourceFile, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      if (
        node.name.text === "parseLocalDateKey" ||
        node.name.text === "formatLocalDateKey" ||
        node.name.text === "formatDisplayDay"
      ) {
        violations.push({
          file: normalized,
          line: nodeLine(sourceFile, node),
          rule: "picker-shared-date-helpers",
          detail: `Use parseAgencyDateKey/formatAgencyDateKey/formatAgencyDisplayDay from @/features/shared/date/agency-date-field instead of a local copy`,
        });
      }
    }

    if (
      (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) ||
      !ts.isIdentifier(node.tagName)
    ) {
      return;
    }

    if (node.tagName.text === "select") {
      violations.push({
        file: normalized,
        line: nodeLine(sourceFile, node),
        rule: "picker-no-native-select",
        detail: "Use @/ui/select (short enums) or the AgencyPickerShell family (searchable) instead of <select>",
      });
      return;
    }

    if (node.tagName.text !== "input") return;
    const typeAttribute = node.attributes.properties.find(
      (property) =>
        ts.isJsxAttribute(property) &&
        property.name.text === "type" &&
        property.initializer &&
        ts.isStringLiteral(property.initializer),
    );
    if (
      typeAttribute &&
      ts.isJsxAttribute(typeAttribute) &&
      ts.isStringLiteral(typeAttribute.initializer) &&
      typeAttribute.initializer.text === "date"
    ) {
      violations.push({
        file: normalized,
        line: nodeLine(sourceFile, node),
        rule: "picker-no-native-date",
        detail: "Use AgencyDateField from @/features/shared/date/agency-date-field instead of <input type=\"date\">",
      });
    }
  });
}

function scanFile(filePath, content) {
  const normalized = normalizePath(filePath);
  const lines = content.split("\n");
  const isTypeScript = /\.tsx?$/.test(normalized);

  const isRouterFile =
    normalized.startsWith("packages/api/src/routers/") &&
    (normalized.endsWith("/router.ts") ||
      normalized.endsWith("/index.ts") ||
      normalized.endsWith("Router.ts"));
  const isGenericFeatureUtil =
    normalized.startsWith("apps/web/src/features/") &&
    (normalized.endsWith("/utils.ts") ||
      normalized.endsWith("/helpers.ts") ||
      normalized.endsWith("/data.ts") ||
      normalized.endsWith("/utils.tsx") ||
      normalized.endsWith("/helpers.tsx") ||
      normalized.endsWith("/data.tsx"));

  if (isGenericFeatureUtil) {
    violations.push({
      file: normalized,
      line: 1,
      rule: "golden-no-generic-utils",
      detail: "Generic utils/helpers/data files inside features are blocked",
    });
  }

  const isUnderLibOrStores =
    normalized.startsWith("apps/web/src/lib/") || normalized.startsWith("apps/web/src/stores/");
  const hasFeaturePrefix =
    /^(agency|workspace|agent|team)-/.test(normalized.split("/").pop() || "") ||
    normalized.includes("/workspace/") ||
    normalized.includes("/queries/agency") ||
    normalized.startsWith("apps/web/src/stores/workspace");

  if (isUnderLibOrStores && hasFeaturePrefix && !GOLDEN_LIB_STORE_ALLOWLIST.has(normalized)) {
    violations.push({
      file: normalized,
      line: 1,
      rule: "golden-no-feature-lib-store",
      detail: "Feature-specific file must live inside features/ folder, not lib/ or stores/",
    });
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;
    const trimmed = line.trim();

    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
      continue;
    }

    if (line.includes("await import(") && !isAllowed(filePath, DYNAMIC_IMPORT_ALLOWLIST)) {
      violations.push({
        file: normalized,
        line: lineNumber,
        rule: "no-inline-imports",
        detail: "Dynamic await import() outside allowlist",
      });
    }

    if (
      isTypeScript &&
      /import\s*\([^)]+\)\s*\.(?!then\b)/.test(line) &&
      !line.trimStart().startsWith("*") &&
      !line.trimStart().startsWith("//")
    ) {
      violations.push({
        file: normalized,
        line: lineNumber,
        rule: "no-inline-imports",
        detail: "Inline import() type reference",
      });
    }

    if (/\bpnpm\b/.test(line) || /\bnpm run\b/.test(line) || /\byarn\b/.test(line)) {
      violations.push({
        file: normalized,
        line: lineNumber,
        rule: "bun-only",
        detail: "Use bun run instead of other package managers",
      });
    }

    if (
      normalized.startsWith("apps/web/src/") &&
      normalized.endsWith(".tsx") &&
      /className=\{[^}]*\.join\(" "\)/.test(line)
    ) {
      violations.push({
        file: normalized,
        line: lineNumber,
        rule: "cn-classname",
        detail: 'Use cn() instead of className={[...].join(" ")}',
      });
    }

    if (
      normalized.startsWith("apps/web/src/") &&
      normalized.endsWith(".tsx") &&
      line.includes('Search className="absolute') &&
      !line.includes("size-4") &&
      normalized !== "apps/web/src/features/shared/pickers/agency-picker-shell.tsx"
    ) {
      violations.push({
        file: normalized,
        line: lineNumber,
        rule: "picker-panel-search",
        detail: "Use AgencyPickerSearch from the picker shell instead of a hand-rolled panel search header",
      });
    }

    if (isRouterFile) {
      const isImport = trimmed.startsWith("import ");
      if (isImport) {
        const importsDbOrDrizzle = trimmed.includes("@orch/db") || trimmed.includes("drizzle-orm");
        const importsStore = trimmed.includes("/stores/") || trimmed.includes("@/stores/");

        if (importsDbOrDrizzle) {
          violations.push({
            file: normalized,
            line: lineNumber,
            rule: "golden-router-no-db",
            detail: "Router file cannot import DB or Drizzle directly",
          });
        }
        if (importsStore) {
          violations.push({
            file: normalized,
            line: lineNumber,
            rule: "golden-router-no-stores",
            detail: "Router file cannot import feature or global stores directly",
          });
        }
      }
    }
  }
}

async function main() {
  const records = [];

  for (const scanRoot of SCAN_ROOTS) {
    const rootPath = join(ROOT, scanRoot);
    const files = await walk(rootPath);

    for (const filePath of files) {
      const content = await readFile(filePath, "utf8");
      records.push({
        filePath,
        normalized: normalizePath(filePath),
        content,
        sourceFile: createSourceFile(filePath, content),
      });
      scanFile(filePath, content);
    }
  }

  const recordsByPath = new Map(records.map((record) => [record.normalized, record]));
  for (const record of records) {
    const isViewFile =
      record.normalized.endsWith("-view.tsx") || record.normalized.endsWith("/view.tsx");
    const isContainerFile =
      record.normalized.startsWith("apps/web/src/features/") &&
      record.normalized.includes("/containers/") &&
      record.normalized.endsWith(".tsx");
    const isApiRouterFile =
      record.normalized.startsWith("packages/api/src/routers/") &&
      record.normalized.endsWith(".ts") &&
      /\.handler\s*\(/.test(record.content);
    const isApiServiceFile =
      record.normalized.startsWith("packages/api/src/routers/") &&
      /\/(?:service|[^/]+-service)\.ts$/.test(record.normalized);

    if (isViewFile) scanGoldenView(record, recordsByPath);
    if (isContainerFile) scanGoldenContainer(record);
    if (isApiRouterFile) scanGoldenRouter(record);
    if (isApiServiceFile) scanGoldenService(record);
    scanPickerUnification(record);
  }

  if (violations.length === 0) {
    console.log("check-conventions: ok");
    return;
  }

  console.error(`check-conventions: ${violations.length} violation(s)\n`);
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line} [${violation.rule}] ${violation.detail}`);
  }
  process.exit(1);
}

await main();
