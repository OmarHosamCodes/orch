import type { workspaceTeamRoleSchema } from "@orch/workspace";
import type { z } from "zod";
import { create } from "zustand";
import { toast } from "sonner";

import { getQueryClient } from "@/lib/query-client";
import { teamDetailQueryKey, teamListQueryKey } from "@/features/team/team-queries";
import { orpcClient } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";
export { deriveTeamPermissions } from "@/features/team/team-permissions";

type TeamRole = z.infer<typeof workspaceTeamRoleSchema>;

type TeamMember = {
  teamId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  role: TeamRole;
  joinedAt: string;
  updatedAt: string;
};

type TeamSummary = {
  id: string;
  name: string;
  image: string | null;
  role: TeamRole;
  createdByUserId: string;
  updatedAt: string;
};

type TeamDetail = TeamSummary & {
  members: TeamMember[];
};

type TeamStoreState = {
  selectedTeamId: string;
  isTeamAsideCompact: boolean;
  teamNameDraft: string;
  memberEmail: string;
  memberRole: TeamRole;
  createTeamPending: boolean;
  setSelectedTeamId: (teamId: string) => void;
  setIsTeamAsideCompact: (compact: boolean) => void;
  setTeamNameDraft: (name: string) => void;
  setMemberEmail: (email: string) => void;
  setMemberRole: (role: TeamRole) => void;
  syncSelectedTeam: (teams: TeamSummary[]) => void;
  syncTeamNameDraft: (name: string | undefined) => void;
  createTeam: (name: string) => Promise<void>;
  saveTeamName: (teamId: string, name: string) => Promise<void>;
  saveTeamImage: (teamId: string, image: string) => Promise<void>;
  deleteSelectedTeam: (teamId: string, workspaceRefetch: () => Promise<unknown>) => Promise<void>;
  addTeamMember: (teamId: string) => Promise<void>;
  updateMemberRole: (teamId: string, userId: string, role: TeamRole) => Promise<void>;
  removeMember: (
    teamId: string,
    userId: string,
    workspaceRefetch: () => Promise<unknown>,
  ) => Promise<void>;
  seatInviteTeamId: string | null;
  clearSeatInvite: () => void;
};

const SEAT_REQUIRED_MESSAGE = "Every member needs a seat. Add a seat to invite them.";

function getOrpcErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const direct = (error as { data?: { code?: string } }).data?.code;
  if (direct) {
    return direct;
  }

  return (error as { error?: { data?: { code?: string } } }).error?.data?.code;
}

function createPendingMemberId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `pending-${crypto.randomUUID()}`;
  }

  return `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function refreshTeamData(teamId: string) {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: teamListQueryKey() }),
    teamId
      ? queryClient.invalidateQueries({ queryKey: teamDetailQueryKey(teamId) })
      : Promise.resolve(),
  ]);
}

export const useTeamStore = create<TeamStoreState>((set, get) => ({
  selectedTeamId: "",
  isTeamAsideCompact: true,
  teamNameDraft: "",
  memberEmail: "",
  memberRole: "viewer",
  createTeamPending: false,
  seatInviteTeamId: null,

  setSelectedTeamId: (teamId) => set({ selectedTeamId: teamId }),
  clearSeatInvite: () => set({ seatInviteTeamId: null }),
  setIsTeamAsideCompact: (compact) => set({ isTeamAsideCompact: compact }),
  setTeamNameDraft: (name) => set({ teamNameDraft: name }),
  setMemberEmail: (email) => set({ memberEmail: email }),
  setMemberRole: (role) => set({ memberRole: role }),

  syncSelectedTeam: (teams) => {
    const { selectedTeamId } = get();
    if (selectedTeamId && teams.some((team) => team.id === selectedTeamId)) {
      return;
    }
    set({ selectedTeamId: teams[0]?.id ?? "" });
  },

  syncTeamNameDraft: (name) => set({ teamNameDraft: name ?? "" }),

  createTeam: async (name) => {
    const teamName = name.trim();
    if (!teamName) return;

    set({ createTeamPending: true });
    try {
      const created = await orpcClient.team.create({ name: teamName });
      if (created?.id) {
        set({ selectedTeamId: created.id });
      }
      await refreshTeamData(created?.id ?? get().selectedTeamId);
      toast.success("Team created", { description: `Created ${teamName}.` });
    } catch (error) {
      toast.error("Failed to create team", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      set({ createTeamPending: false });
    }
  },

  saveTeamName: async (teamId, name) => {
    const trimmed = name.trim();
    if (!teamId || !trimmed) return;

    const queryClient = getQueryClient();
    const detailKey = teamDetailQueryKey(teamId);
    const listKey = teamListQueryKey();
    const previousTeamDetail = queryClient.getQueryData<TeamDetail>(detailKey);
    const previousTeamList = queryClient.getQueryData<{ items: TeamSummary[] }>(listKey);

    queryClient.setQueryData<TeamDetail | undefined>(detailKey, (current) =>
      current ? { ...current, name: trimmed } : current,
    );
    queryClient.setQueryData<{ items: TeamSummary[] } | undefined>(listKey, (current) =>
      current
        ? {
            ...current,
            items: current.items.map((team) =>
              team.id === teamId ? { ...team, name: trimmed } : team,
            ),
          }
        : current,
    );

    try {
      const updatedTeam = await orpcClient.team.update({ teamId, name: trimmed });

      queryClient.setQueryData<TeamDetail | undefined>(detailKey, (current) =>
        current
          ? {
              ...current,
              name: updatedTeam.name,
              image: updatedTeam.image,
              role: updatedTeam.role,
              updatedAt: updatedTeam.updatedAt,
            }
          : current,
      );
      queryClient.setQueryData<{ items: TeamSummary[] } | undefined>(listKey, (current) =>
        current
          ? {
              ...current,
              items: current.items.map((team) =>
                team.id === updatedTeam.id ? { ...team, ...updatedTeam } : team,
              ),
            }
          : current,
      );

      toast.success("Team updated", { description: "Team name saved." });
    } catch (error) {
      if (previousTeamDetail) {
        queryClient.setQueryData(detailKey, previousTeamDetail);
      }
      if (previousTeamList) {
        queryClient.setQueryData(listKey, previousTeamList);
      }
      toast.error("Failed to update team", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      await refreshTeamData(teamId);
    }
  },

  saveTeamImage: async (teamId, image) => {
    if (!teamId || !image) return;

    const queryClient = getQueryClient();
    const detailKey = teamDetailQueryKey(teamId);
    const listKey = teamListQueryKey();
    const previousTeamDetail = queryClient.getQueryData<TeamDetail>(detailKey);
    const previousTeamList = queryClient.getQueryData<{ items: TeamSummary[] }>(listKey);

    queryClient.setQueryData<TeamDetail | undefined>(detailKey, (current) =>
      current ? { ...current, image } : current,
    );
    queryClient.setQueryData<{ items: TeamSummary[] } | undefined>(listKey, (current) =>
      current
        ? {
            ...current,
            items: current.items.map((team) => (team.id === teamId ? { ...team, image } : team)),
          }
        : current,
    );

    try {
      const updatedTeam = await orpcClient.team.update({ teamId, image });

      queryClient.setQueryData<TeamDetail | undefined>(detailKey, (current) =>
        current
          ? {
              ...current,
              name: updatedTeam.name,
              image: updatedTeam.image,
              role: updatedTeam.role,
              updatedAt: updatedTeam.updatedAt,
            }
          : current,
      );
      queryClient.setQueryData<{ items: TeamSummary[] } | undefined>(listKey, (current) =>
        current
          ? {
              ...current,
              items: current.items.map((team) =>
                team.id === updatedTeam.id ? { ...team, ...updatedTeam } : team,
              ),
            }
          : current,
      );

      toast.success("Profile updated", { description: "Agency profile image saved." });
    } catch (error) {
      if (previousTeamDetail) {
        queryClient.setQueryData(detailKey, previousTeamDetail);
      }
      if (previousTeamList) {
        queryClient.setQueryData(listKey, previousTeamList);
      }
      toast.error("Couldn't update profile image", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      await refreshTeamData(teamId);
    }
  },

  deleteSelectedTeam: async (teamId, workspaceRefetch) => {
    if (!teamId) return;

    try {
      await orpcClient.team.delete({ teamId });
      await Promise.all([refreshTeamData(""), workspaceRefetch()]);
      toast.success("Team deleted", {
        description: "Shared nodes were detached from this team.",
      });
    } catch (error) {
      toast.error("Failed to delete team", {
        description: getErrorMessage(error, "Please try again."),
      });
    }
  },

  addTeamMember: async (teamId) => {
    const { memberEmail, memberRole } = get();
    const userEmail = memberEmail.trim();
    if (!teamId || !userEmail) return;

    const queryClient = getQueryClient();
    const detailKey = teamDetailQueryKey(teamId);
    const previousTeamDetail = queryClient.getQueryData<TeamDetail>(detailKey);
    const pendingMemberId = createPendingMemberId();
    const timestamp = new Date().toISOString();
    const optimisticMember: TeamMember = {
      teamId,
      userId: pendingMemberId,
      userName: userEmail.split("@")[0] || userEmail,
      userEmail,
      userAvatar: null,
      role: memberRole,
      joinedAt: timestamp,
      updatedAt: timestamp,
    };

    queryClient.setQueryData<TeamDetail | undefined>(detailKey, (current) =>
      current ? { ...current, members: [...current.members, optimisticMember] } : current,
    );

    try {
      const addedMember = await orpcClient.team.members.add({
        teamId,
        userEmail,
        role: memberRole,
      });

      queryClient.setQueryData<TeamDetail | undefined>(detailKey, (current) => {
        if (!current) return current;

        const replacedMembers = current.members.map((member) =>
          member.userId === pendingMemberId ? addedMember : member,
        );
        const hasRealMember = replacedMembers.some(
          (member) => member.userId === addedMember.userId,
        );

        return {
          ...current,
          members: hasRealMember ? replacedMembers : [...replacedMembers, addedMember],
        };
      });

      set({ memberEmail: "", memberRole: "viewer" });
      toast.success("Member added", {
        description: `${userEmail} has been added to the team.`,
      });
    } catch (error) {
      if (previousTeamDetail) {
        queryClient.setQueryData(detailKey, previousTeamDetail);
      }

      if (getOrpcErrorCode(error) === "seat_required") {
        toast.error("Add a seat", { description: SEAT_REQUIRED_MESSAGE });
        set({ seatInviteTeamId: teamId });
        return;
      }

      toast.error("Failed to add member", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      await refreshTeamData(teamId);
    }
  },

  updateMemberRole: async (teamId, userId, role) => {
    if (!teamId) return;

    const queryClient = getQueryClient();
    const detailKey = teamDetailQueryKey(teamId);
    const previousTeamDetail = queryClient.getQueryData<TeamDetail>(detailKey);

    queryClient.setQueryData<TeamDetail | undefined>(detailKey, (current) =>
      current
        ? {
            ...current,
            members: current.members.map((member) =>
              member.userId === userId ? { ...member, role } : member,
            ),
          }
        : current,
    );

    try {
      await orpcClient.team.members.updateRole({ teamId, userId, role });
      toast.success("Role updated", { description: "Member role has been updated." });
    } catch (error) {
      if (previousTeamDetail) {
        queryClient.setQueryData(detailKey, previousTeamDetail);
      }
      toast.error("Failed to update role", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      await refreshTeamData(teamId);
    }
  },

  removeMember: async (teamId, userId, workspaceRefetch) => {
    if (!teamId) return;

    const queryClient = getQueryClient();
    const detailKey = teamDetailQueryKey(teamId);
    const previousTeamDetail = queryClient.getQueryData<TeamDetail>(detailKey);

    queryClient.setQueryData<TeamDetail | undefined>(detailKey, (current) =>
      current
        ? {
            ...current,
            members: current.members.filter((member) => member.userId !== userId),
          }
        : current,
    );

    try {
      await orpcClient.team.members.remove({ teamId, userId });
      toast.success("Member removed", { description: "Member access has been revoked." });
    } catch (error) {
      if (previousTeamDetail) {
        queryClient.setQueryData(detailKey, previousTeamDetail);
      }
      toast.error("Failed to remove member", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      await Promise.all([refreshTeamData(teamId), workspaceRefetch()]);
    }
  },
}));
