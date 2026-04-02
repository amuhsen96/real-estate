"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import type { Transaction } from "@/lib/priceSimulator";
import { useI18n } from "@/lib/i18n";
import LanguageToggle from "@/components/LanguageToggle";

type Tab = "manual" | "csv" | "file";

const PROPERTY_TYPES = ["شقة", "فيلا", "دور", "أرض", "تجاري", "استوديو", "غرفة", "غير محدد"];

const CSV_EXAMPLE = `المدينة,الحي,النوع,المساحة,السعر
الرياض,النرجس,شقة,150,750000
جدة,الروضة,فيلا,400,3200000
الدمام,العزيزية,شقة,120,480000`;

const CSV_EXAMPLE_WITH_COORDS = `المدينة,الحي,النوع,المساحة,السعر,خط العرض,خط الطول
الرياض,النرجس,شقة,150,750000,24.7967,46.6654`;

export default function DataPage() {
  const { t, lang, dir } = useI18n();

  function formatNum(n: number) {
    return lang === "en" ? n.toLocaleString("en-US") : n.toLocaleString("ar-SA");
  }

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
  const [fileStatus, setFileStatus] = useState<"idle" | "ready" | "error">("idle");
  const [fileName, setFileName] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
      showMessage("error", t("fillRequired"));
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
        showMessage("success", lang === "en" ? "Transaction added successfully" : "تمت إضافة الصفقة بنجاح");
        setForm({ city: "", district: "", propertyType: "شقة", area: "", price: "", lat: "", lng: "", date: "", source: "" });
        await loadTransactions();
      } else {
        const d = await res.json();
        showMessage("error", d.error ?? (lang === "en" ? "An error occurred" : "حدث خطأ"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleCSVImport() {
    if (!csvText.trim()) {
      showMessage("error", lang === "en" ? "Please enter data first" : "أدخل البيانات أولاً");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "csv", data: csvText }),
      });
      const d = await res.json();
      if (res.ok) {
        showMessage("success", lang === "en"
          ? `Added ${d.added} transactions successfully (total: ${d.total})`
          : `تمت إضافة ${d.added} صفقة بنجاح (الإجمالي: ${d.total})`);
        setCsvText("");
        await loadTransactions();
      } else {
        showMessage("error", d.error ?? (lang === "en" ? "Error parsing data" : "حدث خطأ في تحليل البيانات"));
      }
    } finally {
      setSaving(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv", "txt"].includes(ext ?? "")) {
      setFileStatus("error");
      showMessage("error", lang === "en"
        ? "Unsupported file format. Accepted: .xlsx, .xls, .csv"
        : "صيغة الملف غير مدعومة. الصيغ المقبولة: .xlsx, .xls, .csv");
      return;
    }

    setFileName(file.name);
    setSelectedFile(file);
    setFilePreviewRows([]);
    setFileStatus("ready");
  }

  async function handleFileImport() {
    if (!selectedFile) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/transactions/upload", {
        method: "POST",
        body: formData,
      });
      const d = await res.json();
      if (res.ok) {
        showMessage("success", lang === "en"
          ? `Added ${d.added} transactions successfully (total: ${d.total})`
          : `تمت إضافة ${d.added} صفقة بنجاح (الإجمالي: ${d.total})`);
        setSelectedFile(null);
        setFilePreviewRows(d.preview ?? []);
        setFileName("");
        setFileStatus("idle");
        if (fileInputRef.current) fileInputRef.current.value = "";
        await loadTransactions();
      } else {
        showMessage("error", d.error ?? (lang === "en" ? "Error processing file" : "حدث خطأ في معالجة الملف"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirmDeleteOne"))) return;
    const res = await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setTransactions((prev) => prev.filter((tx) => tx.id !== id));
      showMessage("success", lang === "en" ? "Transaction deleted" : "تم حذف الصفقة");
    }
  }

  async function handleDeleteAll() {
    if (!confirm(`${t("confirmDeleteAll")} (${transactions.length})? ${lang === "en" ? "This cannot be undone." : "لا يمكن التراجع."}`)) return;
    const res = await fetch("/api/transactions?all=true", { method: "DELETE" });
    if (res.ok) {
      setTransactions([]);
      showMessage("success", lang === "en" ? "All transactions deleted" : "تم حذف جميع الصفقات");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4" dir={dir}>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t("dataTitle")}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {t("dataSubtitle")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {t("navHome")}
            </Link>
          </div>
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
            {(["manual", "csv", "file"] as Tab[]).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setTab(tabKey)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  tab === tabKey
                    ? "bg-blue-50 text-blue-700 border-b-2 border-blue-500"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tabKey === "manual" ? t("tabManual") : tabKey === "csv" ? t("tabCSV") : t("tabFile")}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === "manual" ? (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t("cityRequired")}</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder={lang === "en" ? "e.g. Riyadh" : "مثال: الرياض"}
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t("districtRequired")}</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder={lang === "en" ? "e.g. Al-Nargis" : "مثال: النرجس"}
                      value={form.district}
                      onChange={(e) => setForm({ ...form, district: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t("propTypeLabel")}</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      value={form.propertyType}
                      onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
                    >
                      {PROPERTY_TYPES.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t("areaRequired")}</label>
                    <input
                      type="number" min="1"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="150"
                      value={form.area}
                      onChange={(e) => setForm({ ...form, area: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t("priceRequired")}</label>
                    <input
                      type="number" min="1"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="750000"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t("sourceOptional")}</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder={t("sourcePlaceholder")}
                      value={form.source}
                      onChange={(e) => setForm({ ...form, source: e.target.value })}
                    />
                  </div>
                </div>

                {/* Optional coordinates */}
                <details className="group">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 select-none">
                    {t("coordsOptional")}
                  </summary>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t("latLabel")}</label>
                      <input
                        type="number" step="any"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        placeholder="24.7967"
                        value={form.lat}
                        onChange={(e) => setForm({ ...form, lat: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t("lngLabel")}</label>
                      <input
                        type="number" step="any"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        placeholder="46.6654"
                        value={form.lng}
                        onChange={(e) => setForm({ ...form, lng: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t("dateLabel")}</label>
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
                  {saving ? t("savingBtn") : t("addTxBtn")}
                </button>
              </form>
            ) : tab === "csv" ? (
              <div className="space-y-4">
                {/* Format hint */}
                <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-2">
                  <p className="font-medium text-gray-700">{t("csvFormatTitle")}</p>
                  <p>{lang === "en" ? "You can paste data directly from Excel or in CSV format." : "يمكنك لصق البيانات مباشرة من Excel أو بصيغة CSV."}</p>
                  <p className="font-medium mt-2">{t("csvNoCoords")}</p>
                  <pre className="bg-white border border-gray-200 rounded-lg p-2 overflow-x-auto text-xs font-mono whitespace-pre-wrap">{CSV_EXAMPLE}</pre>
                  <p className="font-medium mt-2">{t("csvWithCoords")}</p>
                  <pre className="bg-white border border-gray-200 rounded-lg p-2 overflow-x-auto text-xs font-mono whitespace-pre-wrap">{CSV_EXAMPLE_WITH_COORDS}</pre>
                  <p className="text-gray-500">{t("csvSepHint")}</p>
                </div>

                <textarea
                  className="w-full h-52 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  placeholder={t("csvPastePlaceholder")}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  dir="ltr"
                />

                <button
                  onClick={handleCSVImport}
                  disabled={saving || !csvText.trim()}
                  className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? t("importingBtn") : t("importBtn")}
                </button>
              </div>
            ) : (
              /* File upload tab */
              <div className="space-y-4">
                {/* Format guide */}
                <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-1">
                  <p className="font-medium text-gray-700">{t("fileFormats")}</p>
                  <p>{t("fileColsHint")}</p>
                  <p className="text-gray-500">{t("fileOptCols")}</p>
                </div>

                {/* Drop zone / file input */}
                <label
                  className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
                    fileStatus === "ready"
                      ? "border-blue-300 bg-blue-50"
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
                      <p className="text-sm text-gray-600">{t("fileIdle")}</p>
                      <p className="text-xs text-gray-400">.xlsx — .xls — .csv</p>
                    </>
                  )}
                  {fileStatus === "ready" && (
                    <>
                      <span className="text-3xl">📄</span>
                      <p className="text-sm text-green-700 font-medium">{fileName}</p>
                      <p className="text-xs text-green-600">{t("fileReady")}</p>
                    </>
                  )}
                  {fileStatus === "error" && (
                    <>
                      <span className="text-3xl">❌</span>
                      <p className="text-sm text-red-600">{t("fileError")}</p>
                    </>
                  )}
                </label>

                {/* Preview table — shown after successful import */}
                {filePreviewRows.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-green-100 bg-green-50">
                    <p className="text-xs text-green-700 font-medium px-3 pt-2 pb-1">{t("previewTitle")}</p>
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
                  disabled={saving || !selectedFile}
                  className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? t("importingBtn") : t("importFileBtn")}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">
              {t("savedTxTitle")}
              {!loading && (
                <span className="mr-2 text-sm font-normal text-gray-400">
                  ({transactions.length} {t("txUnit")})
                </span>
              )}
            </h2>
            {transactions.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
              >
                {t("deleteAll")}
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">{t("loadingMsg")}</div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm">{t("noTxMsg")}</p>
              <p className="text-xs mt-1">{t("noTxHint")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">{t("cityLabel")}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">{t("districtCol")}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">{t("typeCol")}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">{t("areaCol")}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">{t("totalPrice")}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">{t("priceSqmCol")}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">{t("sourceCol")}</th>
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
                      <td className="px-4 py-3 text-gray-600">{formatNum(tx.area)} {t("sqmAbbr")}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{formatNum(tx.price)} {t("sarAbbr")}</td>
                      <td className="px-4 py-3 text-green-700 font-semibold">{formatNum(tx.pricePerSqm)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{tx.source ?? "—"}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="text-red-400 hover:text-red-600 text-xs transition-colors"
                        >
                          {t("deleteOne")}
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
