import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "@/lib/navigation";
import { authClient } from "@/lib/auth-client";
import { safeRedirectPath } from "@/lib/safe-redirect-path";

export function useLoginPage() {
  const session = authClient.useSession();
  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get("error");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const [lastUsedEmail, setLastUsedEmail] = useState<string | null>(null);
  const redirectTo = safeRedirectPath(searchParams.get("redirect"));

  useEffect(() => {
    const controller = new AbortController();
    void authClient
      .$fetch<{ email: string | null }>("/remembered-account", {
        signal: controller.signal,
      })
      .then(({ data }) => {
        if (!controller.signal.aborted) setLastUsedEmail(data?.email ?? null);
      })
      .catch(() => {
        // Account recall is optional; Google authentication remains available.
      });
    return () => controller.abort();
  }, []);

  async function handleGoogleSignIn(emailHint: string | null = null) {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      const loginUrl = new URL("/login", window.location.origin);
      loginUrl.searchParams.set("redirect", redirectTo);
      const result = await authClient.signIn.social({
        provider: "google",
        loginHint: emailHint ?? undefined,
        callbackURL: new URL(redirectTo, window.location.origin).href,
        errorCallbackURL: loginUrl.href,
      });
      if (!result.error) return;
    } catch {
      // Transport and provider failures share the recovery action below.
    }
    setError("We couldn't sign you in with Google. Try again.");
    submitting.current = false;
    setPending(false);
  }

  return {
    session,
    redirectTo,
    error: error ?? (oauthError ? "We couldn't sign you in. Try again." : null),
    pending,
    lastUsedEmail,
    handleGoogleSignIn,
  };
}
