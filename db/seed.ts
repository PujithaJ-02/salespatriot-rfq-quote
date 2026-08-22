// db/seed.ts
import "./env";
import { db } from "./client";
import { partsCatalog, suppliers, supplierPrices } from "./schema";

async function seed() {
  console.log("Seeding database...");

  // 1. Insert parts (synthetic defense/aerospace-style components)
  const parts = await db
    .insert(partsCatalog)
    .values([
      { partNo: "MS21042-3", name: "Self-locking hex nut, steel", uom: "EA" },
      { partNo: "NAS1149F0332P", name: "Flat washer, titanium", uom: "EA" },
      { partNo: "AN960-10", name: "Flat washer, cadmium plated", uom: "EA" },
      { partNo: "MS35338-42", name: "Split lock washer", uom: "EA" },
      { partNo: "NAS6204-8", name: "Hex head bolt, alloy steel", uom: "EA" },
      { partNo: "M83248/1-012", name: "O-ring, fluorocarbon rubber", uom: "EA" },
      { partNo: "MS28775-012", name: "Backup ring, PTFE", uom: "EA" },
      { partNo: "AS3209-012", name: "Hydraulic hose assembly", uom: "FT" },
      { partNo: "MIL-DTL-5541", name: "Chemical conversion coating kit", uom: "KT" },
      { partNo: "NAS1352-08-8", name: "Socket head cap screw", uom: "EA" },
    ])
    .returning();

  console.log(`Inserted ${parts.length} parts`);

  // 2. Insert suppliers
  const sups = await db
    .insert(suppliers)
    .values([
      { name: "Jamaica Bearings Group", leadTimeDays: 21, rating: "4.70" },
      { name: "AllClear Aerospace", leadTimeDays: 28, rating: "4.40" },
      { name: "STATZ Corporation", leadTimeDays: 35, rating: "4.20" },
      { name: "Precision Fasteners Inc", leadTimeDays: 14, rating: "4.55" },
    ])
    .returning();

  console.log(`Inserted ${sups.length} suppliers`);

  // 3. Insert prices: each part gets 2-3 supplier prices (so matching has choices)
  const priceRows: {
    partId: number;
    supplierId: number;
    unitCost: string;
  }[] = [];

  for (const part of parts) {
    // give each part a random base cost, then vary it per supplier
    const base = 2 + Math.random() * 40; // $2 to $42
    const chosen = sups
      .slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, 2 + Math.floor(Math.random() * 2)); // 2 or 3 suppliers

    for (const sup of chosen) {
      const variance = 0.85 + Math.random() * 0.3; // +/- ~15%
      priceRows.push({
        partId: part.id,
        supplierId: sup.id,
        unitCost: (base * variance).toFixed(2),
      });
    }
  }

  await db.insert(supplierPrices).values(priceRows);
  console.log(`Inserted ${priceRows.length} supplier prices`);

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});