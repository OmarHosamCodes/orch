import { Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";

import { FISCAL_MONTHS, type FiscalMonth } from "@/features/resourcing/tenure-utils";
import {
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyWorkMetaClass,
} from "@/features/shared/agency-ui";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

export type PeopleExemptionItem = {
  id: string;
  fiscalYear: number;
  fiscalQuarter: number;
  type: string;
  userName: string | null;
  userId: string | null;
};

export type PeopleExemptionDraft = {
  type: "team_holiday" | "member_waiver" | "member_reduced_min" | "member_frozen_month";
  fiscalYear: string;
  fiscalQuarter: "1" | "2" | "3" | "4";
  userId: string;
  reducedMinHours: string;
  frozenMonth: FiscalMonth;
  reason: string;
};

type AgencyPeopleExemptionsProps = {
  exemptions: PeopleExemptionItem[];
  draft: PeopleExemptionDraft;
  onDraftChange: (draft: PeopleExemptionDraft) => void;
  canEdit: boolean;
  saving: boolean;
  onAdd: () => Promise<void>;
  onRemove: (exemptionId: string) => void;
};

const EXEMPTION_TYPE_LABELS: Record<PeopleExemptionDraft["type"], string> = {
  team_holiday: "Team holiday quarter",
  member_waiver: "Member waiver",
  member_reduced_min: "Reduced minimum",
  member_frozen_month: "Frozen month",
};

function exemptionTypeLabel(type: string): string {
  if (type in EXEMPTION_TYPE_LABELS) {
    return EXEMPTION_TYPE_LABELS[type as PeopleExemptionDraft["type"]];
  }
  return type.replaceAll("_", " ");
}

export function AgencyPeopleExemptions({
  exemptions,
  draft,
  onDraftChange,
  canEdit,
  saving,
  onAdd,
  onRemove,
}: AgencyPeopleExemptionsProps) {
  const [formOpen, setFormOpen] = useState(false);
  const fieldId = useId();

  return (
    <div className="space-y-3 border-border border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-highlighted">Exemptions</h4>
          <p className={agencyWorkMetaClass}>
            Waivers and adjustments for this member, plus team-wide holidays.
          </p>
        </div>
        {canEdit ? (
          <Popover open={formOpen} onOpenChange={setFormOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" type="button">
                <Plus className="size-4" aria-hidden />
                Add exemption
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" size="form" tone="morph" className="p-surface">
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void onAdd()
                    .then(() => {
                      setFormOpen(false);
                    })
                    .catch(() => {
                      // Keep open with error toast from the hook.
                    });
                }}
              >
                <p className="text-sm font-medium text-foreground">New exemption</p>
                <div className={agencyFormFieldClass}>
                  <Label htmlFor={`${fieldId}-type`} className={agencyFormLabelClass}>
                    Type
                  </Label>
                  <Select
                    value={draft.type}
                    onValueChange={(value) =>
                      onDraftChange({
                        ...draft,
                        type: value as PeopleExemptionDraft["type"],
                      })
                    }
                  >
                    <SelectTrigger id={`${fieldId}-type`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team_holiday">Team holiday quarter</SelectItem>
                      <SelectItem value="member_waiver">Member waiver</SelectItem>
                      <SelectItem value="member_reduced_min">Reduced minimum</SelectItem>
                      <SelectItem value="member_frozen_month">Frozen month</SelectItem>
                    </SelectContent>
                  </Select>
                  {draft.type === "team_holiday" ? (
                    <p className={agencyWorkMetaClass}>
                      Applies to everyone on the team for that quarter. It does not mark individual
                      members as Override.
                    </p>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={agencyFormFieldClass}>
                    <Label htmlFor={`${fieldId}-year`} className={agencyFormLabelClass}>
                      Fiscal year
                    </Label>
                    <Input
                      id={`${fieldId}-year`}
                      type="number"
                      value={draft.fiscalYear}
                      onChange={(event) =>
                        onDraftChange({ ...draft, fiscalYear: event.target.value })
                      }
                    />
                  </div>
                  <div className={agencyFormFieldClass}>
                    <Label htmlFor={`${fieldId}-quarter`} className={agencyFormLabelClass}>
                      Quarter
                    </Label>
                    <Select
                      value={draft.fiscalQuarter}
                      onValueChange={(value) =>
                        onDraftChange({
                          ...draft,
                          fiscalQuarter: value as PeopleExemptionDraft["fiscalQuarter"],
                        })
                      }
                    >
                      <SelectTrigger id={`${fieldId}-quarter`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Q1</SelectItem>
                        <SelectItem value="2">Q2</SelectItem>
                        <SelectItem value="3">Q3</SelectItem>
                        <SelectItem value="4">Q4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {draft.type === "member_reduced_min" ? (
                  <div className={agencyFormFieldClass}>
                    <Label htmlFor={`${fieldId}-hours`} className={agencyFormLabelClass}>
                      Reduced min hours
                    </Label>
                    <Input
                      id={`${fieldId}-hours`}
                      type="number"
                      min={1}
                      value={draft.reducedMinHours}
                      onChange={(event) =>
                        onDraftChange({ ...draft, reducedMinHours: event.target.value })
                      }
                    />
                  </div>
                ) : null}
                {draft.type === "member_frozen_month" ? (
                  <div className={agencyFormFieldClass}>
                    <Label htmlFor={`${fieldId}-month`} className={agencyFormLabelClass}>
                      Frozen month
                    </Label>
                    <Select
                      value={String(draft.frozenMonth)}
                      onValueChange={(value) =>
                        onDraftChange({
                          ...draft,
                          frozenMonth: Number.parseInt(value, 10) as FiscalMonth,
                        })
                      }
                    >
                      <SelectTrigger id={`${fieldId}-month`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FISCAL_MONTHS.map((month) => (
                          <SelectItem key={month.value} value={String(month.value)}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div className={agencyFormFieldClass}>
                  <Label htmlFor={`${fieldId}-reason`} className={agencyFormLabelClass}>
                    Reason
                  </Label>
                  <Input
                    id={`${fieldId}-reason`}
                    value={draft.reason}
                    onChange={(event) => onDraftChange({ ...draft, reason: event.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Saving…" : "Save exemption"}
                </Button>
              </form>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>

      {exemptions.length > 0 ? (
        <ul className="space-y-2">
          {exemptions.map((exemption) => (
            <li
              key={exemption.id}
              className="border-border flex items-start justify-between gap-2 rounded-xl border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-highlighted">
                  FY{String(exemption.fiscalYear).slice(-2)} Q{exemption.fiscalQuarter} ·{" "}
                  {exemptionTypeLabel(exemption.type)}
                </p>
                {exemption.type === "team_holiday" ? (
                  <p className={agencyWorkMetaClass}>Team-wide</p>
                ) : null}
              </div>
              {canEdit && exemption.type !== "team_holiday" ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Remove exemption"
                  onClick={() => onRemove(exemption.id)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={agencyWorkMetaClass}>No exemptions for this member.</p>
      )}
    </div>
  );
}
