import { describe, expect, test } from "bun:test";
import {
  allAgencyReportFieldIds,
  areSameReportFieldSets,
  isReportCreatorSelectionHighlightField,
  parseReportFieldsParam,
  serializeReportFieldsParam,
} from "./agency-report-fields";

describe("agency-report-fields", () => {
  test("field ids and operations", () => {
    expect(allAgencyReportFieldIds()).toEqual([
      "project",
      "task",
      "description",
      "link",
      "duration",
      "assignee",
    ]);
    expect(parseReportFieldsParam(null).length).toBe(6);
    expect(parseReportFieldsParam("project,duration")).toEqual(["project", "duration"]);
    expect(parseReportFieldsParam("bad,values")).toEqual(allAgencyReportFieldIds());
    expect(serializeReportFieldsParam(["project", "task"])).toBe("project,task");
    expect(areSameReportFieldSets(["project", "task"], ["task", "project"])).toBe(true);
    expect(isReportCreatorSelectionHighlightField("project")).toBe(false);
    expect(isReportCreatorSelectionHighlightField("from")).toBe(false);
    expect(isReportCreatorSelectionHighlightField("to")).toBe(false);
    expect(isReportCreatorSelectionHighlightField("task")).toBe(true);
  });
});
