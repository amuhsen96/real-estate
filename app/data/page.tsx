"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import type { Transaction } from "@/lib/priceSimulator";

type Tab = "manual" | "csv" | "file";

const PROPERTY_TYPES = ["شقة", "فيلا", "دور", "أرض", "تجاري", "استوديو", "غرفة", "غير محدد"];

const CSV_EXAMPLE = `المدينة,الحي,النوع,المساحة,السعر
الرياض,النرجس,شقة,150,750000
جدة,الروضة,فيلا,400,3200000
الدمام,العزيزية,شقة,120,480000`;

const CSV_EXAMPLE_WITH_COORDS = `المدينة,الحي,النوع,المساحة,السعر,خط العرض,خط الطول
الرياض,النرجس,شقة,150,750000,24.7967,46.6654`;

function formatNum(n: number) {
  return n.toLocaleString("ar-SA");
}

export default function DataPage() {
  const [tab, setTab] = useState<Tab>("manual");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Manual form state
  const [form, setForm] = useState({
    city: "", district: "", propertyType: "شقة",
    area: "", price: "", lat: "", lng: "", date: "", source: "",
  });

  // CSV state
  const [csvText, setCsvText] = useState("");

  // File upload state
  const [fileStatus, setFileStatus] = useState<"idle" | "reading" | "ready" | "error">("idle");
  const [fileName, setFileName] = useState<string>("");
  const [parsedCsv, setParsedCsv] = useState<string>("");
  const [filePreviewRows, setFilePreviewRows] = useState<string[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions");
      if (res.ok) setTransactions(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  function showMessage(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.city || !form.district || !form.area || !form.price) {
      showMessage("error", "يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          area: Number(form.area),
          price: Number(form.price.replace(/,/g, "")),
          lat: form.lat ? Number(form.lat) : undefined,
          lng: form.lng ? Number(form.lng) : undefined,
        }),
      });
      if (res.ok) {
        showMessage("success", "تمت إضافة الصفقة بنجاح");
        setForm({ city: "", district: "", propertyType: "شقة", area: "", price: "", lat: "", lng: "", date: "", source: "" });
        await loadTransactions();
      } else {
        const d = await res.json();
        showMessage("error", d.error ?? "حدث خطأ");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleCSVImport() {
    if (!csvText.trim()) { showMessage("error", "أدخل البيانات أولاً"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "csv", data: csvText }),
      });
      const d = await res.json();
      if (res.ok) {
        showMessage("success", `تمت إضافة ${d.added} صفقة بنجاح (الإجمالي: ${d.total})`);
        setCsvText("");
        await loadTransactions();
      } else {
        showMessage("error", d.error ?? "حدث خطأ في تحليل البيانات");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileStatus("reading");
    setParsedCsv("");
    setFilePreviewRows([]);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let csvContent = "";

      if (ext === "csv" || ext === "txt") {
        // CSV: قراءة مباشرة كنص
        csvContent = await file.text();
      } else if (ext === "xlsx" || ext === "xls") {
        // Excel: تحويل باستخدام SheetJS
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        csvContent = XLSX.utils.sheet_to_csv(ws);
      } else {
        setFileStatus("error");
        showMessage("error", "صيغة الملف غير مدعومة. الصيغ المقبولة: .xlsx, .xls, .csv");
        return;
      }

      // معاينة أول 5 صفوف
      const rows = csvContent
        .trim()
        .split(/\r?\n/)
        .slice(0, 6)
        .map((r) => r.split(/[,\t]/).map((c) => c.trim().replace(/^["']|["']$/g, "")));

      setParsedCsv(csvContent);
      setFilePreviewRows(rows);
      setFileStatus("ready");
    } catch {
      setFileStatus("error");
      showMessage("error", "تعذّر قراءة الملف. تأكد من أن الملف غير تالف.");
    }
  }

  async function handleFileImport() {
    if (!parsedCsv) return;
    setSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "csv", data: parsedCsv }),
      });
      const d = await res.json();
      if (res.ok) {
        showMessage("success", `تمت إضافة ${d.added} صفقة بنجاح (الإجمالي: ${d.total})`);
        setParsedCsv("");
        setFilePreviewRows([]);
        setFileName("");
        setFileStatus("idle");
        if (fileInputRef.current) fileInputRef.current.value = "";
        await loadTransactions();
      } else {
        showMessage("error", d.error ?? "حدث خطأ في معالجة الملف");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذه الصفقة؟")) return;
    const res = await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      showMessage("success", "تم حذف الصفقة");
    }
  }

  async function handleDeleteAll() {
    if (!confirm(`هل أنت متأكد من حذف جميع الصفقات (${transactions.length})؟ لا يمكن التراجع.`)) return;
    const res = await fetch("/api/transactions?all=true", { method: "DELETE" });
    if (res.ok) {
      setTransactions([]);
      showMessage("success", "تم حذف جميع الصفقات");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">بيانات الصفقات العقارية</h1>
            <p className="text-sm text-gray-500 mt-1">
              أضف صفقات حقيقية لتحسين دقة تقديرات الأسعار
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            ← العودة للرئيسية
          </Link>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`px-4 py-3 rounded-xl text-sm font-medium ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Input Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {(["manual", "csv", "file"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  tab === t
                    ? "bg-blue-50 text-blue-700 border-b-2 border-blue-500"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t === "manual" ? "إضافة يدوية" : t === "csv" ? "لصق CSV / Excel" : "رفع ملف"}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === "manual" ? (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">المدينة *</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="مثال: الرياض"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">الحي *</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="مثال: النرجس"
                      value={form.district}
                      onChange={(e) => setForm({ ...form, district: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">نوع العقار</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      value={form.propertyType}
                      onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
                    >
                      {PROPERTY_TYPES.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">المساحة (م²) *</label>
                    <input
                      type="number" min="1"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="150"
                      value={form.area}
                      onChange={(e) => setForm({ ...form, area: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">السعر الإجمالي (ريال) *</label>
                    <input
                      type="number" min="1"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="750000"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">المصدر</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="مثال: عقار، مستقل..."
                      value={form.source}
                      onChange={(e) => setForm({ ...form, source: e.target.value })}
                    />
                  </div>
                </div>

                {/* Optional coordinates */}
                <details className="group">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 select-none">
                    + إحداثيات الموقع (اختياري — تحسّن دقة التقدير)
                  </summary>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">خط العرض (Latitude)</label>
                      <input
                        type="number" step="any"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        placeholder="24.7967"
                        value={form.lat}
                        onChange={(e) => setForm({ ...form, lat: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">خط الطول (Longitude)</label>
                      <input
                        type="number" step="any"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        placeholder="46.6654"
                        value={form.lng}
                        onChange={(e) => setForm({ ...form, lng: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">التاريخ (اختياري)</label>
                      <input
                        type="month"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        value={form.date}
                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                      />
                    </div>
                  </div>
                </details>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "جاري الحفظ..." : "إضافة الصفقة"}
                </button>
              </form>
            ) : tab === "csv" ? (
              <div className="space-y-4">
                {/* Format hint */}
                <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-2">
                  <p className="font-medium text-gray-700">تنسيق البيانات المقبول:</p>
                  <p>يمكنك لصق البيانات مباشرة من Excel أو بصيغة CSV.</p>
                  <p className="font-medium mt-2">بدون إحداثيات:</p>
                  <pre className="bg-white border border-gray-200 rounded-lg p-2 overflow-x-auto text-xs font-mono whitespace-pre-wrap">{CSV_EXAMPLE}</pre>
                  <p className="font-medium mt-2">مع إحداثيات (أدق):</p>
                  <pre className="bg-white border border-gray-200 rounded-lg p-2 overflow-x-auto text-xs font-mono whitespace-pre-wrap">{CSV_EXAMPLE_WITH_COORDS}</pre>
                  <p className="text-gray-500">• الفاصل يمكن أن يكون فاصلة أو Tab (من Excel)</p>
                  <p className="text-gray-500">• سطر العنوان اختياري</p>
                </div>

                <textarea
                  className="w-full h-52 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  placeholder="الصق بياناتك هنا..."
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  dir="ltr"
                />

                <button
                  onClick={handleCSVImport}
                  disabled={saving || !csvText.trim()}
                  className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "جاري الاستيراد..." : "استيراد البيانات"}
                </button>
              </div>
            ) : (
              /* ─── تبويب رفع ملف ─── */
              <div className="space-y-4">
                {/* Format guide */}
                <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-1">
                  <p className="font-medium text-gray-700">الصيغ المقبولة: Excel (.xlsx / .xls) أو CSV (.csv)</p>
                  <p>يجب أن يحتوي الملف على أعمدة: المدينة، الحي، النوع، المساحة، السعر</p>
                  <p className="text-gray-500">الأعمدة الاختيارية: خط العرض، خط الطول، التاريخ، المصدر</p>
                </div>

                {/* Drop zone / file input */}
                <label
                  className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
                    fileStatus === "ready"
                      ? "border-green-300 bg-green-50"
                      : fileStatus === "error"
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {fileStatus === "idle" && (
                    <>
                      <span className="text-3xl">📂</span>
                      <p className="text-sm text-gray-600">انقر لاختيار ملف أو اسحب وأفلت هنا</p>
                      <p className="text-xs text-gray-400">.xlsx — .xls — .csv</p>
                    </>
                  )}
                  {fileStatus === "reading" && (
                    <>
                      <span className="text-3xl animate-pulse">⏳</span>
                      <p className="text-sm text-gray-500">جاري قراءة الملف...</p>
                    </>
                  )}
                  {fileStatus === "ready" && (
                    <>
                      <span className="text-3xl">✅</span>
                      <p className="text-sm text-green-700 font-medium">{fileName}</p>
                      <p className="text-xs text-green-600">تم تحليل الملف — راجع المعاينة أدناه</p>
                    </>
                  )}
                  {fileStatus === "error" && (
                    <>
                      <span className="text-3xl">❌</span>
                      <p className="text-sm text-red-600">تعذّرت القراءة — انقر لاختيار ملف آخر</p>
                    </>
                  )}
                </label>

                {/* Preview table */}
                {filePreviewRows.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 px-3 pt-2 pb-1">معاينة (أول 5 صفوف)</p>
                    <table className="w-full text-xs" dir="ltr">
                      <tbody>
                        {filePreviewRows.map((row, ri) => (
                          <tr key={ri} className={ri === 0 ? "bg-gray-100 font-medium" : "border-t border-gray-50"}>
                            {row.map((cell, ci) => (
                              <td key={ci} className="px-3 py-1.5 text-gray-700 whitespace-nowrap">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <button
                  onClick={handleFileImport}
                  disabled={saving || fileStatus !== "ready"}
                  className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "جاري الاستيراد..." : "استيراد الملف"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">
              الصفقات المحفوظة
              {!loading && (
                <span className="mr-2 text-sm font-normal text-gray-400">
                  ({transactions.length} صفقة)
                </span>
              )}
            </h2>
            {transactions.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
              >
                حذف الكل
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">جاري التحميل...</div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm">لا توجد صفقات محفوظة بعد</p>
              <p className="text-xs mt-1">أضف صفقات لتحسين دقة التسعير</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">المدينة</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الحي</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">النوع</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">المساحة</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">السعر الإجمالي</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">سعر المتر</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">المصدر</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{tx.city}</td>
                      <td className="px-4 py-3 text-gray-600">{tx.district}</td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                          {tx.propertyType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatNum(tx.area)} م²</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{formatNum(tx.price)} ر</td>
                      <td className="px-4 py-3 text-green-700 font-semibold">{formatNum(tx.pricePerSqm)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{tx.source ?? "—"}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="text-red-400 hover:text-red-600 text-xs transition-colors"
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
