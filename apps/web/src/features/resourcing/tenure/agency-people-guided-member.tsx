import { ArrowLeft, Check, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

import { AgencyDateField } from "@/features/shared/date/agency-date-field";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import {
  agencyFocusRingClass,
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyPanelClass,
  agencyWorkMetaClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { SurfaceShimmer } from "@/ui/skeleton";
import { Textarea } from "@/ui/textarea";

import type { PeopleConfigStepId } from "./people-config-completion";
import { PeopleConfigProgress } from "./people-config-progress";
import {
  AgencyPeopleExemptions,
  type PeopleExemptionDraft,
  type PeopleExemptionItem,
} from "./agency-people-exemptions";

export type PeopleGuidedHrDraft = {
  status: "active" | "inactive";
  departmentId: string;
  employmentType: "" | "full_time" | "part_time" | "contractor" | "intern";
  workModel: "" | "onsite" | "hybrid" | "remote";
  gender: "" | "male" | "female";
  dateOfBirth: string;
  phone: string;
  address: string;
  linkedinUrl: string;
  offAllowanceDays: string;
  leaveAllowancePeriod: "year" | "quarter" | "month";
};

type PeopleGuidedDepartmentOption = {
  id: string;
  name: string;
};

export type PeopleGuidedRateDraft = {
  costRate: string;
  billableRate: string;
  currency: string;
  effectiveFrom: string;
};

export type PeopleGuidedTenureDraft = {
  internStart: string;
  internEnd: string;
  internCountsTowardTenure: boolean;
  internExemptFromQuarterMin: boolean;
  notes: string;
};

type PeopleGuidedStep = {
  id: PeopleConfigStepId;
  label: string;
  done: boolean;
};

type AgencyPeopleGuidedMemberProps = {
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  userId: string;
  role: "owner" | "editor" | "viewer";
  joinedLabel: string;
  completionPercent: number;
  steps: readonly PeopleGuidedStep[];
  activeStepId: PeopleConfigStepId;
  onActiveStepChange: (stepId: PeopleConfigStepId) => void;
  onBack: () => void;
  onOpenProfile: () => void;
  canEditHr: boolean;
  canEditRates: boolean;
  canEditTenure: boolean;
  canEditRole: boolean;
  departments: readonly PeopleGuidedDepartmentOption[];
  hrDraft: PeopleGuidedHrDraft;
  onHrDraftChange: (draft: PeopleGuidedHrDraft) => void;
  rateDraft: PeopleGuidedRateDraft;
  onRateDraftChange: (draft: PeopleGuidedRateDraft) => void;
  tenureDraft: PeopleGuidedTenureDraft;
  onTenureDraftChange: (draft: PeopleGuidedTenureDraft) => void;
  onRoleChange: (role: "owner" | "editor" | "viewer") => void;
  exemptions: PeopleExemptionItem[];
  exemptionDraft: PeopleExemptionDraft;
  onExemptionDraftChange: (draft: PeopleExemptionDraft) => void;
  savingExemption: boolean;
  onAddExemption: () => Promise<void>;
  onRemoveExemption: (exemptionId: string) => void;
  saving: boolean;
  onSaveStep: () => void;
  onPrevious: () => void;
  onNext: () => void;
  stepIndex: number;
  stepCount: number;
  isLoading: boolean;
};

function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

export function AgencyPeopleGuidedMember({
  userName,
  userEmail,
  userAvatar,
  userId,
  role,
  joinedLabel,
  completionPercent,
  steps,
  activeStepId,
  onActiveStepChange,
  onBack,
  onOpenProfile,
  canEditHr,
  canEditRates,
  canEditTenure,
  canEditRole,
  departments,
  hrDraft,
  onHrDraftChange,
  rateDraft,
  onRateDraftChange,
  tenureDraft,
  onTenureDraftChange,
  onRoleChange,
  exemptions,
  exemptionDraft,
  onExemptionDraftChange,
  savingExemption,
  onAddExemption,
  onRemoveExemption,
  saving,
  onSaveStep,
  onPrevious,
  onNext,
  stepIndex,
  stepCount,
  isLoading,
}: AgencyPeopleGuidedMemberProps) {
  const canEditActive =
    activeStepId === "identity" || activeStepId === "employment" || activeStepId === "leave"
      ? canEditHr
      : activeStepId === "rates"
        ? canEditRates
        : activeStepId === "tenure"
          ? canEditTenure
          : canEditRole;

  return (
    <section className="space-y-5" data-testid="people-guided-member">
      <header className="flex flex-col gap-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted hover:text-highlighted w-fit gap-1.5 px-2"
          onClick={onBack}
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to people
        </Button>
        <div className="flex flex-wrap items-center gap-4">
          <AgencyMemberAvatar
            name={userName}
            userId={userId}
            avatarUrl={userAvatar}
            size="md"
            alt={userName}
            className="size-14 rounded-2xl"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight text-highlighted text-balance">
              {userName || "Member"}
            </h1>
            <p className={cn(agencyWorkMetaClass, "mt-0.5")}>
              {userEmail || "Loading…"} · joined {joinedLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={onOpenProfile}
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              Open profile
            </Button>
            <div className="min-w-[10rem] space-y-1.5">
              <p className="text-muted text-xs">
                <span className="font-mono tabular-nums text-highlighted">
                  {completionPercent}%
                </span>{" "}
                configured
              </p>
              <PeopleConfigProgress
                value={completionPercent}
                label="Member configuration progress"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[14.5rem_minmax(0,1fr)]">
        <aside className={cn(agencyPanelClass, "h-fit space-y-1 p-2.5 sm:p-3")}>
          <p className="text-muted px-2 pb-1.5 text-xs font-medium">Steps</p>
          <nav aria-label="Member configuration steps" className="space-y-0.5">
            {steps.map((step, index) => {
              const active = step.id === activeStepId;
              return (
                <button
                  key={step.id}
                  type="button"
                  aria-current={active ? "step" : undefined}
                  onClick={() => onActiveStepChange(step.id)}
                  className={cn(
                    agencyFocusRingClass,
                    "flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-sm",
                    "transition-colors duration-150 ease-out",
                    active
                      ? "bg-sidebar-primary/10 text-sidebar-primary"
                      : "text-muted hover:bg-elevated hover:text-highlighted",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold tabular-nums",
                      step.done ? "bg-elevated text-highlighted" : "bg-elevated text-muted",
                      active && step.done && "bg-sidebar-primary/15 text-sidebar-primary",
                    )}
                  >
                    {step.done ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">{step.label}</span>
                    <span className="text-muted block text-xs">
                      {step.done ? "Ready" : "Needs review"}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className={cn(agencyPanelClass, "space-y-5 p-5 sm:p-6")}>
          {isLoading ? (
            <SurfaceShimmer className="min-h-48" label="Loading member configuration" />
          ) : (
            <>
              {activeStepId === "identity" ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-highlighted">Identity</h3>
                    <p className="text-muted text-sm">
                      Account identity is read-only. Contact fields save to the HR profile.
                    </p>
                  </div>
                  <FieldGrid>
                    <div className={agencyFormFieldClass}>
                      <Label className={agencyFormLabelClass}>Name</Label>
                      <Input value={userName} readOnly />
                    </div>
                    <div className={agencyFormFieldClass}>
                      <Label className={agencyFormLabelClass}>Email</Label>
                      <Input value={userEmail} readOnly />
                    </div>
                    <div className={agencyFormFieldClass}>
                      <Label className={agencyFormLabelClass} htmlFor="people-hr-phone">
                        Phone
                      </Label>
                      <Input
                        id="people-hr-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={hrDraft.phone}
                        disabled={!canEditHr}
                        onChange={(event) =>
                          onHrDraftChange({ ...hrDraft, phone: event.target.value })
                        }
                      />
                    </div>
                    <div className={cn(agencyFormFieldClass, "sm:col-span-2")}>
                      <Label className={agencyFormLabelClass} htmlFor="people-hr-address">
                        Address
                      </Label>
                      <Input
                        id="people-hr-address"
                        value={hrDraft.address}
                        disabled={!canEditHr}
                        onChange={(event) =>
                          onHrDraftChange({ ...hrDraft, address: event.target.value })
                        }
                      />
                    </div>
                    <div className={agencyFormFieldClass}>
                      <Label className={agencyFormLabelClass} htmlFor="people-hr-dob">
                        Date of birth
                      </Label>
                      <AgencyDateField
                        id="people-hr-dob"
                        value={hrDraft.dateOfBirth}
                        disabled={!canEditHr}
                        onChange={(value) => onHrDraftChange({ ...hrDraft, dateOfBirth: value })}
                        aria-label="Date of birth"
                      />
                    </div>
                    <div className={agencyFormFieldClass}>
                      <Label className={agencyFormLabelClass} htmlFor="people-hr-gender">
                        Gender
                      </Label>
                      <Select
                        value={hrDraft.gender || "none"}
                        disabled={!canEditHr}
                        onValueChange={(value) =>
                          onHrDraftChange({
                            ...hrDraft,
                            gender: value === "male" || value === "female" ? value : "",
                          })
                        }
                      >
                        <SelectTrigger id="people-hr-gender" className="w-full">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className={cn(agencyFormFieldClass, "sm:col-span-2")}>
                      <Label className={agencyFormLabelClass} htmlFor="people-hr-linkedin">
                        LinkedIn URL
                      </Label>
                      <Input
                        id="people-hr-linkedin"
                        type="url"
                        inputMode="url"
                        autoComplete="url"
                        value={hrDraft.linkedinUrl}
                        disabled={!canEditHr}
                        onChange={(event) =>
                          onHrDraftChange({ ...hrDraft, linkedinUrl: event.target.value })
                        }
                      />
                    </div>
                  </FieldGrid>
                </div>
              ) : null}

              {activeStepId === "employment" ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-highlighted">Employment</h3>
                    <p className="text-muted text-sm">
                      Status, department, employment type, and work model.
                    </p>
                  </div>
                  <FieldGrid>
                    <div className={agencyFormFieldClass}>
                      <Label className={agencyFormLabelClass} htmlFor="people-hr-status">
                        Status
                      </Label>
                      <Select
                        value={hrDraft.status}
                        disabled={!canEditHr}
                        onValueChange={(value) =>
                          onHrDraftChange({
                            ...hrDraft,
                            status: value === "inactive" ? "inactive" : "active",
                          })
                        }
                      >
                        <SelectTrigger id="people-hr-status" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className={agencyFormFieldClass}>
                      <Label className={agencyFormLabelClass} htmlFor="people-hr-department">
                        Department
                      </Label>
                      <Select
                        value={hrDraft.departmentId || "none"}
                        disabled={!canEditHr}
                        onValueChange={(value) =>
                          onHrDraftChange({
                            ...hrDraft,
                            departmentId: value === "none" ? "" : value,
                          })
                        }
                      >
                        <SelectTrigger id="people-hr-department" className="w-full">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {departments.map((department) => (
                            <SelectItem key={department.id} value={department.id}>
                              {department.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className={agencyFormFieldClass}>
                      <Label className={agencyFormLabelClass} htmlFor="people-hr-employment-type">
                        Employment type
                      </Label>
                      <Select
                        value={hrDraft.employmentType || "none"}
                        disabled={!canEditHr}
                        onValueChange={(value) =>
                          onHrDraftChange({
                            ...hrDraft,
                            employmentType:
                              value === "full_time" ||
                              value === "part_time" ||
                              value === "contractor" ||
                              value === "intern"
                                ? value
                                : "",
                          })
                        }
                      >
                        <SelectTrigger id="people-hr-employment-type" className="w-full">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          <SelectItem value="full_time">Full time</SelectItem>
                          <SelectItem value="part_time">Part time</SelectItem>
                          <SelectItem value="contractor">Contractor</SelectItem>
                          <SelectItem value="intern">Intern</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className={agencyFormFieldClass}>
                      <Label className={agencyFormLabelClass} htmlFor="people-hr-work-model">
                        Work model
                      </Label>
                      <Select
                        value={hrDraft.workModel || "none"}
                        disabled={!canEditHr}
                        onValueChange={(value) =>
                          onHrDraftChange({
                            ...hrDraft,
                            workModel:
                              value === "onsite" || value === "hybrid" || value === "remote"
                                ? value
                                : "",
                          })
                        }
                      >
                        <SelectTrigger id="people-hr-work-model" className="w-full">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          <SelectItem value="onsite">Onsite</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                          <SelectItem value="remote">Remote</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </FieldGrid>
                </div>
              ) : null}

              {activeStepId === "leave" ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-highlighted">Off days</h3>
                    <p className="text-muted text-sm">Off days allowed per period.</p>
                  </div>
                  <FieldGrid>
                    <div className={agencyFormFieldClass}>
                      <Label className={agencyFormLabelClass} htmlFor="people-hr-off-days">
                        Allowance
                      </Label>
                      <Input
                        id="people-hr-off-days"
                        type="number"
                        min={0}
                        value={hrDraft.offAllowanceDays}
                        disabled={!canEditHr}
                        onChange={(event) =>
                          onHrDraftChange({ ...hrDraft, offAllowanceDays: event.target.value })
                        }
                      />
                    </div>
                    <div className={agencyFormFieldClass}>
                      <Label className={agencyFormLabelClass} htmlFor="people-hr-off-period">
                        Period
                      </Label>
                      <Select
                        value={hrDraft.leaveAllowancePeriod}
                        disabled={!canEditHr}
                        onValueChange={(value) =>
                          onHrDraftChange({
                            ...hrDraft,
                            leaveAllowancePeriod:
                              value === "quarter" || value === "month" ? value : "year",
                          })
                        }
                      >
                        <SelectTrigger id="people-hr-off-period" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="year">Year</SelectItem>
                          <SelectItem value="quarter">Quarter</SelectItem>
                          <SelectItem value="month">Month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </FieldGrid>
                </div>
              ) : null}

              {activeStepId === "rates" ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-highlighted">Rates</h3>
                    <p className="text-muted text-sm">
                      Internal cost and default billable rate for this member.
                    </p>
                  </div>
                  <FieldGrid>
                    <div className={agencyFormFieldClass}>
                      <Label className={agencyFormLabelClass} htmlFor="people-rate-cost">
                        Cost rate
                      </Label>
                      <Input
                        id="people-rate-cost"
                        type="number"
                        min={0}
                        step="0.01"
                        value={rateDraft.costRate}
                        disabled={!canEditRates}
                        onChange={(event) =>
                          onRateDraftChange({ ...rateDraft, costRate: event.target.value })
                        }
                      />
                    </div>
                    <div className={agencyFormFieldClass}>
                      <Label className={agencyFormLabelClass} htmlFor="people-rate-billable">
                        Billable rate
                      </Label>
                      <Input
                        id="people-rate-billable"
                        type="number"
                        min={0}
                        step="0.01"
                        value={rateDraft.billableRate}
                        disabled={!canEditRates}
                        onChange={(event) =>
                          onRateDraftChange({ ...rateDraft, billableRate: event.target.value })
                        }
                      />
                    </div>
                    <div className={agencyFormFieldClass}>
                      <Label className={agencyFormLabelClass} htmlFor="people-rate-currency">
                        Currency
                      </Label>
                      <Select
                        value={rateDraft.currency}
                        disabled={!canEditRates}
                        onValueChange={(value) =>
                          onRateDraftChange({ ...rateDraft, currency: value })
                        }
                      >
                        <SelectTrigger id="people-rate-currency" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EGP">EGP</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="CAD">CAD</SelectItem>
                          <SelectItem value="SAR">SAR</SelectItem>
                          <SelectItem value="AED">AED</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className={agencyFormFieldClass}>
                      <Label className={agencyFormLabelClass} htmlFor="people-rate-effective">
                        Effective from
                      </Label>
                      <AgencyDateField
                        id="people-rate-effective"
                        value={rateDraft.effectiveFrom}
                        disabled={!canEditRates}
                        onChange={(value) =>
                          onRateDraftChange({ ...rateDraft, effectiveFrom: value })
                        }
                        aria-label="Effective from"
                      />
                    </div>
                  </FieldGrid>
                </div>
              ) : null}

              {activeStepId === "tenure" ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-highlighted">Intern & tenure</h3>
                    <p className="text-muted text-sm">
                      Intern window and how it affects tenure and quarterly minimums.
                    </p>
                  </div>
                  <FieldGrid>
                    <div className={agencyFormFieldClass}>
                      <Label className={agencyFormLabelClass} htmlFor="people-tenure-intern-start">
                        Intern start
                      </Label>
                      <AgencyDateField
                        id="people-tenure-intern-start"
                        value={tenureDraft.internStart}
                        disabled={!canEditTenure}
                        onChange={(value) =>
                          onTenureDraftChange({ ...tenureDraft, internStart: value })
                        }
                        aria-label="Intern start"
                      />
                    </div>
                    <div className={agencyFormFieldClass}>
                      <Label className={agencyFormLabelClass} htmlFor="people-tenure-intern-end">
                        Intern end
                      </Label>
                      <AgencyDateField
                        id="people-tenure-intern-end"
                        value={tenureDraft.internEnd}
                        disabled={!canEditTenure}
                        onChange={(value) =>
                          onTenureDraftChange({ ...tenureDraft, internEnd: value })
                        }
                        aria-label="Intern end"
                      />
                    </div>
                    <Label className="flex items-center gap-2 text-sm font-semibold text-muted sm:col-span-2">
                      <Checkbox
                        checked={tenureDraft.internCountsTowardTenure}
                        disabled={!canEditTenure}
                        onCheckedChange={(checked) =>
                          onTenureDraftChange({
                            ...tenureDraft,
                            internCountsTowardTenure: checked === true,
                          })
                        }
                        aria-label="Intern period counts toward tenure"
                      />
                      <span>Intern period counts toward tenure</span>
                    </Label>
                    <Label className="flex items-center gap-2 text-sm font-semibold text-muted sm:col-span-2">
                      <Checkbox
                        checked={tenureDraft.internExemptFromQuarterMin}
                        disabled={!canEditTenure}
                        onCheckedChange={(checked) =>
                          onTenureDraftChange({
                            ...tenureDraft,
                            internExemptFromQuarterMin: checked === true,
                          })
                        }
                        aria-label="Exempt from quarterly minimum"
                      />
                      <span>Exempt from quarterly minimum</span>
                    </Label>
                    <div className={cn(agencyFormFieldClass, "sm:col-span-2")}>
                      <Label className={agencyFormLabelClass} htmlFor="people-tenure-notes">
                        Notes
                      </Label>
                      <Textarea
                        id="people-tenure-notes"
                        value={tenureDraft.notes}
                        disabled={!canEditTenure}
                        onChange={(event) =>
                          onTenureDraftChange({ ...tenureDraft, notes: event.target.value })
                        }
                      />
                    </div>
                  </FieldGrid>
                  <AgencyPeopleExemptions
                    exemptions={exemptions}
                    draft={exemptionDraft}
                    onDraftChange={onExemptionDraftChange}
                    canEdit={canEditTenure}
                    saving={savingExemption}
                    onAdd={onAddExemption}
                    onRemove={onRemoveExemption}
                  />
                </div>
              ) : null}

              {activeStepId === "access" ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-highlighted">Access</h3>
                    <p className="text-muted text-sm">Team role for Agency management surfaces.</p>
                  </div>
                  <div className={agencyFormFieldClass}>
                    <Label className={agencyFormLabelClass} htmlFor="people-access-role">
                      Team role
                    </Label>
                    <Select
                      value={role}
                      disabled={!canEditRole}
                      onValueChange={(value) =>
                        onRoleChange(
                          value === "owner" || value === "editor" || value === "viewer"
                            ? value
                            : "viewer",
                        )
                      }
                    >
                      <SelectTrigger id="people-access-role" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}

              <footer className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={stepIndex === 0}
                  onClick={onPrevious}
                >
                  Previous
                </Button>
                <span className="text-muted font-mono text-xs">
                  {stepIndex + 1} / {stepCount}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canEditActive || saving}
                    onClick={onSaveStep}
                  >
                    {saving ? "Saving…" : "Save step"}
                  </Button>
                  <Button type="button" size="sm" onClick={onNext}>
                    {stepIndex >= stepCount - 1 ? "Done" : "Next step"}
                  </Button>
                </div>
              </footer>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
