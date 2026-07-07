const fs = require("node:fs/promises");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const ordersDir = path.join(process.cwd(), ".data", "orders");

function toDate(value) {
  return value ? new Date(`${value.slice(0, 10)}T00:00:00.000Z`) : undefined;
}

async function upsertDictionary(type, item) {
  if (!item) {
    return undefined;
  }

  const data = { id: item.id, name: item.name, isActive: item.isActive ?? true };

  if (type === "category") {
    await prisma.productCategory.upsert({ where: { id: item.id }, update: data, create: data });
  }

  if (type === "material") {
    await prisma.materialType.upsert({ where: { id: item.id }, update: data, create: data });
  }

  if (type === "milling") {
    await prisma.millingType.upsert({ where: { id: item.id }, update: data, create: data });
  }

  return item.id;
}

async function saveOrder(order) {
  const categoryId = await upsertDictionary("category", order.category);
  const materialTypeId = await upsertDictionary("material", order.materialType);
  const millingTypeId = await upsertDictionary("milling", order.millingType);

  await prisma.customer.upsert({
    where: { id: order.customer.id },
    update: {
      name: order.customer.name,
      legalType: order.customer.legalType,
      phone: order.customer.phone,
      email: order.customer.email,
      inn: order.customer.inn,
      address: order.customer.address,
      comment: order.customer.comment,
      isActive: order.customer.isActive ?? true
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
      isActive: order.customer.isActive ?? true
    }
  });

  await prisma.order.upsert({
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
      totalAreaM2: order.totalAreaM2,
      subtotalAmount: order.subtotalAmount,
      discountAmount: order.discountAmount,
      surchargeAmount: order.surchargeAmount,
      prepaymentAmount: order.prepaymentAmount,
      balanceAmount: order.balanceAmount,
      totalAmount: order.totalAmount
    }
  });

  await prisma.specificationLine.deleteMany({ where: { orderId: order.id } });
  await prisma.payment.deleteMany({ where: { orderId: order.id } });
  await prisma.orderStatusHistory.deleteMany({ where: { orderId: order.id } });

  if (order.lines?.length) {
    await prisma.specificationLine.createMany({
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
        metadata: line.metadata
      }))
    });
  }

  if (order.payments?.length) {
    await prisma.payment.createMany({
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

  if (order.statusHistory?.length) {
    await prisma.orderStatusHistory.createMany({
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
}

async function main() {
  const fileNames = await fs.readdir(ordersDir).catch(() => []);
  const jsonFiles = fileNames.filter((fileName) => fileName.endsWith(".json"));

  for (const fileName of jsonFiles) {
    const order = JSON.parse(await fs.readFile(path.join(ordersDir, fileName), "utf8"));
    await saveOrder(order);
    console.log(`Synced ${order.specificationNumber} (${order.id})`);
  }

  console.log(`Done. Synced ${jsonFiles.length} order(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

