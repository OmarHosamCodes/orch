import { findInvalidTrustedProxies, getIp } from "@better-auth/core/utils/ip";
import { describe, expect, test } from "bun:test";

import { AUTH_IP_ADDRESS_HEADERS, AUTH_TRUSTED_PROXY_CIDRS } from "./trusted-proxies";

const options = {
  advanced: {
    ipAddress: {
      ipAddressHeaders: [...AUTH_IP_ADDRESS_HEADERS],
      trustedProxies: [...AUTH_TRUSTED_PROXY_CIDRS],
    },
  },
};

describe("auth trusted proxies", () => {
  test("CIDRs are valid Better Auth trusted-proxy entries", () => {
    expect(findInvalidTrustedProxies([...AUTH_TRUSTED_PROXY_CIDRS])).toEqual([]);
  });

  test("resolves the client when Railway appends a private hop", () => {
    expect(getIp(new Headers({ "x-forwarded-for": "203.0.113.10, 10.8.0.2" }), options)).toBe(
      "203.0.113.10",
    );
  });

  test("skips Cloudflare then Railway hops", () => {
    expect(
      getIp(
        new Headers({
          "x-forwarded-for": "203.0.113.10, 108.162.192.1, fd12:5c69:15e:1::1",
        }),
        options,
      ),
    ).toBe("203.0.113.10");
  });

  test("prefers cf-connecting-ip when present", () => {
    expect(
      getIp(
        new Headers({
          "cf-connecting-ip": "198.51.100.20",
          "x-forwarded-for": "203.0.113.10, 10.8.0.2",
        }),
        options,
      ),
    ).toBe("198.51.100.20");
  });
});
