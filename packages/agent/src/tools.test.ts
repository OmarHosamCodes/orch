import {
  createWorkspaceCourseRoadmapBlock,
  createWorkspaceCourseRoadmapCourse,
  createWorkspaceCourseRoadmapLesson,
  createWorkspaceCourseRoadmapOutcome,
  createWorkspaceCustomBlock,
  createWorkspaceCustomBlockTemplate,
  createWorkspaceKanbanBlock,
  createWorkspaceKanbanCard,
  createWorkspaceKanbanColumn,
  createWorkspaceMessageHouseBlock,
  createWorkspaceMessageHousePillar,
  createWorkspaceNode,
  createWorkspaceNodeTab,
  createWorkspaceNotesBlock,
  createWorkspaceTableBlock,
  createWorkspaceTableColumn,
  createWorkspaceTableRow,
} from "@orch/workspace";
import { describe, expect, test } from "bun:test";
import { z } from "zod";

import { buildDashboardAgentTools, createDashboardAgentWorkspaceRuntime } from "./tools";

type ToolFunction = {
  name: string;
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
  execute: (input: unknown) => Promise<unknown>;
};

const allSupportedBlockTypes = [
  "task-list",
  "notes",
  "table",
  "checklist",
  "decision",
  "pros-cons",
  "swot",
  "tracker",
  "ai-prompt",
  "habit-grid",
  "process",
  "2x2-matrix",
  "course-roadmap",
  "learning-outcomes-matrix",
  "time-orchestrator",
  "cohort-health-dashboard",
  "eisenhower-matrix",
  "leadership-rhythm-planner",
  "kanban",
  "timeline",
  "skills-heat-map",
  "delegation-matrix",
  "talent-grid",
  "seat-planner",
  "deal-scoring-matrix",
  "pipeline-funnel",
  "forecast-confidence-board",
  "content-pipeline",
  "content-quality-radar",
  "content-roi-tracker",
  "authority-scorecard",
  "hook-bank",
  "message-house",
  "scorecard",
  "okr-tracker",
  "decision-matrix",
  "business-model-canvas",
  "assumption-tracker",
  "profitability-cash-flow",
  "pricing-simulator",
  "collections-tracker",
  "custom",
] as const;

function getTool(tools: ReturnType<typeof buildDashboardAgentTools>, name: string): ToolFunction {
  const toolEntry = tools.find(
    (entry) => entry.type === "function" && entry.function.name === name,
  );

  if (!toolEntry) {
    throw new Error(`Tool "${name}" was not found.`);
  }

  return toolEntry.function as ToolFunction;
}

async function callTool(
  tools: ReturnType<typeof buildDashboardAgentTools>,
  name: string,
  input: unknown,
): Promise<any> {
  const tool = getTool(tools, name);
  const parsedInput = tool.inputSchema.parse(input);
  const output = await tool.execute(parsedInput);

  return tool.outputSchema.parse(output) as any;
}

function createFixture() {
  const tableTopicColumn = createWorkspaceTableColumn({ label: "Topic" });
  const tableInsightColumn = createWorkspaceTableColumn({ label: "Insight" });
  const kanbanBacklogColumn = createWorkspaceKanbanColumn({ title: "Backlog" });
  const kanbanDoneColumn = createWorkspaceKanbanColumn({ title: "Done" });
  const customTemplate = createWorkspaceCustomBlockTemplate({
    name: "Campaign brief",
    fields: [
      {
        id: "field-angle",
        key: "angle",
        label: "Angle",
        type: "text",
      },
      {
        id: "field-proof",
        key: "proof",
        label: "Proof",
        type: "textarea",
      },
    ],
    includeNotes: true,
  });

  const notesBlock = createWorkspaceNotesBlock({
    title: "Research notes",
    body: "alpha deep insight and ranking needle live inside this note block",
  });
  const tableBlock = createWorkspaceTableBlock({
    title: "Message map",
    columns: [tableTopicColumn, tableInsightColumn],
    rows: [
      createWorkspaceTableRow(
        {
          cells: {
            [tableTopicColumn.id]: "Hooks",
            [tableInsightColumn.id]: "beta table cell unique",
          },
        },
        [tableTopicColumn, tableInsightColumn],
      ),
    ],
  });
  const kanbanBlock = createWorkspaceKanbanBlock({
    title: "Content pipeline",
    columns: [kanbanBacklogColumn, kanbanDoneColumn],
    cards: [
      createWorkspaceKanbanCard({
        columnId: kanbanBacklogColumn.id,
        title: "Draft carousel",
        description: "gamma kanban description unique",
      }),
    ],
  });
  const messageHouseBlock = createWorkspaceMessageHouseBlock({
    title: "Message architecture",
    brandPromise: "Own the market conversation",
    pillars: [
      createWorkspaceMessageHousePillar({
        title: "Speed",
        body: "delta message pillar unique",
      }),
      createWorkspaceMessageHousePillar({
        title: "Clarity",
        body: "Sharp positioning beats generic advice",
      }),
      createWorkspaceMessageHousePillar({
        title: "Proof",
        body: "Every claim needs evidence",
      }),
    ],
  });
  const customBlock = createWorkspaceCustomBlock(customTemplate, {
    title: "Campaign brief",
    values: {
      angle: "zeta custom value unique",
      proof: "Customer stories from enterprise launches",
    },
    notes: "epsilon custom notes unique",
  });
  const courseRoadmapBlock = createWorkspaceCourseRoadmapBlock({
    title: "Curriculum roadmap",
    courses: [
      createWorkspaceCourseRoadmapCourse({
        name: "Creator sprint",
        lessons: [
          createWorkspaceCourseRoadmapLesson({
            title: "Theta lesson unique",
          }),
        ],
        outcomes: [
          createWorkspaceCourseRoadmapOutcome({
            text: "eta roadmap outcome unique",
          }),
        ],
      }),
    ],
  });

  const tab = createWorkspaceNodeTab({
    title: "Content Atlas",
    blocks: [
      notesBlock,
      tableBlock,
      kanbanBlock,
      messageHouseBlock,
      customBlock,
      courseRoadmapBlock,
    ],
  });
  const node = createWorkspaceNode({
    title: "Launch Board",
    content: "ranking needle appears in node context for ordering tests",
    tabs: [tab],
    customBlockTemplates: [customTemplate],
  });
  const runtime = createDashboardAgentWorkspaceRuntime({
    nodes: [node],
  });
  const tools = buildDashboardAgentTools(runtime, [], "agent", { directMutations: true });

  return {
    tools,
    node,
    tab,
    blocks: {
      notesBlock,
      tableBlock,
      kanbanBlock,
      messageHouseBlock,
      customBlock,
      courseRoadmapBlock,
    },
  };
}

describe("buildDashboardAgentTools", () => {
  test("search_dashboard finds nested content across representative block types", async () => {
    const fixture = createFixture();
    const cases = [
      {
        query: "alpha deep insight",
        blockId: fixture.blocks.notesBlock.id,
      },
      {
        query: "beta table cell unique",
        blockId: fixture.blocks.tableBlock.id,
      },
      {
        query: "gamma kanban description unique",
        blockId: fixture.blocks.kanbanBlock.id,
      },
      {
        query: "delta message pillar unique",
        blockId: fixture.blocks.messageHouseBlock.id,
      },
      {
        query: "epsilon custom notes unique",
        blockId: fixture.blocks.customBlock.id,
      },
      {
        query: "zeta custom value unique",
        blockId: fixture.blocks.customBlock.id,
      },
      {
        query: "eta roadmap outcome unique",
        blockId: fixture.blocks.courseRoadmapBlock.id,
      },
    ];

    for (const testCase of cases) {
      const result = await callTool(fixture.tools, "search_dashboard", {
        query: testCase.query,
        limit: 10,
      });

      expect(
        result.matches.some(
          (match: any) =>
            match.matchType === "block" &&
            match.blockId === testCase.blockId &&
            match.tabId === fixture.tab.id,
        ),
      ).toBeTrue();
    }
  });

  test("search_dashboard ranks block hits above tab and node hits for the same query", async () => {
    const fixture = createFixture();
    const result = await callTool(fixture.tools, "search_dashboard", {
      query: "ranking needle",
      limit: 10,
    });

    expect(result.matches.slice(0, 3).map((match: any) => match.matchType)).toEqual([
      "block",
      "tab",
      "node",
    ]);
    expect(result.matches[0]?.blockId).toBe(fixture.blocks.notesBlock.id);
    expect(result.matches[1]?.tabId).toBe(fixture.tab.id);
    expect(result.matches[2]?.nodeId).toBe(fixture.node.id);
  });

  test("summary detail tools expose content previews", async () => {
    const fixture = createFixture();
    const nodeDetails = await callTool(fixture.tools, "get_node_details", {
      nodeId: fixture.node.id,
      detailLevel: "summary",
    });
    const blockSummary = nodeDetails.summary?.tabs[0]?.blocks.find(
      (block: any) => block.id === fixture.blocks.messageHouseBlock.id,
    );
    const customBlockDetails = await callTool(fixture.tools, "get_block_details", {
      nodeId: fixture.node.id,
      tabId: fixture.tab.id,
      blockId: fixture.blocks.customBlock.id,
      detailLevel: "summary",
    });

    expect(blockSummary?.contentPreview.toLowerCase()).toContain("delta message pillar unique");
    expect(customBlockDetails.summary?.contentPreview.toLowerCase()).toContain(
      "epsilon custom notes unique",
    );
    expect(customBlockDetails.summary?.contentPreview.toLowerCase()).toContain(
      "zeta custom value unique",
    );
  });

  test("search_dashboard excerpts include the matched content", async () => {
    const fixture = createFixture();
    const query = "gamma kanban description unique";
    const result = await callTool(fixture.tools, "search_dashboard", {
      query,
      limit: 10,
    });
    const match = result.matches.find(
      (entry: any) =>
        entry.matchType === "block" && entry.blockId === fixture.blocks.kanbanBlock.id,
    );

    expect(match).toBeDefined();
    expect(match?.excerpt.toLowerCase()).toContain(query);
  });

  test("replace_block updates searchability through the full edit flow", async () => {
    const fixture = createFixture();
    const originalQuery = "alpha deep insight";
    const updatedQuery = "omega updated note body unique";
    const initialSearch = await callTool(fixture.tools, "search_dashboard", {
      query: originalQuery,
      limit: 10,
    });
    const initialMatch = initialSearch.matches.find(
      (entry: any) => entry.matchType === "block" && entry.blockId === fixture.blocks.notesBlock.id,
    );

    expect(initialMatch).toBeDefined();

    const details = await callTool(fixture.tools, "get_block_details", {
      nodeId: fixture.node.id,
      tabId: fixture.tab.id,
      blockId: fixture.blocks.notesBlock.id,
      detailLevel: "full",
    });

    expect(details.block?.type).toBe("notes");

    const replacement = await callTool(fixture.tools, "replace_block", {
      nodeId: fixture.node.id,
      tabId: fixture.tab.id,
      blockId: fixture.blocks.notesBlock.id,
      block: {
        ...details.block,
        body: updatedQuery,
      },
    });
    const updatedSearch = await callTool(fixture.tools, "search_dashboard", {
      query: updatedQuery,
      limit: 10,
    });
    const staleSearch = await callTool(fixture.tools, "search_dashboard", {
      query: originalQuery,
      limit: 10,
    });

    expect(replacement.block.contentPreview.toLowerCase()).toContain(updatedQuery);
    expect(
      updatedSearch.matches.some(
        (entry: any) =>
          entry.matchType === "block" && entry.blockId === fixture.blocks.notesBlock.id,
      ),
    ).toBeTrue();
    expect(
      staleSearch.matches.some(
        (entry: any) =>
          entry.matchType === "block" && entry.blockId === fixture.blocks.notesBlock.id,
      ),
    ).toBeFalse();
  });

  test("patch_block bulk updates nested course roadmap lessons from editGuide paths", async () => {
    const fixture = createFixture();
    const details = await callTool(fixture.tools, "get_block_details", {
      nodeId: fixture.node.id,
      tabId: fixture.tab.id,
      blockId: fixture.blocks.courseRoadmapBlock.id,
      detailLevel: "summary",
    });

    expect(details.editGuide?.editableFieldPaths).toContain("courses[].lessons[].recorded");

    const patched = await callTool(fixture.tools, "patch_block", {
      nodeId: fixture.node.id,
      tabId: fixture.tab.id,
      blockId: fixture.blocks.courseRoadmapBlock.id,
      operations: [
        {
          op: "set",
          path: "courses[].lessons[].recorded",
          value: true,
        },
      ],
    });
    const updated = await callTool(fixture.tools, "get_block_details", {
      nodeId: fixture.node.id,
      tabId: fixture.tab.id,
      blockId: fixture.blocks.courseRoadmapBlock.id,
      detailLevel: "full",
    });

    expect(patched.operationsApplied).toBe(1);
    expect(patched.matchCount).toBeGreaterThan(0);
    expect(
      updated.block?.type === "course-roadmap" &&
        updated.block.courses.every((course: any) =>
          course.lessons.every((lesson: any) => lesson.recorded),
        ),
    ).toBeTrue();
  });

  test("patch_block can target nested array items by id selector", async () => {
    const fixture = createFixture();
    const cardId = fixture.blocks.kanbanBlock.cards[0]?.id;
    const nextDescription = "patched kanban description unique";

    expect(cardId).toBeTruthy();

    const patched = await callTool(fixture.tools, "patch_block", {
      nodeId: fixture.node.id,
      tabId: fixture.tab.id,
      blockId: fixture.blocks.kanbanBlock.id,
      operations: [
        {
          op: "set",
          path: `cards[id=${cardId}].description`,
          value: nextDescription,
        },
      ],
    });
    const updated = await callTool(fixture.tools, "get_block_details", {
      nodeId: fixture.node.id,
      tabId: fixture.tab.id,
      blockId: fixture.blocks.kanbanBlock.id,
      detailLevel: "full",
    });

    expect(patched.matchCount).toBe(1);
    expect(
      updated.block?.type === "kanban" &&
        updated.block.cards.find((card: any) => card.id === cardId)?.description ===
          nextDescription,
    ).toBeTrue();
  });

  test("create_block supports the full workspace block catalog", async () => {
    for (const type of allSupportedBlockTypes) {
      const fixture = createFixture();
      const customTemplateId = fixture.node.customBlockTemplates[0]?.id;
      const result = await callTool(fixture.tools, "create_block", {
        nodeId: fixture.node.id,
        tabId: fixture.tab.id,
        type,
        ...(type === "custom" ? { customTemplateId } : {}),
      });

      expect(result.block.type).toBe(type);
    }
  });

  test("get_block_details returns edit guidance for specialized and custom blocks", async () => {
    const fixture = createFixture();
    const courseRoadmapDetails = await callTool(fixture.tools, "get_block_details", {
      nodeId: fixture.node.id,
      tabId: fixture.tab.id,
      blockId: fixture.blocks.courseRoadmapBlock.id,
      detailLevel: "summary",
    });
    const customBlockDetails = await callTool(fixture.tools, "get_block_details", {
      nodeId: fixture.node.id,
      tabId: fixture.tab.id,
      blockId: fixture.blocks.customBlock.id,
      detailLevel: "full",
    });

    expect(courseRoadmapDetails.summary?.summary).toContain("courses");
    expect(courseRoadmapDetails.editGuide?.editableFieldPaths).toContain(
      "courses[].lessons[].title",
    );
    expect(customBlockDetails.editGuide?.referenceFieldPaths).toContain("definitionId");
    expect(customBlockDetails.editGuide?.editableFieldPaths).toContain("values.angle");
    expect(customBlockDetails.customBlockTemplate?.name).toBe("Campaign brief");
  });

  test("ask mode omits editGuide unless requested", async () => {
    const fixture = createFixture();
    const askTools = buildDashboardAgentTools(
      createDashboardAgentWorkspaceRuntime({
        nodes: [fixture.node],
        updatedAt: fixture.node.updatedAt,
      }),
      [],
      "ask",
    );
    const summary = await callTool(askTools, "get_block_details", {
      nodeId: fixture.node.id,
      tabId: fixture.tab.id,
      blockId: fixture.blocks.courseRoadmapBlock.id,
      detailLevel: "summary",
    });
    expect(summary.editGuide).toBeNull();

    const withGuide = await callTool(askTools, "get_block_details", {
      nodeId: fixture.node.id,
      tabId: fixture.tab.id,
      blockId: fixture.blocks.courseRoadmapBlock.id,
      detailLevel: "summary",
      includeEditGuide: true,
    });
    expect(withGuide.editGuide?.editableFieldPaths?.length).toBeGreaterThan(0);
  });

  test("replace_* tool input schemas stay compact", () => {
    const fixture = createFixture();
    for (const name of ["replace_node", "replace_tab", "replace_block"] as const) {
      const schema = getTool(fixture.tools, name).inputSchema;
      const json = z.toJSONSchema(schema);
      expect(JSON.stringify(json).length).toBeLessThan(2_500);
    }
  });
});
