import { NextResponse } from "next/server";
import { listWarehouses, setWarehouseStock, upsertWarehouse } from "@/server/warehouse";
import { requireAdmin } from "@/server/auth";
import { isEnabled } from "@/config/site";

export async function GET() {
  if (!isEnabled("multiWarehouse")) return NextResponse.json({ warehouses: [] });
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần admin" }, { status: 401 });
  return NextResponse.json({ warehouses: await listWarehouses() });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần admin" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.stock != null) {
    const row = await setWarehouseStock(
      String(body.warehouseId),
      String(body.productId),
      String(body.skuKey || ""),
      Number(body.stock),
    );
    return NextResponse.json({ stock: row });
  }
  const warehouse = await upsertWarehouse({
    id: body.id,
    code: String(body.code || ""),
    name: String(body.name || ""),
    address: body.address,
    isDefault: Boolean(body.isDefault),
  });
  return NextResponse.json({ warehouse });
}
