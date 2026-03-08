import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seeding...')

  // 1. Categories
  console.log('Seeding Categories...')
  const categoriesData = ['Power Tools', 'Accessories', 'Spare Parts', 'Measuring Instruments', 'Hand Tools']
  for (const name of categoriesData) {
    await prisma.category.create({
      data: { name }
    })
  }

  const powerToolsId = (await prisma.category.findFirst({ where: { name: 'Power Tools' } }))!.id
  const accessoriesId = (await prisma.category.findFirst({ where: { name: 'Accessories' } }))!.id
  const sparePartsId = (await prisma.category.findFirst({ where: { name: 'Spare Parts' } }))!.id
  
  // 2. Entities
  console.log('Seeding Entities...')
  await prisma.entity.create({
    data: { name: "Client Divers", type: "individual", notes: "Anonymous walk-in catch-all" }
  })
  const chantierAtlas = await prisma.entity.create({
    data: { name: "Chantier Atlas SARL", type: "company", balance_due: 50000 }
  })
  await prisma.entity.create({
    data: { name: "Electro Maghreb", type: "company", balance_due: 12000 }
  })
  await prisma.entity.create({
    data: { name: "M. Karim Benjelloun", type: "individual", notes: "Regular repeat client" }
  })
  const batiPro = await prisma.entity.create({
    data: { name: "Bati-Pro Maroc", type: "company", balance_due: 0, notes: "Regular client, no debt" }
  })
  await prisma.entity.create({
    data: { name: "Bosch Maroc", type: "supplier" }
  })
  
  // 3. Products
  console.log('Seeding Products and Price Tiers...')
  const productsMap: Array<{ sku: string, name: string, price: number, categoryId: number, stock: number }> = [
    { sku: '06011C10K0', name: 'GBM 400', price: 405, categoryId: powerToolsId, stock: 45 },
    { sku: '06011B70K1', name: 'GSB 570', price: 489, categoryId: powerToolsId, stock: 32 },
    { sku: '06012281K1', name: 'GSB 16 RE', price: 936, categoryId: powerToolsId, stock: 28 },
    { sku: '06112721K0', name: 'GBH 2-24 DRE', price: 2094, categoryId: powerToolsId, stock: 15 },
    { sku: '06112A4000', name: 'GBH 2-26 F', price: 2908, categoryId: powerToolsId, stock: 12 },
    { sku: '06013A30K1', name: 'GWS 700', price: 516, categoryId: powerToolsId, stock: 60 },
    { sku: '06013960K5', name: 'GWS 9-115', price: 1212, categoryId: powerToolsId, stock: 40 },
    { sku: '06017D0100', name: 'GWS 14-125 S', price: 1720, categoryId: powerToolsId, stock: 20 },
    { sku: '06013A40K1', name: 'GDC 140 Kit', price: 992, categoryId: accessoriesId, stock: 35 },
    { sku: '1600Z0000F', name: 'FSN 1600', price: 882, categoryId: accessoriesId, stock: 25 },
    { sku: '06019H2100', name: 'Bosch Go II', price: 757, categoryId: powerToolsId, stock: 50 },
    { sku: '06019G80K0', name: 'GSR 120-LI', price: 1449, categoryId: powerToolsId, stock: 22 },
    { sku: '06019F83K0', name: 'GSB 180-LI', price: 1548, categoryId: powerToolsId, stock: 18 },
    { sku: '06019G5223', name: 'GDX 180-LI', price: 3707, categoryId: powerToolsId, stock: 8 },
    { sku: '0601223000', name: 'GGS 5000', price: 1034, categoryId: accessoriesId, stock: 30 },
    { sku: '06019C3000', name: 'GAS 35 L SFC+', price: 8489, categoryId: accessoriesId, stock: 5 },
    { sku: '0601575103', name: 'GSG 300', price: 11157, categoryId: sparePartsId, stock: 6 },
    { sku: '06012980K0', name: 'GSS 2300', price: 829, categoryId: sparePartsId, stock: 38 },
    { sku: '0601292902', name: 'GSS 280 AVE', price: 4168, categoryId: sparePartsId, stock: 10 },
    { sku: '1600A019RK', name: 'GAL 18V-40', price: 441, categoryId: accessoriesId, stock: 55 }
  ]

  const productIds: number[] = []

  for (const item of productsMap) {
    const product = await prisma.product.create({
      data: {
        name: item.name,
        reference: item.sku,
        category_id: item.categoryId,
        stock_qty: item.stock,
      }
    })
    productIds.push(product.id)

    // Tiers: 1-9 (100%), 10-49 (90%), 50+ (82%)
    await prisma.priceTier.createMany({
      data: [
        { product_id: product.id, min_qty: 1, max_qty: 9, unit_price: item.price },
        { product_id: product.id, min_qty: 10, max_qty: 49, unit_price: item.price * 0.90 },
        { product_id: product.id, min_qty: 50, max_qty: null, unit_price: item.price * 0.82 }
      ]
    })
  }

  // 4. Historical Data
  console.log('Seeding Historical Data (Invoices & Daily Sales)...')

  // Generate 25 Invoices between Oct 1 and Dec 31
  const startMs = new Date('2024-10-01').getTime()
  const endMs = new Date('2024-12-31').getTime()
  
  // Specific Unpaid Invoices for Chantier Atlas SARL
  const atlasInvoicesData = [
    { num: 'INV-2024-001', dateMs: startMs + 1000000000 },
    { num: 'INV-2024-002', dateMs: startMs + 2000000000 },
    { num: 'INV-2024-003', dateMs: startMs + 3000000000 }
  ]

  for (const invoice of atlasInvoicesData) {
    const numLines = Math.floor(Math.random() * 2) + 2; // 2 to 3
    const lines = [];
    let subtotal = 0;
    for (let j = 0; j < numLines; j++) {
      const pIdx = Math.floor(Math.random() * productsMap.length);
      const prod = productsMap[pIdx];
      const pid = productIds[pIdx];
      const qty = Math.floor(Math.random() * 5) + 1;
      const lineTotal = qty * prod.price;
      subtotal += lineTotal;
      lines.push({
        product_id: pid,
        qty: qty,
        catalog_price: prod.price,
        unit_price: prod.price,
        line_total: lineTotal
      });
    }
    const tax_amount = Math.round(subtotal * 0.2 * 100) / 100;
    const total = subtotal + tax_amount;

    await prisma.invoice.create({
      data: {
        entity_id: chantierAtlas.id,
        type: 'invoice',
        status: 'open',
        invoice_number: invoice.num,
        issue_date: new Date(invoice.dateMs),
        due_date: new Date(invoice.dateMs + 86400000 * 30),
        subtotal: subtotal,
        tax_rate: 20,
        tax_amount: tax_amount,
        total: total,
        balance_due: total,
        created_at: new Date(invoice.dateMs),
        lines: { create: lines }
      }
    })
  }

  // Generate remaining random invoices for Bati-Pro
  for (let i = 4; i <= 25; i++) {
    const randomMs = startMs + Math.random() * (endMs - startMs)
    const numLines = Math.floor(Math.random() * 2) + 2; // 2 to 3
    const lines = [];
    let subtotal = 0;
    for (let j = 0; j < numLines; j++) {
      const pIdx = Math.floor(Math.random() * productsMap.length);
      const prod = productsMap[pIdx];
      const pid = productIds[pIdx];
      const qty = Math.floor(Math.random() * 5) + 1;
      const lineTotal = qty * prod.price;
      subtotal += lineTotal;
      lines.push({
        product_id: pid,
        qty: qty,
        catalog_price: prod.price,
        unit_price: prod.price,
        line_total: lineTotal
      });
    }
    const tax_amount = Math.round(subtotal * 0.2 * 100) / 100;
    const total = subtotal + tax_amount;
    
    await prisma.invoice.create({
      data: {
        entity_id: batiPro.id,
        type: 'invoice',
        status: 'paid',
        invoice_number: `INV-2024-${i.toString().padStart(3, '0')}`,
        issue_date: new Date(randomMs),
        subtotal: subtotal,
        tax_rate: 20,
        tax_amount: tax_amount,
        total: total,
        amount_paid: total,
        balance_due: 0,
        created_at: new Date(randomMs),
        lines: { create: lines }
      }
    })
  }

  // Daily Sales Logs (~8 per week for 13 weeks = 104 entries)
  const daysIn3Months = 92
  let logId = 1
  for(let day = 0; day < daysIn3Months; day++) {
    const date = new Date(startMs + day * 86400000)
    // Roughly 1-2 entries per day skips weekends
    if(date.getDay() === 0) continue // Skip Sundays
    
    const entriesToday = Math.floor(Math.random() * 3) // 0 to 2
    for(let j=0; j<entriesToday; j++) {
      const pIdx = Math.floor(Math.random() * productsMap.length)
      const prod = productsMap[pIdx]
      const pid = productIds[pIdx]
      const qty = Math.floor(Math.random() * 3) + 1
      
      await prisma.dailySalesLog.create({
        data: {
          log_date: date,
          product_id: pid,
          qty: qty,
          unit_price: prod.price,
          total: qty * prod.price,
          note: "Anonymous walk-in sale",
          created_at: date
        }
      })
    }
  }

  console.log('Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
