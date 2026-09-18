import { describe, expect, test } from "bun:test";

import {
  assignEntityIconOnWrite,
  matchAgencyEntityIconKey,
  resolveStoredEntityIcon,
} from "./entity-icon-catalog";

describe("matchAgencyEntityIconKey", () => {
  test("matches seed-style English titles from the leftmost keyword", () => {
    expect(matchAgencyEntityIconKey("Design new homepage mockups")).toBe("palette");
    expect(matchAgencyEntityIconKey("QA pass")).toBe("bug");
    expect(matchAgencyEntityIconKey("Stakeholder sync")).toBe("users");
    expect(matchAgencyEntityIconKey("Campaign kickoff checklist")).toBe("megaphone");
    expect(matchAgencyEntityIconKey("Implement responsive breakpoints")).toBe("code");
    expect(matchAgencyEntityIconKey("Set up campaign tracking")).toBe("megaphone");
    expect(matchAgencyEntityIconKey("Review deliverables")).toBe("file-search");
  });

  test("matches expanded agency titles from the leftmost keyword", () => {
    expect(matchAgencyEntityIconKey("Branding")).toBe("sparkles");
    expect(matchAgencyEntityIconKey("brand identity")).toBe("sparkles");
    expect(matchAgencyEntityIconKey("Account Management")).toBe("briefcase");
    expect(matchAgencyEntityIconKey("Art Production")).toBe("palette");
    expect(matchAgencyEntityIconKey("Blender Campaign")).toBe("clapperboard");
    expect(matchAgencyEntityIconKey("Amplification ( Ads + Technicalities )")).toBe("megaphone");
    expect(matchAgencyEntityIconKey("Automation & Analysis")).toBe("cog");
    expect(matchAgencyEntityIconKey("Audit & Roadmap")).toBe("shield");
    expect(matchAgencyEntityIconKey("Legacy System Migration")).toBe("database");
    expect(matchAgencyEntityIconKey("UX")).toBe("palette");
    expect(matchAgencyEntityIconKey("Plugin Development")).toBe("cog");
    expect(matchAgencyEntityIconKey("Learning path")).toBe("graduation-cap");
  });

  test("prefers the longer keyword when two match at the same index", () => {
    expect(matchAgencyEntityIconKey("website")).toBe("globe");
    expect(matchAgencyEntityIconKey("frontend work")).toBe("code");
  });

  test("does not treat short stems as prefixes of unrelated words", () => {
    expect(matchAgencyEntityIconKey("deliverable polish")).toBe("file-search");
    expect(matchAgencyEntityIconKey("happy path")).toBeNull();
    expect(matchAgencyEntityIconKey("adaptation carousel")).toBe("clapperboard");
    expect(matchAgencyEntityIconKey("adaptation")).toBeNull();
    expect(matchAgencyEntityIconKey("team")).toBeNull();
    expect(matchAgencyEntityIconKey("team standup")).toBe("users");
  });

  test("matches Arabic stems", () => {
    expect(matchAgencyEntityIconKey("تصميم الصفحة الرئيسية")).toBe("palette");
    expect(matchAgencyEntityIconKey("تطوير التطبيق")).toBe("code");
    expect(matchAgencyEntityIconKey("اجتماع العملاء")).toBe("users");
    expect(matchAgencyEntityIconKey("تقرير شهري")).toBe("bar-chart");
    expect(matchAgencyEntityIconKey("حملة رمضان")).toBe("megaphone");
    expect(matchAgencyEntityIconKey("موقع جديد")).toBe("globe");
    expect(matchAgencyEntityIconKey("مراجعة التسليم")).toBe("file-search");
    expect(matchAgencyEntityIconKey("تصميم هوية")).toBe("palette");
    expect(matchAgencyEntityIconKey("هوية بصرية")).toBe("sparkles");
    expect(matchAgencyEntityIconKey("إدارة حساب العميل")).toBe("briefcase");
    expect(matchAgencyEntityIconKey("أتمتة التقارير")).toBe("cog");
  });

  test("returns null when nothing matches", () => {
    expect(matchAgencyEntityIconKey("Scale Project 12")).toBeNull();
    expect(matchAgencyEntityIconKey("")).toBeNull();
    expect(matchAgencyEntityIconKey("   ")).toBeNull();
  });
});

describe("resolveStoredEntityIcon", () => {
  test("re-matches auto icons when the name changes", () => {
    expect(
      resolveStoredEntityIcon({
        name: "Final review",
        iconKey: "palette",
        iconSource: "auto",
      }),
    ).toEqual({ iconKey: "file-search", iconSource: "auto" });
  });

  test("keeps a manual pick, including a letter (null) mark", () => {
    expect(
      resolveStoredEntityIcon({
        name: "Design new homepage mockups",
        iconKey: "bug",
        iconSource: "manual",
      }),
    ).toEqual({ iconKey: "bug", iconSource: "manual" });

    expect(
      resolveStoredEntityIcon({
        name: "Design new homepage mockups",
        iconKey: null,
        iconSource: "manual",
      }),
    ).toEqual({ iconKey: null, iconSource: "manual" });
  });
});

describe("assignEntityIconOnWrite", () => {
  test("auto-assigns on create when the caller omits an icon", () => {
    expect(assignEntityIconOnWrite({ name: "QA pass" })).toEqual({
      iconKey: "bug",
      iconSource: "auto",
    });
  });

  test("stores an explicit pick as manual, including letter", () => {
    expect(
      assignEntityIconOnWrite({
        name: "QA pass",
        iconKeyProvided: true,
        requestedIconKey: "flag",
      }),
    ).toEqual({ iconKey: "flag", iconSource: "manual" });

    expect(
      assignEntityIconOnWrite({
        name: "QA pass",
        iconKeyProvided: true,
        requestedIconKey: null,
      }),
    ).toEqual({ iconKey: null, iconSource: "manual" });
  });

  test("does not auto-rewrite a manual icon on rename", () => {
    expect(
      assignEntityIconOnWrite({
        name: "Final review",
        existing: { iconKey: "palette", iconSource: "manual" },
      }),
    ).toEqual({ iconKey: "palette", iconSource: "manual" });
  });

  test("re-matches auto icons on rename", () => {
    expect(
      assignEntityIconOnWrite({
        name: "Final review",
        existing: { iconKey: "palette", iconSource: "auto" },
      }),
    ).toEqual({ iconKey: "file-search", iconSource: "auto" });
  });
});
