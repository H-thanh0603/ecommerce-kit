"use client";

export function ExcelButtons() {
  return (
    <>
      <a href="/api/excel" className="underline">
        Xuất Excel
      </a>
      <label className="cursor-pointer underline">
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
