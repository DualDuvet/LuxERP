import type { SpecificationLine } from "@/lib/types";

type OrderableLine = Pick<SpecificationLine, "id" | "parentId" | "lineType" | "sortOrder">;

export function linesInGroupOrder<T extends OrderableLine>(lines: readonly T[]): T[] {
  const groups = lines.filter((line) => line.lineType === "group");
  const groupIds = new Set(groups.map((group) => group.id));
  const ordered = groups.flatMap((group) => [
    group,
    ...lines.filter((line) => line.lineType !== "group" && line.parentId === group.id)
  ]);

  return [
    ...ordered,
    ...lines.filter(
      (line) =>
        line.lineType !== "group" &&
        (!line.parentId || !groupIds.has(line.parentId))
    )
  ];
}

export function normalizeLineOrder<T extends OrderableLine>(lines: readonly T[]): T[] {
  return linesInGroupOrder(lines).map((line, index) => ({
    ...line,
    sortOrder: (index + 1) * 10
  }));
}
