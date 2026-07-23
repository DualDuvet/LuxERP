import { z } from "zod";
import { calculateLine } from "@/lib/calculations";
import { specificationLineTypes } from "@/lib/types";
import type { SpecificationLine } from "@/lib/types";

const emptyStringToUndefined = (value: unknown) =>
  value === "" || value == null ? undefined : value;

const optionalNumber = z.preprocess(
  emptyStringToUndefined,
  z.coerce.number().nonnegative().optional()
);
const optionalText = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().optional()
);

export const orderLineInputSchema = z.object({
  id: optionalText,
  parentId: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().nullable().optional()
  ),
  lineType: z.enum(specificationLineTypes),
  sortOrder: z.coerce.number().int().nonnegative(),
  title: optionalText,
  description: optionalText,
  heightMm: optionalNumber,
  widthMm: optionalNumber,
  quantity: optionalNumber,
  unit: optionalText,
  pricePerM2: optionalNumber,
  unitPrice: optionalNumber,
  isPrinted: z.boolean().default(true)
});

export const orderLinesInputSchema = z
  .array(orderLineInputSchema)
  .max(1000)
  .superRefine((lines, context) => {
    lines.forEach((line, index) => {
      const addIssue = (path: string, message: string) =>
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, path],
          message
        });

      if (line.lineType === "group" && !(line.title || line.description)) {
        addIssue("title", "Укажите название группы");
      }

      if (line.lineType === "product") {
        if (!line.description) addIssue("description", "Укажите описание");
        if (!line.heightMm) addIssue("heightMm", "Высота должна быть больше 0");
        if (!line.widthMm) addIssue("widthMm", "Ширина должна быть больше 0");
        if (!line.quantity) addIssue("quantity", "Количество должно быть больше 0");
      }

      if (line.lineType === "service") {
        if (!line.description) addIssue("description", "Укажите описание");
        if (!line.quantity) addIssue("quantity", "Количество должно быть больше 0");
      }
    });
  });

const calculatedTypes = new Set([
  "product",
  "service",
  "discount",
  "surcharge",
  "subtotal",
  "total"
]);

function makeLineId(orderId: string, index: number) {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${index}`;

  return `${orderId}-line-${suffix}`;
}

export function normalizeOrderLines(
  orderId: string,
  inputs: z.infer<typeof orderLinesInputSchema>
): SpecificationLine[] {
  return [...inputs]
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((input, index) =>
      calculateLine({
        id: input.id ?? makeLineId(orderId, index),
        orderId,
        parentId: input.parentId ?? null,
        lineType: input.lineType,
        sortOrder: (index + 1) * 10,
        title: input.title,
        description: input.description,
        heightMm: input.heightMm,
        widthMm: input.widthMm,
        quantity: input.quantity,
        unit: input.unit,
        pricePerM2: input.pricePerM2,
        unitPrice: input.unitPrice,
        isCalculated: calculatedTypes.has(input.lineType),
        isPrinted: input.isPrinted
      })
    );
}
