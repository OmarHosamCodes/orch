import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@/lib/navigation";
import { toast } from "sonner";

import { withAgencySyncQueryOptions } from "@/features/shared/agency-query-options";
import { useAgencyOpsStore } from "@/features/shared/stores/agency-ops";
import { useAgencyMemberProfileStore } from "@/features/member-profile/stores/agency-member-profile";
import type { FiscalMonth } from "@/features/resourcing/tenure-utils";
import { useTeamStore } from "@/features/team/team-store";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";

import { emptyAlertPolicyDraft, type AlertPolicyDraft } from "../agency-settings-alert-policy";
import type { TenurePolicyDraft } from "../agency-settings-tenure-policy";
import type {
  PeopleGuidedHrDraft,
  PeopleGuidedRateDraft,
  PeopleGuidedTenureDraft,
} from "../agency-people-guided-member";
import type { PeopleDirectoryCard } from "../agency-people-directory";
import type { PeopleExemptionDraft } from "../agency-people-exemptions";
import {
  createAgencyDepartment,
  deleteAgencyDepartment,
  updateAgencyDepartment,
  type AgencyDepartmentOption,
} from "../agency-departments";
import {
  PEOPLE_CONFIG_STEP_IDS,
  PEOPLE_CONFIG_STEP_LABELS,
  peopleConfigBadge,
  peopleConfigCompletionPercent,
  peopleConfigStepDone,
  peopleDirectoryAttentionCount,
  peopleDirectoryListSignals,
  type PeopleConfigSignals,
  type PeopleConfigStepId,
} from "../people-config-completion";

export type UseAgencySettingsTenurePaneProps = {
  teamId: string;
  active: boolean;
};

export type AgencySettingsTenurePaneViewModel = ReturnType<typeof useAgencySettingsTenurePane>;

function dateKeyToUtcIso(dateKey: string): string {
  return `${dateKey}T00:00:00.000Z`;
}

function normalizeGenderDraft(value: string | null | undefined): "" | "male" | "female" {
  const key = value?.trim().toLowerCase() ?? "";
  if (key === "male" || key === "female") return key;
  return "";
}

function emptyHrDraft(): PeopleGuidedHrDraft {
  return {
    status: "active",
    departmentId: "",
    employmentType: "",
    workModel: "",
    gender: "",
    dateOfBirth: "",
    phone: "",
    address: "",
    linkedinUrl: "",
    offAllowanceDays: "15",
    leaveAllowancePeriod: "year",
  };
}

function emptyRateDraft(): PeopleGuidedRateDraft {
  return {
    costRate: "",
    billableRate: "",
    currency: "USD",
    effectiveFrom: new Date().toISOString().slice(0, 10),
  };
}

function emptyTenureDraft(): PeopleGuidedTenureDraft {
  return {
    internStart: "",
    internEnd: "",
    internCountsTowardTenure: false,
    internExemptFromQuarterMin: true,
    notes: "",
  };
}

function emptyExemptionDraft(): PeopleExemptionDraft {
  return {
    type: "member_waiver",
    fiscalYear: String(new Date().getUTCFullYear()),
    fiscalQuarter: "1",
    userId: "",
    reducedMinHours: "",
    frozenMonth: 1,
    reason: "",
  };
}

function profileRange() {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const to = now.toISOString();
  return { from, to, utcOffsetMinutes: now.getTimezoneOffset() };
}

export function useAgencySettingsTenurePane({ teamId, active }: UseAgencySettingsTenurePaneProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const upsertRate = useAgencyOpsStore((state) => state.upsertRate);
  const upsertHrProfile = useAgencyMemberProfileStore((state) => state.upsertHrProfile);
  const hrPending = useAgencyMemberProfileStore((state) => state.hrPending);
  const updateMemberRole = useTeamStore((state) => state.updateMemberRole);
  const requestAgencySettings = useTeamStore((state) => state.requestAgencySettings);

  const teamQuery = useQuery({
    ...orpc.team.get.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId) && active,
  });

  const isOwner = teamQuery.data?.role === "owner";
  const canEditHr = teamQuery.data?.role === "owner" || teamQuery.data?.role === "editor";

  const policyQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.tenure.policy.get.queryOptions({ input: { teamId } }),
        enabled: Boolean(teamId) && active,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  const alertPolicyQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.memberProfile.alertPolicy.get.queryOptions({ input: { teamId } }),
        enabled: Boolean(teamId) && active,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  const summaryQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.tenure.summary.list.queryOptions({ input: { teamId } }),
        enabled: Boolean(teamId) && active,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  const exemptionsQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.tenure.exemptions.list.queryOptions({ input: { teamId } }),
        enabled: Boolean(teamId) && active,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  const ratesQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.rates.list.queryOptions({ input: { teamId } }),
        enabled: Boolean(teamId) && active,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  const departmentsQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.departments.list.queryOptions({ input: { teamId } }),
        enabled: Boolean(teamId) && active,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  const policy = policyQuery.data?.policy ?? null;
  const members = summaryQuery.data?.items ?? [];
  const policyEnabled = summaryQuery.data?.policyEnabled ?? false;
  const isSummaryError = summaryQuery.isError && !summaryQuery.data;
  const isSummaryStaleError = summaryQuery.isError && Boolean(summaryQuery.data);
  const summaryErrorMessage = getErrorMessage(
    summaryQuery.error,
    "People directory could not be loaded.",
  );
  const exemptions = exemptionsQuery.data?.items ?? [];
  const rates = ratesQuery.data?.items ?? [];
  const teamMembers = teamQuery.data?.members ?? [];
  const serverDepartments = useMemo<AgencyDepartmentOption[]>(
    () =>
      (departmentsQuery.data?.items ?? []).map((item) => ({
        id: item.id,
        name: item.name,
      })),
    [departmentsQuery.data?.items],
  );
  const [localDepartments, setLocalDepartments] = useState<AgencyDepartmentOption[] | null>(null);
  const departments = localDepartments ?? serverDepartments;

  useEffect(() => {
    setLocalDepartments(null);
  }, [teamId]);

  useEffect(() => {
    if (!localDepartments) return;
    if (localDepartments.some((item) => item.id.startsWith("optimistic-department-"))) return;
    if (localDepartments.length !== serverDepartments.length) return;
    const serverById = new Map(serverDepartments.map((item) => [item.id, item.name]));
    const matches = localDepartments.every((item) => serverById.get(item.id) === item.name);
    if (matches) setLocalDepartments(null);
  }, [localDepartments, serverDepartments]);

  const [policyDraft, setPolicyDraft] = useState<TenurePolicyDraft>({
    fiscalYearStartMonth: 1,
    fiscalYearStartDay: "1",
    quarterlyMinHours: "525",
    monthlyMinHours: "200",
    penaltyMonths: "6",
    internDurationMonths: "4",
    internDurationWeeks: "0",
    requiredDailyHours: "8",
    offDayReduceHours: "8",
    weekStartsOn: "1",
    weekendDurationDays: "2",
    policyEffectiveFrom: new Date().toISOString().slice(0, 10),
    enabled: false,
  });

  useEffect(() => {
    if (!policy) return;
    setPolicyDraft({
      fiscalYearStartMonth: policy.fiscalYearStartMonth as FiscalMonth,
      fiscalYearStartDay: String(policy.fiscalYearStartDay),
      quarterlyMinHours: String(policy.quarterlyMinHours),
      monthlyMinHours: String(policy.monthlyMinHours),
      penaltyMonths: String(policy.penaltyMonths),
      internDurationMonths: String(policy.internDurationMonths),
      internDurationWeeks: String(policy.internDurationWeeks),
      requiredDailyHours: String(policy.requiredDailyHours),
      offDayReduceHours: String(policy.offDayReduceHours),
      weekStartsOn: String(policy.weekStartsOn),
      weekendDurationDays: String(policy.weekendDurationDays),
      policyEffectiveFrom: policy.policyEffectiveFrom.slice(0, 10),
      enabled: policy.enabled,
    });
  }, [policy]);

  const [alertPolicyDraft, setAlertPolicyDraft] = useState<AlertPolicyDraft>(emptyAlertPolicyDraft);
  const alertPolicy = alertPolicyQuery.data?.policy ?? null;

  useEffect(() => {
    if (!alertPolicy) return;
    setAlertPolicyDraft({
      abnormalDayEnabled: alertPolicy.abnormalDayEnabled,
      abnormalDayExtraHours: String(alertPolicy.abnormalDayExtraHours),
      monthPaceEnabled: alertPolicy.monthPaceEnabled,
      monthPacePercent: String(alertPolicy.monthPacePercent),
      quarterPaceEnabled: alertPolicy.quarterPaceEnabled,
      quarterPacePercent: String(alertPolicy.quarterPacePercent),
      wasteSpikeEnabled: alertPolicy.wasteSpikeEnabled,
      wasteSpikePercent: String(alertPolicy.wasteSpikePercent),
    });
  }, [alertPolicy]);

  const savePolicyMutation = useMutation(orpc.agencyOps.tenure.policy.upsert.mutationOptions());
  const saveAlertPolicyMutation = useMutation(
    orpc.agencyOps.memberProfile.alertPolicy.upsert.mutationOptions(),
  );
  const saveProfileMutation = useMutation(orpc.agencyOps.tenure.profiles.upsert.mutationOptions());
  const saveExemptionMutation = useMutation(
    orpc.agencyOps.tenure.exemptions.upsert.mutationOptions(),
  );
  const deleteExemptionMutation = useMutation(
    orpc.agencyOps.tenure.exemptions.delete.mutationOptions(),
  );
  const [savingRate, setSavingRate] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [exemptionDraft, setExemptionDraft] = useState<PeopleExemptionDraft>(emptyExemptionDraft);

  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeStepId, setActiveStepId] = useState<PeopleConfigStepId>("identity");

  const range = useMemo(() => profileRange(), []);

  const memberProfileQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.memberProfile.get.queryOptions({
          input: {
            teamId,
            userId: selectedUserId ?? "",
            from: range.from,
            to: range.to,
            utcOffsetMinutes: range.utcOffsetMinutes,
          },
        }),
        enabled: Boolean(teamId && selectedUserId && active),
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  const memberDetailQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.tenure.member.get.queryOptions({
          input: { teamId, userId: selectedUserId ?? "" },
        }),
        enabled: Boolean(teamId && selectedUserId && active),
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  const memberProfile = memberProfileQuery.data ?? null;
  const memberDetail = memberDetailQuery.data?.member ?? null;

  const [hrDraft, setHrDraft] = useState<PeopleGuidedHrDraft>(emptyHrDraft);
  const [rateDraft, setRateDraft] = useState<PeopleGuidedRateDraft>(emptyRateDraft);
  const [tenureDraft, setTenureDraft] = useState<PeopleGuidedTenureDraft>(emptyTenureDraft);
  const [roleDraft, setRoleDraft] = useState<"owner" | "editor" | "viewer">("viewer");

  useEffect(() => {
    if (!memberProfile) return;
    const hr = memberProfile.hrProfile;
    setHrDraft({
      status: hr.status,
      departmentId: hr.departmentId ?? "",
      employmentType: hr.employmentType ?? "",
      workModel: hr.workModel ?? "",
      gender: normalizeGenderDraft(hr.gender),
      dateOfBirth: hr.dateOfBirth ?? "",
      phone: hr.phone ?? "",
      address: hr.address ?? "",
      linkedinUrl: hr.linkedinUrl ?? "",
      offAllowanceDays: String(hr.offAllowanceDays),
      leaveAllowancePeriod: hr.leaveAllowancePeriod ?? "year",
    });
    setRoleDraft(memberProfile.role);
  }, [memberProfile]);

  useEffect(() => {
    if (!selectedUserId) return;
    const rate = rates.find((item) => item.userId === selectedUserId);
    if (!rate) {
      setRateDraft(emptyRateDraft());
      return;
    }
    setRateDraft({
      costRate: rate.costRateAmount != null ? (rate.costRateAmount / 100).toFixed(2) : "",
      billableRate:
        rate.billableRateAmount != null ? (rate.billableRateAmount / 100).toFixed(2) : "",
      currency: rate.currency || "USD",
      effectiveFrom: rate.effectiveFrom?.slice(0, 10) ?? emptyRateDraft().effectiveFrom,
    });
  }, [rates, selectedUserId]);

  useEffect(() => {
    if (!memberDetail) return;
    setTenureDraft({
      internStart: memberDetail.internStart?.slice(0, 10) ?? "",
      internEnd: memberDetail.internEnd?.slice(0, 10) ?? "",
      internCountsTowardTenure: memberDetail.internCountsTowardTenure,
      internExemptFromQuarterMin: memberDetail.internExemptFromQuarterMin,
      notes: memberDetail.notes ?? "",
    });
  }, [memberDetail]);

  const rateByUserId = useMemo(() => {
    return new Map(rates.map((rate) => [rate.userId, rate]));
  }, [rates]);

  const avatarByUserId = useMemo(() => {
    return new Map(teamMembers.map((member) => [member.userId, member.userAvatar ?? null]));
  }, [teamMembers]);

  const exemptionUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const exemption of exemptions) {
      if (exemption.userId) ids.add(exemption.userId);
    }
    return ids;
  }, [exemptions]);

  const assignedDepartmentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const member of members) {
      if (member.departmentId) ids.add(member.departmentId);
    }
    return ids;
  }, [members]);

  const memberExemptions = useMemo(() => {
    if (!selectedUserId) return [];
    return exemptions.filter(
      (exemption) => exemption.type === "team_holiday" || exemption.userId === selectedUserId,
    );
  }, [exemptions, selectedUserId]);

  const { directoryCards, attentionCount } = useMemo(() => {
    const signalsList: PeopleConfigSignals[] = [];
    const cards: PeopleDirectoryCard[] = members.map((member) => {
      const rate = rateByUserId.get(member.userId);
      const hasActiveExemption = exemptionUserIds.has(member.userId);
      const hasExplicitInternOverride =
        !member.internDerived && Boolean(member.internStart || member.internEnd);
      const signals = peopleDirectoryListSignals({
        hasEmploymentType: Boolean(member.employmentType),
        hasWorkModel: Boolean(member.workModel),
        hasContact: member.hasContact,
        hasRate: rate?.billableRateAmount != null || rate?.costRateAmount != null,
        tenureAwaitingFirstEntry: member.awaitingFirstEntry,
        hasTenureOverride: hasExplicitInternOverride,
        hasActiveExemption,
        employmentStatus: member.status,
      });
      signalsList.push(signals);
      const rateLabel =
        rate?.billableRateAmount != null
          ? `${rate.currency} ${(rate.billableRateAmount / 100).toFixed(0)}/h`
          : "No rate";
      const quarterLabel = member.currentQuarter?.status.replaceAll("_", " ") ?? "no quarter";
      const tenureLabel = member.netTenureLabel || "Tenure pending";
      return {
        userId: member.userId,
        userName: member.userName,
        userEmail: member.userEmail,
        userAvatar: avatarByUserId.get(member.userId) ?? null,
        subtitle: member.departmentName ? `${member.departmentName} · ${tenureLabel}` : tenureLabel,
        detail: `${rateLabel} · ${quarterLabel}`,
        completionPercent: peopleConfigCompletionPercent(signals),
        badge: peopleConfigBadge(signals),
      };
    });
    return {
      directoryCards: cards,
      attentionCount: peopleDirectoryAttentionCount(signalsList),
    };
  }, [avatarByUserId, exemptionUserIds, members, rateByUserId]);

  const selectedSignals: PeopleConfigSignals = useMemo(() => {
    const summary = members.find((member) => member.userId === selectedUserId);
    const hr = memberProfile?.hrProfile;
    // Prefer live detail when loaded so opening a card matches list math for the same fields.
    const hasEmploymentType = hr ? Boolean(hr.employmentType) : Boolean(summary?.employmentType);
    const hasWorkModel = hr ? Boolean(hr.workModel) : Boolean(summary?.workModel);
    const hasContact = hr
      ? Boolean(hr.phone?.trim() || hr.address?.trim())
      : Boolean(summary?.hasContact);
    const hasExplicitInternOverride = memberDetail
      ? !memberDetail.internDerived && Boolean(memberDetail.internStart || memberDetail.internEnd)
      : Boolean(summary && !summary.internDerived && (summary.internStart || summary.internEnd));
    return {
      hasEmploymentType,
      hasWorkModel,
      hasContact,
      hasRate: (() => {
        if (!selectedUserId) return false;
        const rate = rateByUserId.get(selectedUserId);
        return rate?.billableRateAmount != null || rate?.costRateAmount != null;
      })(),
      tenureAwaitingFirstEntry: summary?.awaitingFirstEntry ?? false,
      hasTenureOverride: hasExplicitInternOverride,
      hasActiveExemption: Boolean(selectedUserId && exemptionUserIds.has(selectedUserId)),
      employmentStatus: hr?.status ?? summary?.status ?? null,
    };
  }, [exemptionUserIds, memberDetail, memberProfile, members, rateByUserId, selectedUserId]);

  const guidedSteps = useMemo(() => {
    const done = peopleConfigStepDone(selectedSignals);
    return PEOPLE_CONFIG_STEP_IDS.map((id) => ({
      id,
      label: PEOPLE_CONFIG_STEP_LABELS[id],
      done: done[id],
    }));
  }, [selectedSignals]);

  const guidedCompletionPercent = peopleConfigCompletionPercent(selectedSignals);
  const stepIndex = PEOPLE_CONFIG_STEP_IDS.indexOf(activeStepId);

  async function invalidatePeopleQueries() {
    if (!teamId) return;
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.tenure.policy.get.key({ input: { teamId } }),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.memberProfile.alertPolicy.get.key({ input: { teamId } }),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.tenure.summary.list.key({ input: { teamId } }),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.tenure.exemptions.list.key({ input: { teamId } }),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.rates.list.key({ input: { teamId } }),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.departments.list.key({ input: { teamId } }),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.team.get.key({ input: { teamId } }),
      }),
    ]);
    if (selectedUserId) {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orpc.agencyOps.tenure.member.get.key({
            input: { teamId, userId: selectedUserId },
          }),
        }),
        queryClient.invalidateQueries({
          queryKey: orpc.agencyOps.memberProfile.get.key({
            input: {
              teamId,
              userId: selectedUserId,
              from: range.from,
              to: range.to,
              utcOffsetMinutes: range.utcOffsetMinutes,
            },
          }),
        }),
      ]);
    }
  }

  async function savePolicy() {
    if (!teamId || !isOwner) return;
    try {
      await savePolicyMutation.mutateAsync({
        teamId,
        fiscalYearStartMonth: policyDraft.fiscalYearStartMonth,
        fiscalYearStartDay: Number.parseInt(policyDraft.fiscalYearStartDay, 10),
        quarterlyMinHours: Number.parseInt(policyDraft.quarterlyMinHours, 10),
        monthlyMinHours: Number.parseInt(policyDraft.monthlyMinHours, 10),
        penaltyMonths: Number.parseInt(policyDraft.penaltyMonths, 10),
        internDurationMonths: Number.parseInt(policyDraft.internDurationMonths, 10),
        internDurationWeeks: Number.parseInt(policyDraft.internDurationWeeks, 10),
        requiredDailyHours: Number.parseInt(policyDraft.requiredDailyHours, 10),
        offDayReduceHours: Number.parseFloat(policyDraft.offDayReduceHours),
        weekStartsOn: Number.parseInt(policyDraft.weekStartsOn, 10),
        weekendDurationDays: Number.parseInt(policyDraft.weekendDurationDays, 10),
        policyEffectiveFrom: dateKeyToUtcIso(policyDraft.policyEffectiveFrom),
        enabled: policyDraft.enabled,
      });
      await invalidatePeopleQueries();
      toast.success("Team defaults saved");
      setDefaultsOpen(false);
    } catch (error) {
      toast.error("Couldn't save defaults", {
        description: getErrorMessage(error, "Try again."),
      });
    }
  }

  async function saveAlertPolicy() {
    if (!teamId || !isOwner) return;
    try {
      await saveAlertPolicyMutation.mutateAsync({
        teamId,
        abnormalDayEnabled: alertPolicyDraft.abnormalDayEnabled,
        abnormalDayExtraHours: Number.parseInt(alertPolicyDraft.abnormalDayExtraHours, 10),
        monthPaceEnabled: alertPolicyDraft.monthPaceEnabled,
        monthPacePercent: Number.parseInt(alertPolicyDraft.monthPacePercent, 10),
        quarterPaceEnabled: alertPolicyDraft.quarterPaceEnabled,
        quarterPacePercent: Number.parseInt(alertPolicyDraft.quarterPacePercent, 10),
        wasteSpikeEnabled: alertPolicyDraft.wasteSpikeEnabled,
        wasteSpikePercent: Number.parseInt(alertPolicyDraft.wasteSpikePercent, 10),
      });
      await queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.memberProfile.alertPolicy.get.key({ input: { teamId } }),
      });
      toast.success("Profile alerts saved");
    } catch (error) {
      toast.error("Couldn't save profile alerts", {
        description: getErrorMessage(error, "Try again."),
      });
    }
  }

  async function saveHrStep() {
    if (!teamId || !selectedUserId || !canEditHr) return;
    await upsertHrProfile({
      teamId,
      userId: selectedUserId,
      status: hrDraft.status,
      departmentId: hrDraft.departmentId || null,
      employmentType: hrDraft.employmentType || null,
      workModel: hrDraft.workModel || null,
      gender: normalizeGenderDraft(hrDraft.gender) || null,
      dateOfBirth: hrDraft.dateOfBirth || null,
      phone: hrDraft.phone.trim() || null,
      address: hrDraft.address.trim() || null,
      linkedinUrl: hrDraft.linkedinUrl.trim() || null,
      offAllowanceDays: Number.parseInt(hrDraft.offAllowanceDays, 10) || 0,
      leaveAllowancePeriod: hrDraft.leaveAllowancePeriod,
    });
    await invalidatePeopleQueries();
    toast.success("HR profile saved");
  }

  function addDepartment(name: string) {
    if (!teamId || !isOwner) return Promise.resolve();
    const trimmed = name.trim();
    if (!trimmed) return Promise.resolve();
    const tempId = `optimistic-department-${Date.now().toString(36)}`;
    const previous = departments;
    setLocalDepartments(
      [...previous, { id: tempId, name: trimmed }].sort((a, b) => a.name.localeCompare(b.name)),
    );
    return createAgencyDepartment(teamId, trimmed)
      .then((created) => {
        setLocalDepartments((current) =>
          (current ?? previous)
            .map((item) => (item.id === tempId ? { id: created.id, name: created.name } : item))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        toast.success("Department added");
      })
      .catch((error) => {
        setLocalDepartments(previous);
        toast.error("Couldn't add department", {
          description: getErrorMessage(error, "Try again."),
        });
        throw error;
      });
  }

  function renameDepartment(departmentId: string, name: string) {
    if (!teamId || !isOwner) return Promise.resolve();
    const trimmed = name.trim();
    if (!trimmed) return Promise.resolve();
    const previous = departments;
    setLocalDepartments(
      previous
        .map((item) => (item.id === departmentId ? { ...item, name: trimmed } : item))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
    return updateAgencyDepartment(teamId, departmentId, trimmed)
      .then((updated) => {
        setLocalDepartments((current) =>
          (current ?? previous)
            .map((item) =>
              item.id === departmentId ? { id: updated.id, name: updated.name } : item,
            )
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        toast.success("Department renamed");
      })
      .catch((error) => {
        setLocalDepartments(previous);
        toast.error("Couldn't rename department", {
          description: getErrorMessage(error, "Try again."),
        });
        throw error;
      });
  }

  function removeDepartment(departmentId: string) {
    if (!teamId || !isOwner) return Promise.resolve();
    const previous = departments;
    setLocalDepartments(previous.filter((item) => item.id !== departmentId));
    return deleteAgencyDepartment(teamId, departmentId)
      .then(() => {
        toast.success("Department deleted");
      })
      .catch((error) => {
        setLocalDepartments(previous);
        toast.error("Couldn't delete department", {
          description: getErrorMessage(error, "Try again."),
        });
        throw error;
      });
  }

  async function saveRateStep() {
    if (!teamId || !selectedUserId || !isOwner) return;
    const cost = Number.parseFloat(rateDraft.costRate);
    const billable = Number.parseFloat(rateDraft.billableRate);
    if (!Number.isFinite(cost) || !Number.isFinite(billable)) {
      throw new Error("Enter valid rates");
    }
    setSavingRate(true);
    try {
      await upsertRate({
        teamId,
        userId: selectedUserId,
        costRateAmount: Math.round(cost * 100),
        billableRateAmount: Math.round(billable * 100),
        currency: rateDraft.currency,
        effectiveFrom: dateKeyToUtcIso(rateDraft.effectiveFrom),
      });
      await invalidatePeopleQueries();
      toast.success("Rates saved");
    } finally {
      setSavingRate(false);
    }
  }

  async function saveTenureStep() {
    if (!teamId || !selectedUserId || !isOwner) return;
    await saveProfileMutation.mutateAsync({
      teamId,
      userId: selectedUserId,
      internStart: tenureDraft.internStart ? dateKeyToUtcIso(tenureDraft.internStart) : null,
      internEnd: tenureDraft.internEnd ? dateKeyToUtcIso(tenureDraft.internEnd) : null,
      internCountsTowardTenure: tenureDraft.internCountsTowardTenure,
      internExemptFromQuarterMin: tenureDraft.internExemptFromQuarterMin,
      notes: tenureDraft.notes.trim() || null,
    });
    await invalidatePeopleQueries();
    toast.success("Tenure profile saved");
  }

  async function saveRoleStep() {
    if (!teamId || !selectedUserId || !isOwner) return;
    setSavingRole(true);
    try {
      await updateMemberRole(teamId, selectedUserId, roleDraft);
      await invalidatePeopleQueries();
      toast.success("Access saved");
    } finally {
      setSavingRole(false);
    }
  }

  async function addExemption() {
    if (!teamId || !isOwner) return;
    try {
      const type = exemptionDraft.type;
      await saveExemptionMutation.mutateAsync({
        teamId,
        type,
        fiscalYear: Number.parseInt(exemptionDraft.fiscalYear, 10),
        fiscalQuarter: Number.parseInt(exemptionDraft.fiscalQuarter, 10) as 1 | 2 | 3 | 4,
        userId: type === "team_holiday" ? null : exemptionDraft.userId || selectedUserId,
        reducedMinHours:
          type === "member_reduced_min"
            ? Number.parseInt(exemptionDraft.reducedMinHours, 10)
            : null,
        frozenMonth: type === "member_frozen_month" ? exemptionDraft.frozenMonth : null,
        reason: exemptionDraft.reason || null,
      });
      await invalidatePeopleQueries();
      toast.success("Exemption saved");
    } catch (error) {
      toast.error("Couldn't save exemption", {
        description: getErrorMessage(error, "Try again."),
      });
      throw error;
    }
  }

  async function removeExemption(exemptionId: string) {
    if (!teamId || !isOwner) return;
    try {
      await deleteExemptionMutation.mutateAsync({ teamId, exemptionId });
      await invalidatePeopleQueries();
      toast.success("Exemption removed");
    } catch (error) {
      toast.error("Couldn't remove exemption", {
        description: getErrorMessage(error, "Try again."),
      });
    }
  }

  function canEditActiveStep(stepId: PeopleConfigStepId): boolean {
    if (stepId === "identity" || stepId === "employment" || stepId === "leave") return canEditHr;
    if (stepId === "rates") return Boolean(isOwner);
    if (stepId === "tenure") return Boolean(isOwner);
    return Boolean(isOwner);
  }

  function isActiveStepDirty(): boolean {
    switch (activeStepId) {
      case "identity":
      case "employment":
      case "leave": {
        if (!memberProfile) return false;
        const hr = memberProfile.hrProfile;
        return (
          hrDraft.status !== hr.status ||
          (hrDraft.departmentId || "") !== (hr.departmentId ?? "") ||
          (hrDraft.employmentType || "") !== (hr.employmentType ?? "") ||
          (hrDraft.workModel || "") !== (hr.workModel ?? "") ||
          hrDraft.gender !== normalizeGenderDraft(hr.gender) ||
          (hrDraft.dateOfBirth || "") !== (hr.dateOfBirth ?? "") ||
          hrDraft.phone.trim() !== (hr.phone ?? "").trim() ||
          hrDraft.address.trim() !== (hr.address ?? "").trim() ||
          hrDraft.linkedinUrl.trim() !== (hr.linkedinUrl ?? "").trim() ||
          hrDraft.offAllowanceDays !== String(hr.offAllowanceDays) ||
          hrDraft.leaveAllowancePeriod !== (hr.leaveAllowancePeriod ?? "year")
        );
      }
      case "rates": {
        if (!selectedUserId) return false;
        const rate = rateByUserId.get(selectedUserId);
        const empty = emptyRateDraft();
        const cost =
          rate?.costRateAmount != null ? (rate.costRateAmount / 100).toFixed(2) : empty.costRate;
        const billable =
          rate?.billableRateAmount != null
            ? (rate.billableRateAmount / 100).toFixed(2)
            : empty.billableRate;
        return (
          rateDraft.costRate !== cost ||
          rateDraft.billableRate !== billable ||
          rateDraft.currency !== (rate?.currency || empty.currency) ||
          rateDraft.effectiveFrom !== (rate?.effectiveFrom?.slice(0, 10) ?? empty.effectiveFrom)
        );
      }
      case "tenure": {
        if (!memberDetail) return false;
        return (
          tenureDraft.internStart !== (memberDetail.internStart?.slice(0, 10) ?? "") ||
          tenureDraft.internEnd !== (memberDetail.internEnd?.slice(0, 10) ?? "") ||
          tenureDraft.internCountsTowardTenure !== memberDetail.internCountsTowardTenure ||
          tenureDraft.internExemptFromQuarterMin !== memberDetail.internExemptFromQuarterMin ||
          tenureDraft.notes.trim() !== (memberDetail.notes ?? "").trim()
        );
      }
      case "access":
        return Boolean(memberProfile && roleDraft !== memberProfile.role);
      default: {
        const _exhaustive: never = activeStepId;
        return _exhaustive;
      }
    }
  }

  async function saveActiveStep(): Promise<boolean> {
    try {
      switch (activeStepId) {
        case "identity":
        case "employment":
        case "leave":
          await saveHrStep();
          break;
        case "rates":
          await saveRateStep();
          break;
        case "tenure":
          await saveTenureStep();
          break;
        case "access":
          await saveRoleStep();
          break;
        default: {
          const _exhaustive: never = activeStepId;
          return _exhaustive;
        }
      }
      return true;
    } catch (error) {
      toast.error("Couldn't save step", {
        description: getErrorMessage(error, "Try again."),
      });
      return false;
    }
  }

  function selectMember(userId: string) {
    setSelectedUserId(userId);
    setActiveStepId("identity");
  }

  function openProfile(userId: string) {
    navigate(`/agency/members/${encodeURIComponent(userId)}`);
  }

  function clearSelectedMember() {
    setSelectedUserId(null);
    setActiveStepId("identity");
  }

  function goPreviousStep() {
    if (stepIndex <= 0) return;
    setActiveStepId(PEOPLE_CONFIG_STEP_IDS[stepIndex - 1]!);
  }

  async function goNextStep() {
    if (canEditActiveStep(activeStepId) && isActiveStepDirty()) {
      const saved = await saveActiveStep();
      if (!saved) return;
    }
    if (stepIndex >= PEOPLE_CONFIG_STEP_IDS.length - 1) {
      clearSelectedMember();
      return;
    }
    setActiveStepId(PEOPLE_CONFIG_STEP_IDS[stepIndex + 1]!);
  }

  const fiscalYearPreview = useMemo(() => {
    const month = policyDraft.fiscalYearStartMonth;
    const day = Number.parseInt(policyDraft.fiscalYearStartDay, 10) || 1;
    const year = new Date().getUTCFullYear();
    const start = new Date(Date.UTC(year, month - 1, day));
    const endExclusive = new Date(Date.UTC(year + 1, month - 1, day));
    endExclusive.setUTCDate(endExclusive.getUTCDate() - 1);
    const fmt = (date: Date) =>
      date.toLocaleDateString(undefined, {
        timeZone: "UTC",
        month: "numeric",
        day: "numeric",
        year: "numeric",
      });
    return `Example fiscal year: ${fmt(start)} – ${fmt(endExclusive)} (UTC).`;
  }, [policyDraft.fiscalYearStartDay, policyDraft.fiscalYearStartMonth]);

  const policyEffectiveLabel = policy
    ? new Date(policy.policyEffectiveFrom).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const selectedJoinedLabel = memberProfile
    ? new Date(memberProfile.joinedAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  const isLoading =
    (policyQuery.isPending || summaryQuery.isPending || teamQuery.isPending) && !isSummaryError;
  const savingStep = hrPending || savingRate || savingRole || saveProfileMutation.isPending;

  const weekStartLabel = (() => {
    const day = policy?.weekStartsOn;
    if (day == null) return null;
    const labels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return labels[day] ?? null;
  })();

  return {
    isLoading,
    isSummaryError,
    isSummaryStaleError,
    summaryErrorMessage,
    retrySummary: () => {
      void summaryQuery.refetch();
      void policyQuery.refetch();
      void teamQuery.refetch();
    },
    isOwner,
    canInvitePeople: isOwner,
    onInvitePeople: isOwner
      ? () => requestAgencySettings({ pane: "members", membersInviteAutofocus: true })
      : undefined,
    canEditHr,
    policyDraft,
    setPolicyDraft,
    fiscalYearPreview,
    savingPolicy: savePolicyMutation.isPending,
    savePolicy,
    alertPolicyDraft,
    setAlertPolicyDraft,
    savingAlertPolicy: saveAlertPolicyMutation.isPending,
    saveAlertPolicy,
    defaultsOpen,
    setDefaultsOpen,
    policyEnabled,
    policyEffectiveLabel,
    quarterlyMinHours: policy?.quarterlyMinHours ?? null,
    monthlyMinHours: policy?.monthlyMinHours ?? null,
    internDurationMonths: policy?.internDurationMonths ?? null,
    requiredDailyHours: policy?.requiredDailyHours ?? null,
    offDayReduceHours: policy?.offDayReduceHours ?? null,
    weekStartLabel,
    departmentCount: departments.length,
    departments,
    assignedDepartmentIds,
    addDepartment,
    renameDepartment,
    removeDepartment,
    directoryCards,
    attentionCount,
    memberCount: members.length,
    selectedUserId,
    selectMember,
    openProfile,
    clearSelectedMember,
    guidedSteps,
    activeStepId,
    setActiveStepId,
    guidedCompletionPercent,
    stepIndex,
    stepCount: PEOPLE_CONFIG_STEP_IDS.length,
    goPreviousStep,
    goNextStep,
    selectedMemberName: memberProfile?.userName ?? "",
    selectedMemberEmail: memberProfile?.email ?? "",
    selectedMemberAvatar: memberProfile?.userAvatar ?? null,
    selectedJoinedLabel,
    loadingSelected:
      Boolean(selectedUserId) && (memberProfileQuery.isPending || memberDetailQuery.isPending),
    hrDraft,
    setHrDraft,
    rateDraft,
    setRateDraft,
    tenureDraft,
    setTenureDraft,
    roleDraft,
    setRoleDraft,
    memberExemptions,
    exemptionDraft,
    setExemptionDraft,
    savingExemption: saveExemptionMutation.isPending,
    addExemption,
    removeExemption,
    savingStep,
    saveActiveStep,
  };
}
