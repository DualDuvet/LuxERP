import { describe, expect, it } from "vitest";
import { linesInGroupOrder, normalizeLineOrder } from "@/lib/order-line-order";

describe("order line grouping", () => {
  it("places every child directly below its group", () => {
    const lines = [
      { id: "group-a", parentId: null, lineType: "group" as const, sortOrder: 10 },
      { id: "group-b", parentId: null, lineType: "group" as const, sortOrder: 20 },
      { id: "line-b", parentId: "group-b", lineType: "product" as const, sortOrder: 30 },
      { id: "line-a-1", parentId: "group-a", lineType: "product" as const, sortOrder: 40 },
      { id: "line-a-2", parentId: "group-a", lineType: "service" as const, sortOrder: 50 }
    ];

    expect(linesInGroupOrder(lines).map((line) => line.id)).toEqual([
      "group-a",
      "line-a-1",
      "line-a-2",
      "group-b",
      "line-b"
    ]);
  });

  it("keeps ungrouped and orphan rows at the bottom", () => {
    const lines = [
      { id: "orphan", parentId: "missing", lineType: "product" as const, sortOrder: 5 },
      { id: "group", parentId: null, lineType: "group" as const, sortOrder: 10 },
      { id: "free", parentId: null, lineType: "comment" as const, sortOrder: 15 },
      { id: "child", parentId: "group", lineType: "product" as const, sortOrder: 20 }
    ];

    expect(normalizeLineOrder(lines)).toMatchObject([
      { id: "group", sortOrder: 10 },
      { id: "child", sortOrder: 20 },
      { id: "orphan", sortOrder: 30 },
      { id: "free", sortOrder: 40 }
    ]);
  });
});
