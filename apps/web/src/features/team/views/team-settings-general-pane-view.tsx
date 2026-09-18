import { Loader2, Trash2 } from "lucide-react";

import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import {
  AgencySettingsField,
  AgencySettingsPaneSection,
} from "@/features/shared/views/agency-settings-pane-section";
import { AgencyMarkGlyph } from "@/features/team/team-avatar-glyphs";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

type TeamSettingsGeneralPaneViewProps = {
  teamName: string;
  teamInitial: string;
  teamAvatarUrl: string | null;
  teamPresetGlyph: "beam" | "orbit" | "initial";
  canManage: boolean;
  canDelete: boolean;
  nameDraft: string;
  nameDirty: boolean;
  savingName: boolean;
  uploadingImage: boolean;
  confirmDelete: boolean;
  deletingTeam: boolean;
  onNameDraftChange: (value: string) => void;
  onSaveName: () => void;
  onPickImage: () => void;
  onRequestDeleteTeam: () => void;
  onCancelDeleteTeam: () => void;
  onDeleteTeam: () => void;
};

export function TeamSettingsGeneralPaneView({
  teamName,
  teamInitial,
  teamAvatarUrl,
  teamPresetGlyph,
  canManage,
  canDelete,
  nameDraft,
  nameDirty,
  savingName,
  uploadingImage,
  confirmDelete,
  deletingTeam,
  onNameDraftChange,
  onSaveName,
  onPickImage,
  onRequestDeleteTeam,
  onCancelDeleteTeam,
  onDeleteTeam,
}: TeamSettingsGeneralPaneViewProps) {
  return (
    <div className="flex flex-col gap-8">
      <AgencySettingsPaneSection
        title="Identity"
        description="Shown in the workspace switcher across Orch."
      >
        <div className="flex flex-wrap items-start gap-4">
          <Avatar size="lg" className="size-16 rounded-xl after:rounded-xl">
            {teamAvatarUrl ? (
              <AvatarImage src={teamAvatarUrl} alt="" className="rounded-xl object-cover" />
            ) : (
              <AgencyMarkGlyph
                glyph={teamPresetGlyph ?? "initial"}
                initial={teamInitial}
                className="absolute inset-0 size-full rounded-xl"
              />
            )}
            <AvatarFallback className="rounded-xl text-lg font-semibold">
              {teamInitial}
            </AvatarFallback>
          </Avatar>
          {canManage ? (
            <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-fit"
                disabled={uploadingImage}
                onClick={onPickImage}
              >
                {uploadingImage ? <Loader2 className="size-4 animate-spin" /> : null}
                Change mark
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Square mark, 256×256 px recommended.
              </p>
            </div>
          ) : null}
        </div>

        <AgencySettingsField
          label="Agency name"
          htmlFor="team-name"
          hint={canManage ? "Press Enter to save when you change the name." : undefined}
          className="mt-6 max-w-md"
        >
          {canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="team-name"
                value={nameDraft || teamName}
                placeholder="Agency name"
                className={cn("min-w-[12rem] flex-1", shellFocusRingClass)}
                onChange={(e) => onNameDraftChange(e.target.value)}
                onFocus={() => {
                  if (!nameDraft) onNameDraftChange(teamName);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && nameDirty) onSaveName();
                }}
              />
              {nameDirty ? (
                <Button size="sm" disabled={savingName} onClick={onSaveName}>
                  {savingName ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-foreground">{teamName}</p>
          )}
        </AgencySettingsField>
      </AgencySettingsPaneSection>

      {canDelete ? (
        <AgencySettingsPaneSection title="Danger zone">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Permanently delete {teamName} and detach all shared Canvas nodes. This cannot be
              undone.
            </p>
            {confirmDelete ? (
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={deletingTeam}
                  onClick={onDeleteTeam}
                >
                  {deletingTeam ? <Loader2 className="size-4 animate-spin" /> : null}
                  Confirm delete
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={deletingTeam}
                  onClick={onCancelDeleteTeam}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 text-destructive hover:text-destructive"
                onClick={onRequestDeleteTeam}
              >
                <Trash2 className="size-4" />
                Delete agency
              </Button>
            )}
          </div>
        </AgencySettingsPaneSection>
      ) : null}
    </div>
  );
}
