import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/dialog";
import { SurfaceShimmer } from "@/ui/skeleton";

import { AgencyPeopleDepartments } from "./agency-people-departments";
import { AgencyPeopleDirectory } from "./agency-people-directory";
import { AgencyPeopleGuidedMember } from "./agency-people-guided-member";
import { AgencySettingsAlertPolicy } from "./agency-settings-alert-policy";
import { AgencySettingsTenurePolicy } from "./agency-settings-tenure-policy";
import { type AgencySettingsTenurePaneViewModel } from "./hooks/use-agency-settings-tenure-pane";

export function AgencySettingsTenurePaneView({
  viewModel,
}: {
  viewModel: AgencySettingsTenurePaneViewModel;
}) {
  if (viewModel.isLoading) {
    return <SurfaceShimmer className="min-h-[28rem]" label="Loading people" />;
  }

  return (
    <div className="space-y-6">
      {viewModel.selectedUserId ? (
        <AgencyPeopleGuidedMember
          userId={viewModel.selectedUserId}
          userName={viewModel.selectedMemberName}
          userEmail={viewModel.selectedMemberEmail}
          userAvatar={viewModel.selectedMemberAvatar}
          role={viewModel.roleDraft}
          joinedLabel={viewModel.selectedJoinedLabel}
          completionPercent={viewModel.guidedCompletionPercent}
          steps={viewModel.guidedSteps}
          activeStepId={viewModel.activeStepId}
          onActiveStepChange={viewModel.setActiveStepId}
          onBack={viewModel.clearSelectedMember}
          onOpenProfile={() => viewModel.openProfile(viewModel.selectedUserId!)}
          canEditHr={viewModel.canEditHr}
          canEditRates={viewModel.isOwner}
          canEditTenure={viewModel.isOwner}
          canEditRole={viewModel.isOwner}
          departments={viewModel.departments}
          hrDraft={viewModel.hrDraft}
          onHrDraftChange={viewModel.setHrDraft}
          rateDraft={viewModel.rateDraft}
          onRateDraftChange={viewModel.setRateDraft}
          tenureDraft={viewModel.tenureDraft}
          onTenureDraftChange={viewModel.setTenureDraft}
          onRoleChange={viewModel.setRoleDraft}
          exemptions={viewModel.memberExemptions}
          exemptionDraft={viewModel.exemptionDraft}
          onExemptionDraftChange={viewModel.setExemptionDraft}
          savingExemption={viewModel.savingExemption}
          onAddExemption={() => viewModel.addExemption()}
          onRemoveExemption={(exemptionId) => void viewModel.removeExemption(exemptionId)}
          saving={viewModel.savingStep}
          onSaveStep={() => void viewModel.saveActiveStep()}
          onPrevious={viewModel.goPreviousStep}
          onNext={() => void viewModel.goNextStep()}
          stepIndex={viewModel.stepIndex}
          stepCount={viewModel.stepCount}
          isLoading={viewModel.loadingSelected}
        />
      ) : (
        <AgencyPeopleDirectory
          policyEnabled={viewModel.policyEnabled}
          policyEffectiveLabel={viewModel.policyEffectiveLabel}
          quarterlyMinHours={viewModel.quarterlyMinHours}
          monthlyMinHours={viewModel.monthlyMinHours}
          requiredDailyHours={viewModel.requiredDailyHours}
          offDayReduceHours={viewModel.offDayReduceHours}
          weekStartLabel={viewModel.weekStartLabel}
          departmentCount={viewModel.departmentCount}
          memberCount={viewModel.memberCount}
          attentionCount={viewModel.attentionCount}
          cards={viewModel.directoryCards}
          canReviewDefaults
          onReviewDefaults={() => viewModel.setDefaultsOpen(true)}
          onSelectMember={viewModel.selectMember}
          onOpenProfile={viewModel.openProfile}
          canInvitePeople={viewModel.canInvitePeople}
          onInvitePeople={viewModel.onInvitePeople}
          isLoadError={viewModel.isSummaryError}
          isStaleLoadError={viewModel.isSummaryStaleError}
          loadErrorMessage={viewModel.summaryErrorMessage}
          onRetryLoad={viewModel.retrySummary}
        />
      )}

      <Dialog open={viewModel.defaultsOpen} onOpenChange={viewModel.setDefaultsOpen}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="border-border border-b px-6 py-4">
            <DialogTitle>Team defaults</DialogTitle>
            <DialogDescription>
              Work schedule, tenure policy, profile alerts, and department catalog for the team.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(70vh,36rem)] space-y-8 overflow-y-auto px-6 py-5">
            <AgencyPeopleDepartments
              departments={viewModel.departments}
              assignedDepartmentIds={viewModel.assignedDepartmentIds}
              canEdit={viewModel.isOwner}
              onCreate={viewModel.addDepartment}
              onRename={viewModel.renameDepartment}
              onDelete={viewModel.removeDepartment}
            />
            <AgencySettingsTenurePolicy
              policyDraft={viewModel.policyDraft}
              onPolicyDraftChange={viewModel.setPolicyDraft}
              isOwner={viewModel.isOwner}
              fiscalYearPreview={viewModel.fiscalYearPreview}
              saving={viewModel.savingPolicy}
              onSave={() => void viewModel.savePolicy()}
              embedded
            />
            <AgencySettingsAlertPolicy
              policyDraft={viewModel.alertPolicyDraft}
              onPolicyDraftChange={viewModel.setAlertPolicyDraft}
              isOwner={viewModel.isOwner}
              saving={viewModel.savingAlertPolicy}
              onSave={() => void viewModel.saveAlertPolicy()}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
