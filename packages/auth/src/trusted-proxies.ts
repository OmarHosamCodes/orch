/**
 * Reverse-proxy hops Better Auth may skip when reading X-Forwarded-For.
 *
 * Production sits behind Cloudflare, then Railway's private edge. Railway
 * appends its hop, so a two-value X-Forwarded-For is unresolvable unless those
 * hops are trusted. Prefer `cf-connecting-ip` when the origin forwards it.
 *
 * Cloudflare ranges: https://www.cloudflare.com/ips/
 */
export const AUTH_IP_ADDRESS_HEADERS = [
  "cf-connecting-ip",
  "x-real-ip",
  "x-forwarded-for",
] as const;

export const AUTH_TRUSTED_PROXY_CIDRS = [
  "127.0.0.1/32",
  "::1/128",
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "fc00::/7",
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
] as const;
