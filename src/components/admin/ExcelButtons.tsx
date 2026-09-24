"use client";

import { btnGhost } from "@/components/admin/buttons";

export function ExcelButtons() {
  return (
    <>
      <a href="/api/excel" className={btnGhost}>
        Xuất Excel
      </a>
      <label className={`${btnGhost} cursor-pointer`}>
        Nhập Excel
        <input
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const fd = new FormData();
            fd.set("file", file);
            await fetch("/api/excel", { method: "POST", body: fd });
            location.reload();
          }}
        />
      </label>
    </>
  );
}
