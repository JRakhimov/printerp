import { PrismaClient, Role, ClientSource, FilamentMaterial, OrderStatus, PaymentStatus, PrinterManufacturer, PrinterIntegrationType, PrintJobStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Checking database seeding status...');

  // Check if database already seeded
  const existingClients = await prisma.client.count();
  const existingProjects = await prisma.project.count();
  if (existingClients > 0 || existingProjects > 0) {
    console.log('🌱 Database already contains data. Skipping seed.');
    return;
  }

  console.log('🌱 Starting database seeding with UZS currency...');

  // 1. Owner User
  const ownerTelegramId = BigInt(process.env.INITIAL_OWNER_TELEGRAM_ID || '123456789');
  const owner = await prisma.user.upsert({
    where: { telegramId: ownerTelegramId },
    update: {},
    create: {
      telegramId: ownerTelegramId,
      telegramUsername: 'homelab_owner',
      firstName: 'Owner',
      lastName: 'Admin',
      role: Role.OWNER,
      isActive: true,
    },
  });
  console.log(`✅ Seeded owner user ID: ${owner.id} (Telegram ID: ${owner.telegramId})`);

  // 2. Clients
  const client1 = await prisma.client.create({
    data: {
      name: 'John Snow',
      telegramUsername: 'johnsnow',
      source: ClientSource.TELEGRAM,
      notes: 'Regular customer for custom props',
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: 'Alex Smith',
      instagramUsername: 'alex_3d',
      source: ClientSource.INSTAGRAM,
      notes: 'Headphone accessories buyer',
    },
  });

  console.log(`✅ Seeded clients: ${client1.name}, ${client2.name}`);

  // 3. Filaments (Prices in Uzbek Sums - UZS)
  const filament1 = await prisma.filament.create({
    data: {
      brand: 'Bambu Lab',
      name: 'PLA Basic Black',
      material: FilamentMaterial.PLA,
      color: '#000000',
      pricePerSpool: 250000, // 250,000 UZS
      spoolWeightG: 1000,
      costPerGram: 250.0, // 250 UZS per gram
      stockG: 3500,
    },
  });

  const filament2 = await prisma.filament.create({
    data: {
      brand: 'Generic',
      name: 'PETG White',
      material: FilamentMaterial.PETG,
      color: '#FFFFFF',
      pricePerSpool: 200000, // 200,000 UZS
      spoolWeightG: 1000,
      costPerGram: 200.0, // 200 UZS per gram
      stockG: 2000,
    },
  });

  console.log(`✅ Seeded filaments: ${filament1.name}, ${filament2.name}`);

  // 4. Projects (Prices in UZS)
  const project1 = await prisma.project.create({
    data: {
      name: 'Articulated Dragon',
      description: 'Flexible dragon toy with detailed scales',
      printTimeMinutes: 240,
      weightG: 144,
      defaultCost: 50000, // 50,000 UZS (36,000 material + 14,000 extra)
      defaultPrice: 120000, // 120,000 UZS
      extraCost: 14000,
      projectFilaments: {
        create: [
          { filamentId: filament1.id, grams: 144 },
        ],
      },
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Headphone Stand',
      description: 'Minimalist desktop headphone holder',
      printTimeMinutes: 180,
      weightG: 120,
      defaultCost: 30000, // 30,000 UZS (24,000 material + 6,000 extra)
      defaultPrice: 80000, // 80,000 UZS
      extraCost: 6000,
      projectFilaments: {
        create: [
          { filamentId: filament2.id, grams: 120 },
        ],
      },
    },
  });

  console.log(`✅ Seeded projects: ${project1.name}, ${project2.name}`);

  // 5. Printers
  const printer1 = await prisma.printer.create({
    data: {
      name: 'Bambu Lab P1S #1',
      manufacturer: PrinterManufacturer.BAMBU_LAB,
      model: 'P1S',
      serialNumber: '01P00A3B12345',
      integrationType: PrinterIntegrationType.MANUAL,
      isActive: true,
      lastStatus: 'IDLE',
    },
  });

  const printer2 = await prisma.printer.create({
    data: {
      name: 'Anycubic Kobra X',
      manufacturer: PrinterManufacturer.ANYCUBIC,
      model: 'Kobra X',
      serialNumber: 'AKX9876543',
      integrationType: PrinterIntegrationType.MANUAL,
      isActive: true,
      lastStatus: 'IDLE',
    },
  });

  console.log(`✅ Seeded printers: ${printer1.name}, ${printer2.name}`);

  // 6. Sample Order (Prices in UZS)
  const order = await prisma.order.create({
    data: {
      clientId: client1.id,
      status: OrderStatus.PRINTING,
      createdById: owner.id,
      updatedById: owner.id,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      calculatedCost: 130000,
      calculatedPrice: 320000,
      finalPrice: 300000,
      paymentStatus: PaymentStatus.PARTIALLY_PAID,
      comment: 'Urgent gift order',
      items: {
        create: [
          {
            projectId: project1.id,
            projectNameSnapshot: project1.name,
            quantity: 2,
            unitCost: 50000,
            unitPrice: 120000,
            totalCost: 100000,
            totalPrice: 240000,
          },
          {
            projectId: project2.id,
            projectNameSnapshot: project2.name,
            quantity: 1,
            unitCost: 30000,
            unitPrice: 80000,
            totalCost: 30000,
            totalPrice: 80000,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: 150000,
            comment: '50% Deposit paid via Click / Payme',
            createdById: owner.id,
          },
        ],
      },
    },
    include: {
      items: true,
    },
  });

  // Print jobs for order items
  await prisma.printJob.create({
    data: {
      orderId: order.id,
      orderItemId: order.items[0].id,
      printerId: printer1.id,
      status: PrintJobStatus.PRINTING,
      quantity: 2,
      estimatedTimeMinutes: 480,
      filename: 'Dragon_x2_PLA.gcode',
    },
  });

  console.log(`✅ Seeded sample Order #${order.orderNumber}`);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
