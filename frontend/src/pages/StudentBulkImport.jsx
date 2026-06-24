import { useState } from "react";
import DashboardShell from "./DashboardShell";
import { bulkImportStudents } from "../api/students";

export default function StudentBulkImport() {
  const [file, setFile] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await bulkImportStudents(file);
      setReport(result);
    } catch (err) {
      setError(err.response?.data?.message || "Could not import this file.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardShell title="Bulk Import Students">

      <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6 max-w-2xl space-y-4">
        <p className="text-sm text-slate-500">
          CSV columns: <code className="bg-violet-50 text-slate-700 px-1 rounded">FullName, Dob, BranchId, Gender, ContactPhone, ParentName, ParentContact</code>.
          Dob format: YYYY-MM-DD.
        </p>

        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}

        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <input
            aria-label="CSV file to import"
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files[0])}
            className="text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-violet-700 hover:bg-violet-800 disabled:opacity-60 text-white rounded px-4 py-2 text-sm"
          >
            {submitting ? "Importing…" : "Import"}
          </button>
        </form>

        {report && (
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              {report.successCount} of {report.totalRows} rows imported successfully.
            </p>
            <table className="w-full text-sm border border-violet-100 rounded overflow-hidden">
              <thead className="bg-violet-50 text-left">
                <tr>
                  <th className="px-3 py-1.5">Row</th>
                  <th className="px-3 py-1.5">Result</th>
                  <th className="px-3 py-1.5">Detail</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.rowNumber} className="border-t border-slate-100">
                    <td className="px-3 py-1.5">{r.rowNumber}</td>
                    <td className="px-3 py-1.5">
                      <span className={r.success ? "text-green-700" : "text-red-600"}>
                        {r.success ? "OK" : "Failed"}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-slate-500">{r.success ? r.studentCode : r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
