/** @typedef {{ id: string; path: string; tier: string; auth: boolean; ci: boolean; label?: string }} PerfRoute */

/** @type {PerfRoute[]} */
const ALL_ROUTES = [
  { id: "landing", path: "/", tier: "marketing", auth: false, ci: true },
  { id: "privacy", path: "/privacy", tier: "marketing", auth: false, ci: true },
  { id: "terms", path: "/terms", tier: "marketing", auth: false, ci: true },
  { id: "login", path: "/login", tier: "auth", auth: false, ci: true },
  { id: "canvas", path: "/canvas", tier: "app-heavy", auth: true, ci: false },
  {
    id: "billing-success",
    path: "/billing/success",
    tier: "app-light",
    auth: true,
    ci: false,
  },
  {
    id: "node",
    path: "/node/{nodeId}",
    tier: "app-heavy",
    auth: true,
    ci: false,
    dynamic: "nodeId",
  },
  {
    id: "agency-work",
    path: "/agency",
    tier: "agency",
    auth: true,
    ci: false,
    label: "Agency / Tracker",
  },
  {
    id: "agency-dashboard",
    path: "/agency/dashboard",
    tier: "agency",
    auth: true,
    ci: false,
    label: "Agency / Dashboard",
  },
  {
    id: "agency-clients",
    path: "/agency/clients",
    tier: "agency",
    auth: true,
    ci: false,
    label: "Agency / Clients",
  },
  {
    id: "agency-projects",
    path: "/agency/projects",
    tier: "agency",
    auth: true,
    ci: false,
    label: "Agency / Projects",
  },
  {
    id: "agency-reports",
    path: "/agency/reports",
    tier: "agency",
    auth: true,
    ci: false,
    label: "Agency / Reports",
  },
  {
    id: "agency-management",
    path: "/agency/management/resourcing",
    tier: "agency",
    auth: true,
    ci: false,
    label: "Agency / Management",
  },
];

/**
 * @param {{ ci?: boolean; nodeId?: string | null }} options
 */
export function resolveRoutes({ ci = false, nodeId = null } = {}) {
  const selected = ci ? ALL_ROUTES.filter((route) => route.ci) : ALL_ROUTES;

  return selected
    .map((route) => {
      let path = route.path;
      if (route.dynamic === "nodeId") {
        if (!nodeId) return null;
        path = `/node/${nodeId}`;
      }
      return {
        ...route,
        path,
        displayPath: path,
      };
    })
    .filter(Boolean);
}
