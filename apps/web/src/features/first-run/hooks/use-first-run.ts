import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  FIRST_RUN_PRIMER_COUNT,
  firstRunContinueLabel,
  firstRunCreateCopy,
  firstRunJoinCopy,
  firstRunPrimerAt,
  firstRunProgressLabel,
  firstRunProgressRatio,
} from "@/features/first-run/first-run-copy";
import { useFirstRunStore } from "@/features/first-run/stores/first-run";
import { useNavigate } from "@/lib/navigation";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";

const ACTION_STEP = FIRST_RUN_PRIMER_COUNT;

export function useFirstRun() {
  const navigate = useNavigate();
  const firstRunQuery = useQuery(orpc.onboarding.get.queryOptions());
  const creating = useFirstRunStore((state) => state.creating);
  const completing = useFirstRunStore((state) => state.completing);
  const actionError = useFirstRunStore((state) => state.actionError);
  const createAgency = useFirstRunStore((state) => state.createAgency);
  const complete = useFirstRunStore((state) => state.complete);
  const clearActionError = useFirstRunStore((state) => state.clearActionError);

  const session = firstRunQuery.data;
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [presetId, setPresetId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.defaultAgencyName) return;
    setName((current) => (current.trim().length === 0 ? session.defaultAgencyName : current));
  }, [session?.defaultAgencyName]);

  const primer = firstRunPrimerAt(step);
  const onAction = step >= ACTION_STEP;
  const pending = creating || completing;
  const loadError = firstRunQuery.isError
    ? getErrorMessage(firstRunQuery.error, "Couldn't open first-run.")
    : null;
  const showMark = onAction && session?.status === "create";

  async function finishTo(href: string) {
    await navigate(href, { replace: true });
  }

  async function handleCreate() {
    const firstRun = await createAgency(name, { presetId, logoFile });
    if (firstRun?.status === "done") {
      await finishTo("/agency");
    }
  }

  async function handleJoin() {
    const firstRun = await complete();
    if (firstRun?.status === "done") {
      await finishTo("/agency");
    }
  }

  async function handleSkipCreate() {
    const firstRun = await complete();
    if (firstRun?.status === "done") {
      await finishTo("/canvas");
    }
  }

  function pickLogo() {
    const inputEl = document.createElement("input");
    inputEl.type = "file";
    inputEl.accept = "image/*";
    inputEl.addEventListener("change", () => {
      const file = inputEl.files?.[0];
      if (!file) return;
      setLogoFile(file);
      setLogoPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return URL.createObjectURL(file);
      });
    });
    inputEl.click();
  }

  function clearLogo() {
    setLogoFile(null);
    setLogoPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
  }

  const createCopy = firstRunCreateCopy(session?.defaultAgencyName ?? "Agency");
  const joinCopy = session?.joinTeam ? firstRunJoinCopy(session.joinTeam.name) : null;

  return {
    loading: firstRunQuery.isPending,
    loadError,
    onAction,
    frame: primer.frame,
    title: onAction
      ? session?.status === "join"
        ? (joinCopy?.title ?? "Your agency is ready")
        : createCopy.title
      : primer.title,
    body: onAction
      ? session?.status === "join"
        ? (joinCopy?.body ?? "")
        : createCopy.body
      : primer.body,
    progressLabel: onAction ? null : firstRunProgressLabel(step),
    progressRatio: firstRunProgressRatio(step, onAction),
    continueLabel: firstRunContinueLabel(step),
    skipTourLabel: "Skip",
    backLabel: "Back",
    canGoBack: step > 0,
    name,
    presetId,
    logoPreviewUrl,
    errorMessage: actionError,
    pending,
    pendingLabel:
      session?.status === "join"
        ? (joinCopy?.pendingLabel ?? createCopy.pendingLabel)
        : createCopy.pendingLabel,
    submitLabel:
      session?.status === "join"
        ? (joinCopy?.submitLabel ?? "Open agency")
        : createCopy.submitLabel,
    skipCreateLabel: session?.status === "create" ? createCopy.skipLabel : null,
    showMark,
    submitDisabled: pending || (showMark && name.trim().length === 0),
    onContinue: () => {
      clearActionError();
      setStep((current) => Math.min(current + 1, ACTION_STEP));
    },
    onSkipTour: () => {
      clearActionError();
      setStep(ACTION_STEP);
    },
    onBack: () => {
      clearActionError();
      setStep((current) => Math.max(current - 1, 0));
    },
    onNameChange: (value: string) => {
      clearActionError();
      setName(value);
    },
    onPresetChange: setPresetId,
    onPickLogo: pickLogo,
    onClearLogo: clearLogo,
    onSubmit: () => {
      if (!onAction) {
        setStep((current) => Math.min(current + 1, ACTION_STEP));
        return;
      }
      if (session?.status === "join") {
        void handleJoin();
        return;
      }
      void handleCreate();
    },
    onSkipCreate: session?.status === "create" ? () => void handleSkipCreate() : null,
  };
}
