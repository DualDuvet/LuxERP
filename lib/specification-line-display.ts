import type { SpecificationLine } from "@/lib/types";

export const unifiedMillingLineTitle = "facadeUnifiedMilling";

export function isUnifiedMillingLine(line: SpecificationLine) {
  return line.title === unifiedMillingLineTitle;
}

export function specificationLineText(line: SpecificationLine, fallback = "") {
  if (line.lineType === "group") {
    return line.title || line.description || fallback;
  }

  if (isUnifiedMillingLine(line)) {
    return line.description || fallback;
  }

  return line.description || line.title || fallback;
}

function joinNotes(notes: string[]) {
  return notes.map((note) => note.trim()).filter(Boolean).join(" ");
}

export function linesWithUnifiedMillingNotes(lines: SpecificationLine[]) {
  const result: SpecificationLine[] = [];
  let pendingNotes: string[] = [];
  let pendingParentId: string | null | undefined = null;

  for (const line of [...lines].sort((first, second) => first.sortOrder - second.sortOrder)) {
    if (isUnifiedMillingLine(line)) {
      const note = specificationLineText(line);

      pendingNotes =
        pendingNotes.length === 0 || pendingParentId === line.parentId ? [...pendingNotes, note] : [note];

      pendingParentId = line.parentId;
      result.push(line);
      continue;
    }

    if (line.lineType === "group") {
      pendingNotes = [];
      pendingParentId = null;
      result.push(line);
      continue;
    }

    if (pendingNotes.length > 0 && pendingParentId === line.parentId) {
      result.push({
        ...line,
        title: undefined,
        description: joinNotes([...pendingNotes, specificationLineText(line)])
      });
      pendingNotes = [];
      pendingParentId = null;
      continue;
    }

    pendingNotes = [];
    pendingParentId = null;
    result.push(line);
  }

  return result;
}
