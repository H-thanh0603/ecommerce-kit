import { PrismaClient } from "@prisma/client";
import { normVi } from "../src/lib/format";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.product.findMany({
    select: { id: true, name: true, subtitle: true, description: true, tags: true },
  });
  for (const r of rows) {
    await prisma.product.update({
      where: { id: r.id },
      data: { searchText: normVi([r.name, r.subtitle, r.description, r.tags].join(" ")) },
    });
  }
  console.log(`Backfill searchText: ${rows.length} SP`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
