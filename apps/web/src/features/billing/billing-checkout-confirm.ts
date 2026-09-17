export function shouldRunBillingCheckoutConfirm(
  checkoutId: string | undefined,
  confirmedCheckoutId: string | null,
): checkoutId is string {
  return Boolean(checkoutId) && confirmedCheckoutId !== checkoutId;
}
