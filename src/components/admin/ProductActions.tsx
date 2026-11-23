"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Product } from "@/types";
import { btnDanger, btnGhost } from "@/components/admin/buttons";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

export function ProductActions({ product }: { product: Product }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const hide = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !product.published }),
      });
      if (!res.ok) throw new Error("Không đổi được trạng thái hiển thị");
      toast.success(product.published === false ? `Đã hiện ${product.name}` : `Đã ẩn ${product.name}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Thao tác thất bại");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Không xóa được sản phẩm");
      setConfirmOpen(false);
      toast.success(`Đã xóa / ẩn ${product.name}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Thao tác thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <span className="flex flex-wrap justify-end gap-2">
        <a href={`/admin/san-pham?edit=${product.id}`} className={btnGhost}>
          Sửa
        </a>
        <button type="button" disabled={busy} onClick={hide} className={btnGhost}>
          {product.published === false ? "Hiện" : "Ẩn"}
        </button>
        <button type="button" disabled={busy} onClick={() => setConfirmOpen(true)} className={btnDanger}>
          Xóa
        </button>
      </span>
      <ConfirmDialog
        open={confirmOpen}
        title={`Xóa sản phẩm “${product.name}”?`}
        description="Nếu sản phẩm đã nằm trong đơn hàng cũ, hệ thống sẽ tự chuyển sang trạng thái ẩn thay vì xóa cứng để bảo toàn lịch sử đơn."
        confirmLabel="Xóa sản phẩm"
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={remove}
      />
    </>
  );
}
