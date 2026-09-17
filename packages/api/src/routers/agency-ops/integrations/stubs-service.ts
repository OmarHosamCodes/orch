import { requireAgencyRole } from "../shared/membership";

const INTEGRATION_STUB_ITEMS = [
  {
    id: "slack" as const,
    name: "Slack",
    description: "Daily totals and budget warnings in your channel.",
    status: "available" as const,
    connectedAt: null,
  },
  {
    id: "calendar" as const,
    name: "Calendar",
    description: "Suggest time entries from Google or Outlook events.",
    status: "available" as const,
    connectedAt: null,
  },
  {
    id: "quickbooks" as const,
    name: "QuickBooks · Xero",
    description: "Send invoices straight to your books.",
    status: "available" as const,
    connectedAt: null,
  },
  {
    id: "webhooks" as const,
    name: "Webhooks",
    description: "Stream entries into anything you already script.",
    status: "available" as const,
    connectedAt: null,
  },
];

export async function listIntegrationsStub(actorUserId: string, input: { teamId: string }) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");
  return { items: INTEGRATION_STUB_ITEMS };
}
