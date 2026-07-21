import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStorageMode } from "@/lib/storage-mode";
import type {
  DictionaryItem,
  Order,
  OrderStatus,
  Payment,
  PaymentMethod,
  PaymentType,
  SpecificationLine,
  SpecificationLineType
} from "@/lib/types";

type PrismaOrder = Prisma.OrderGetPayload<{
  include: {
    customer: true;
    category: true;
    materialType: true;
    millingType: true;
    lines: true;
    payments: true;
    statusHistory: true;
  };
}>;

function toNumber(value: unknown) {
  if (value == null) {
    return undefined;
  }

  return Number(value);
}

function toDate(value: string | undefined) {
  return value ? new Date(`${value}T00:00:00.000Z`) : undefined;
}

function toDateString(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : undefined;
}

function dictionaryItem(
  value: { id: string; name: string; isActive: boolean } | null
): DictionaryItem | undefined {
  if (!value) {
    return undefined;
  }

  return {
    id: value.id,
    name: value.name,
    isActive: value.isActive
  };
}

function fromPrismaOrder(order: PrismaOrder): Order {
  return {
    id: order.id,
    specificationNumber: order.specificationNumber,
    documentDate: toDateString(order.documentDate) ?? "",
    customer: {
      id: order.customer.id,
      name: order.customer.name,
      legalType: order.customer.legalType as Order["customerLegalType"],
      phone: order.customer.phone ?? undefined,
      email: order.customer.email ?? undefined,
      inn: order.customer.inn ?? undefined,
      address: order.customer.address ?? undefined,
      comment: order.customer.comment ?? undefined,
      isActive: order.customer.isActive
    },
    customerLegalType: order.customerLegalType as Order["customerLegalType"],
    status: order.status as OrderStatus,
    productionStartedAt: toDateString(order.productionStartedAt),
    readyAt: toDateString(order.readyAt),
    shippedAt: toDateString(order.shippedAt),
    category: dictionaryItem(order.category),
    materialType: dictionaryItem(order.materialType),
    thicknessMm: order.thicknessMm ?? undefined,
    millingType: dictionaryItem(order.millingType),
    colorCode: order.colorCode ?? undefined,
    mainNote: order.mainNote ?? undefined,
    jointingNote: order.jointingNote ?? undefined,
    deliveryRequired: order.deliveryRequired ?? false,
    deliveryAddress: order.deliveryAddress ?? undefined,
    totalAreaM2: Number(order.totalAreaM2),
    subtotalAmount: Number(order.subtotalAmount),
    discountAmount: Number(order.discountAmount),
    surchargeAmount: Number(order.surchargeAmount),
    prepaymentAmount: Number(order.prepaymentAmount),
    balanceAmount: Number(order.balanceAmount),
    totalAmount: Number(order.totalAmount),
    lines: order.lines
      .map<SpecificationLine>((line) => ({
        id: line.id,
        orderId: line.orderId,
        parentId: line.parentId,
        lineType: line.lineType as SpecificationLineType,
        sortOrder: line.sortOrder,
        title: line.title ?? undefined,
        description: line.description ?? undefined,
        heightMm: toNumber(line.heightMm),
        widthMm: toNumber(line.widthMm),
        quantity: toNumber(line.quantity),
        unit: line.unit ?? undefined,
        pricePerM2: toNumber(line.pricePerM2),
        unitAreaM2: toNumber(line.unitAreaM2),
        totalAreaM2: toNumber(line.totalAreaM2),
        unitPrice: toNumber(line.unitPrice),
        totalPrice: toNumber(line.totalPrice),
        isCalculated: line.isCalculated,
        isPrinted: line.isPrinted,
        metadata: (line.metadata as Record<string, unknown> | null) ?? undefined
      }))
      .sort((first, second) => first.sortOrder - second.sortOrder),
    payments: order.payments.map<Payment>((payment) => ({
      id: payment.id,
      orderId: payment.orderId,
      paymentType: payment.paymentType as PaymentType,
      amount: Number(payment.amount),
      paymentDate: toDateString(payment.paymentDate) ?? "",
      paymentMethod:
        (payment.paymentMethod as PaymentMethod | null) ?? undefined,
      comment: payment.comment ?? undefined
    })),
    statusHistory: order.statusHistory.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      status: item.status as OrderStatus,
      changedAt: item.changedAt.toISOString(),
      changedBy: item.changedBy ?? undefined,
      comment: item.comment ?? undefined
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString()
  };
}

async function upsertDictionaryItem(
  client: Prisma.TransactionClient,
  type: "category" | "materialType" | "millingType",
  item: DictionaryItem | undefined
) {
  if (!item) {
    return undefined;
  }

  if (type === "category") {
    const existing = await client.productCategory.findUnique({
      where: { name: item.name }
    });

    if (existing) {
      await client.productCategory.update({
        where: { id: existing.id },
        data: { isActive: item.isActive }
      });
      return existing.id;
    }

    await client.productCategory.upsert({
      where: { id: item.id },
      update: { name: item.name, isActive: item.isActive },
      create: { id: item.id, name: item.name, isActive: item.isActive }
    });
  }

  if (type === "materialType") {
    const existing = await client.materialType.findUnique({
      where: { name: item.name }
    });

    if (existing) {
      await client.materialType.update({
        where: { id: existing.id },
        data: { isActive: item.isActive }
      });
      return existing.id;
    }

    await client.materialType.upsert({
      where: { id: item.id },
      update: { name: item.name, isActive: item.isActive },
      create: { id: item.id, name: item.name, isActive: item.isActive }
    });
  }

  if (type === "millingType") {
    const existing = await client.millingType.findUnique({
      where: { name: item.name }
    });

    if (existing) {
      await client.millingType.update({
        where: { id: existing.id },
        data: { isActive: item.isActive }
      });
      return existing.id;
    }

    await client.millingType.upsert({
      where: { id: item.id },
      update: { name: item.name, isActive: item.isActive },
      create: { id: item.id, name: item.name, isActive: item.isActive }
    });
  }

  return item.id;
}

export async function canUsePrismaOrderStore() {
  if (getStorageMode() === "file") {
    return false;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when ORDER_STORE=prisma");
  }

  await prisma.$queryRaw`SELECT 1`;
  return true;
}

export async function listPrismaOrders() {
  const orders = await prisma.order.findMany({
    include: {
      customer: true,
      category: true,
      materialType: true,
      millingType: true,
      lines: true,
      payments: true,
      statusHistory: true
    },
    orderBy: [{ documentDate: "desc" }, { createdAt: "desc" }]
  });

  return orders.map(fromPrismaOrder);
}

export async function getPrismaOrderById(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      category: true,
      materialType: true,
      millingType: true,
      lines: true,
      payments: true,
      statusHistory: true
    }
  });

  return order ? fromPrismaOrder(order) : undefined;
}

export async function savePrismaOrder(order: Order) {
  return prisma.$transaction(async (transaction) => {
    const categoryId = await upsertDictionaryItem(
      transaction,
      "category",
      order.category
    );
    const materialTypeId = await upsertDictionaryItem(
      transaction,
      "materialType",
      order.materialType
    );
    const millingTypeId = await upsertDictionaryItem(
      transaction,
      "millingType",
      order.millingType
    );

    await transaction.customer.upsert({
      where: { id: order.customer.id },
      update: {
        name: order.customer.name,
        legalType: order.customer.legalType,
        phone: order.customer.phone,
        email: order.customer.email,
        inn: order.customer.inn,
        address: order.customer.address,
        comment: order.customer.comment,
        isActive: order.customer.isActive
      },
      create: {
        id: order.customer.id,
        name: order.customer.name,
        legalType: order.customer.legalType,
        phone: order.customer.phone,
        email: order.customer.email,
        inn: order.customer.inn,
        address: order.customer.address,
        comment: order.customer.comment,
        isActive: order.customer.isActive
      }
    });

    await transaction.order.upsert({
      where: { id: order.id },
      update: {
        specificationNumber: order.specificationNumber,
        documentDate: toDate(order.documentDate) ?? new Date(),
        customerId: order.customer.id,
        customerLegalType: order.customerLegalType,
        status: order.status,
        productionStartedAt: toDate(order.productionStartedAt),
        readyAt: toDate(order.readyAt),
        shippedAt: toDate(order.shippedAt),
        categoryId,
        materialTypeId,
        thicknessMm: order.thicknessMm,
        millingTypeId,
        colorCode: order.colorCode,
        mainNote: order.mainNote,
        jointingNote: order.jointingNote,
        deliveryRequired: order.deliveryRequired,
        deliveryAddress: order.deliveryAddress,
        totalAreaM2: order.totalAreaM2,
        subtotalAmount: order.subtotalAmount,
        discountAmount: order.discountAmount,
        surchargeAmount: order.surchargeAmount,
        prepaymentAmount: order.prepaymentAmount,
        balanceAmount: order.balanceAmount,
        totalAmount: order.totalAmount
      },
      create: {
        id: order.id,
        specificationNumber: order.specificationNumber,
        documentDate: toDate(order.documentDate) ?? new Date(),
        customerId: order.customer.id,
        customerLegalType: order.customerLegalType,
        status: order.status,
        productionStartedAt: toDate(order.productionStartedAt),
        readyAt: toDate(order.readyAt),
        shippedAt: toDate(order.shippedAt),
        categoryId,
        materialTypeId,
        thicknessMm: order.thicknessMm,
        millingTypeId,
        colorCode: order.colorCode,
        mainNote: order.mainNote,
        jointingNote: order.jointingNote,
        deliveryRequired: order.deliveryRequired,
        deliveryAddress: order.deliveryAddress,
        totalAreaM2: order.totalAreaM2,
        subtotalAmount: order.subtotalAmount,
        discountAmount: order.discountAmount,
        surchargeAmount: order.surchargeAmount,
        prepaymentAmount: order.prepaymentAmount,
        balanceAmount: order.balanceAmount,
        totalAmount: order.totalAmount
      }
    });

    await transaction.specificationLine.deleteMany({
      where: { orderId: order.id }
    });
    await transaction.payment.deleteMany({ where: { orderId: order.id } });
    await transaction.orderStatusHistory.deleteMany({
      where: { orderId: order.id }
    });

    if (order.lines.length > 0) {
      await transaction.specificationLine.createMany({
        data: order.lines.map((line) => ({
          id: line.id,
          orderId: order.id,
          parentId: line.parentId,
          lineType: line.lineType,
          sortOrder: line.sortOrder,
          title: line.title,
          description: line.description,
          heightMm: line.heightMm,
          widthMm: line.widthMm,
          quantity: line.quantity,
          unit: line.unit,
          pricePerM2: line.pricePerM2,
          unitAreaM2: line.unitAreaM2,
          totalAreaM2: line.totalAreaM2,
          unitPrice: line.unitPrice,
          totalPrice: line.totalPrice,
          isCalculated: line.isCalculated,
          isPrinted: line.isPrinted,
          metadata:
            line.metadata == null
              ? Prisma.JsonNull
              : (line.metadata as Prisma.InputJsonValue)
        }))
      });
    }

    if (order.payments.length > 0) {
      await transaction.payment.createMany({
        data: order.payments.map((payment) => ({
          id: payment.id,
          orderId: order.id,
          paymentType: payment.paymentType,
          amount: payment.amount,
          paymentDate: toDate(payment.paymentDate) ?? new Date(),
          paymentMethod: payment.paymentMethod,
          comment: payment.comment
        }))
      });
    }

    if (order.statusHistory.length > 0) {
      await transaction.orderStatusHistory.createMany({
        data: order.statusHistory.map((item) => ({
          id: item.id,
          orderId: order.id,
          status: item.status,
          changedAt: new Date(item.changedAt),
          changedBy: item.changedBy,
          comment: item.comment
        }))
      });
    }

    return order.id;
  });
}
