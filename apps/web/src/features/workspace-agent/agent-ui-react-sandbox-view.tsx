// ============================================================================
// AI UI REACT SANDBOX
// ============================================================================
// Model-authored view code runs inside an opaque-origin iframe
// (`sandbox="allow-scripts"`, no allow-same-origin) behind a CSP that blocks
// every network fetch. The parent window never evaluates the code.
//
// Contract handed to the model (mirrored in the ui_present description):
//   - plain JS, no JSX, no import/export/require
//   - build elements with h(type, props, ...children) — React.createElement alias
//   - call render(element) once; `props` holds the artifact props
//   - components: Stack, Grid, Stat, Table, Text, Image, Callout
//
// ponytail: hyperscript instead of shipping React + a transpiler into the
// frame. If artifacts ever need hooks, inline a React UMD build here.
// ============================================================================

/** Fail closed before the frame ever loads. */
const FORBIDDEN = [
  { re: /\bimport\b/, label: "import" },
  { re: /\bexport\b/, label: "export" },
  { re: /\brequire\s*\(/, label: "require" },
  { re: /\bfetch\s*\(/, label: "fetch" },
  { re: /\bXMLHttpRequest\b/, label: "XMLHttpRequest" },
  { re: /\bWebSocket\b/, label: "WebSocket" },
  { re: /\bimportScripts\b/, label: "importScripts" },
  { re: /<[A-Za-z]/, label: "JSX" },
] as const;

export function findSandboxViolation(code: string): string | null {
  for (const rule of FORBIDDEN) {
    if (rule.re.test(code)) return rule.label;
  }
  return null;
}

/** Escape for embedding inside an inline <script>. */
function toScriptLiteral(value: unknown): string {
  return JSON.stringify(value ?? null).replace(/</g, "\\u003c");
}

const RUNTIME = `
for (const key of ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "open"]) {
  try { delete window[key]; window[key] = undefined; } catch (_) {}
}

const CLASSES = {
  Stack: "aiui-stack",
  Grid: "aiui-grid",
  Stat: "aiui-stat",
  Table: "aiui-table",
  Text: "aiui-text",
  Image: "aiui-image",
  Callout: "aiui-callout",
};

function el(tag, className, attrs) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function appendChildren(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

function safeUrl(raw) {
  try {
    const url = new URL(String(raw), "https://invalid.local");
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch (_) {
    return "";
  }
}

const Components = {
  Stack(props, children) {
    const node = el("div", CLASSES.Stack);
    node.style.gap = props.gap === "sm" ? "6px" : props.gap === "lg" ? "20px" : "12px";
    appendChildren(node, children);
    return node;
  },
  Grid(props, children) {
    const node = el("div", CLASSES.Grid);
    const columns = Math.min(Math.max(Number(props.columns) || 2, 1), 4);
    node.style.gridTemplateColumns = "repeat(" + columns + ", minmax(0, 1fr))";
    appendChildren(node, children);
    return node;
  },
  Text(props, children) {
    const node = el("p", CLASSES.Text);
    if (props.tone === "muted") node.style.color = "var(--aiui-muted)";
    appendChildren(node, children.length ? children : [props.children ?? ""]);
    return node;
  },
  Stat(props) {
    const node = el("div", CLASSES.Stat);
    const label = el("span", "aiui-stat-label");
    label.textContent = String(props.label ?? "");
    const value = el("span", "aiui-stat-value");
    value.textContent = String(props.value ?? "");
    node.append(label, value);
    if (props.hint) {
      const hint = el("span", "aiui-stat-hint");
      hint.textContent = String(props.hint);
      node.append(hint);
    }
    return node;
  },
  Table(props) {
    const columns = Array.isArray(props.columns) ? props.columns : [];
    const rows = Array.isArray(props.rows) ? props.rows : [];
    const table = el("table", CLASSES.Table);
    const thead = el("thead");
    const headRow = el("tr");
    for (const column of columns) {
      const th = el("th");
      th.textContent = String(column);
      headRow.append(th);
    }
    thead.append(headRow);
    const tbody = el("tbody");
    for (const row of rows) {
      const tr = el("tr");
      for (let i = 0; i < columns.length; i++) {
        const td = el("td");
        const cell = Array.isArray(row) ? row[i] : row?.[columns[i]];
        td.textContent = cell === null || cell === undefined ? "—" : String(cell);
        tr.append(td);
      }
      tbody.append(tr);
    }
    table.append(thead, tbody);
    return table;
  },
  Image(props) {
    const src = safeUrl(props.src);
    if (!src) return document.createTextNode("");
    const node = el("img", CLASSES.Image, { src: src, alt: String(props.alt ?? ""), loading: "lazy" });
    return node;
  },
  Callout(props, children) {
    const node = el("div", CLASSES.Callout);
    if (props.title) {
      const title = el("strong");
      title.textContent = String(props.title);
      node.append(title);
    }
    appendChildren(node, children.length ? children : [props.body ?? ""]);
    return node;
  },
};

function h(type, props, ...children) {
  const resolved = props || {};
  if (typeof type === "function") return type(resolved, children);
  const component = Components[type];
  if (!component) throw new Error("Unknown component: " + String(type));
  return component(resolved, children);
}

const React = { createElement: h, Fragment: "Stack" };
const root = document.getElementById("root");

function render(node) {
  root.replaceChildren();
  appendChildren(root, [node]);
}

function fail(message) {
  root.replaceChildren();
  const box = el("div", CLASSES.Callout);
  box.style.borderColor = "var(--aiui-danger)";
  box.textContent = "This view could not render: " + message;
  root.append(box);
}

window.addEventListener("error", (event) => fail(event.message));

try {
  const run = new Function(
    "h", "React", "render", "props", "Stack", "Grid", "Stat", "Table", "Text", "Image", "Callout",
    __AIUI_CODE__,
  );
  run(
    h, React, render, __AIUI_PROPS__,
    "Stack", "Grid", "Stat", "Table", "Text", "Image", "Callout",
  );
} catch (error) {
  fail(error && error.message ? error.message : String(error));
}
`;

const STYLES = `
:root { color-scheme: dark; --aiui-fg: #e8eaed; --aiui-muted: #9aa1ab; --aiui-line: rgba(255,255,255,.14); --aiui-card: rgba(255,255,255,.04); --aiui-danger: #f87171; }
* { box-sizing: border-box; }
body { margin: 0; padding: 12px; font: 13px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--aiui-fg); background: transparent; }
.aiui-stack { display: flex; flex-direction: column; }
.aiui-grid { display: grid; gap: 12px; }
.aiui-text { margin: 0; }
.aiui-stat { display: flex; flex-direction: column; gap: 4px; border: 1px solid var(--aiui-line); background: var(--aiui-card); border-radius: 12px; padding: 10px 12px; }
.aiui-stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--aiui-muted); }
.aiui-stat-value { font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums; }
.aiui-stat-hint { font-size: 11px; color: var(--aiui-muted); }
.aiui-table { width: 100%; border-collapse: collapse; border: 1px solid var(--aiui-line); border-radius: 12px; overflow: hidden; font-size: 12px; }
.aiui-table th { text-align: start; font-size: 11px; color: var(--aiui-muted); font-weight: 500; }
.aiui-table th, .aiui-table td { padding: 6px 10px; border-bottom: 1px solid var(--aiui-line); font-variant-numeric: tabular-nums; }
.aiui-table tr:last-child td { border-bottom: 0; }
.aiui-image { width: 100%; border-radius: 12px; display: block; }
.aiui-callout { border: 1px solid var(--aiui-line); background: var(--aiui-card); border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
`;

export function buildSandboxSrcDoc(code: string, props: unknown): string {
  const runtime = RUNTIME.replace("__AIUI_CODE__", toScriptLiteral(code)).replace(
    "__AIUI_PROPS__",
    toScriptLiteral(props ?? {}),
  );
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src https: data:; connect-src 'none'; frame-src 'none'; form-action 'none'"><style>${STYLES}</style></head><body><div id="root"></div><script>${runtime}</script></body></html>`;
}

export function AgentUiReactSandboxView({
  title,
  code,
  props,
}: {
  title: string;
  code: string;
  props?: Record<string, unknown>;
}) {
  const violation = findSandboxViolation(code);
  const srcDoc = violation ? null : buildSandboxSrcDoc(code, props ?? {});

  if (!srcDoc) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-[13px] leading-relaxed">
        <p className="font-semibold text-foreground">View blocked</p>
        <p className="text-foreground/80">
          The generated code uses <code className="font-mono">{violation}</code>, which the sandbox
          does not allow. Ask the assistant to render this as a schema view instead.
        </p>
      </div>
    );
  }

  return (
    <iframe
      title={title}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      className="h-full min-h-[240px] w-full rounded-xl border border-border bg-card"
    />
  );
}
