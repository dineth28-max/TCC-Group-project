import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import DashboardShell from "./DashboardShell";
import {
  getStudent,
  updateStudent,
  deactivateStudent,
  reactivateStudent,
  uploadStudentDocument,
  enrollStudent,
  unenrollStudent,
  listParentLinks,
  addParentLink,
  removeParentLink,
  setStudentCredentials,
} from "../api/students";
import { listClasses } from "../api/classes";
import { listUsers, createUser } from "../api/users";

export default function StudentDetail() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [classes, setClasses] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [docType, setDocType] = useState("Photo");
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [parentLinks, setParentLinks] = useState([]);
  const [parentOptions, setParentOptions] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [newParent, setNewParent] = useState({ fullName: "", email: "" });
  const [credentials, setCredentials] = useState({ loginEmail: "", loginPassword: "" });
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [temporaryPassword, setTemporaryPassword] = useState(null);

  const failed = (err, fallback) => setError(err?.response?.data?.message || fallback);

  async function load() {
    let data;
    try {
      data = await getStudent(id);
    } catch (err) {
      setLoadError(
        err?.response?.status === 404
          ? "This student does not exist, or belongs to a branch you cannot access."
          : err?.response?.data?.message || "Could not load this student. Please refresh the page."
      );
      return;
    }
    setLoadError(null);
    setStudent(data);
    setForm({
      fullName: data.fullName,
      dob: data.dob,
      gender: data.gender || "",
      contactPhone: data.contactPhone || "",
      parentName: data.parentName || "",
      parentContact: data.parentContact || "",
    });
  }

  async function loadParentLinks() {
    try {
      const [links, parents] = await Promise.all([listParentLinks(id), listUsers({ role: "Parent" })]);
      setParentLinks(links);
      setParentOptions(parents);
    } catch (err) {
      failed(err, "Could not load linked parents.");
    }
  }

  useEffect(() => {
    load();
    loadParentLinks();
    listClasses()
      .then(setClasses)
      .catch(() => setClasses([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleLinkExistingParent() {
    if (!selectedParentId) return;
    setError(null);
    setMessage(null);
    try {
      await addParentLink(id, Number(selectedParentId));
      setSelectedParentId("");
      setMessage("Parent linked.");
      loadParentLinks();
    } catch (err) {
      failed(err, "Could not link this parent.");
    }
  }

  async function handleCreateAndLinkParent(e) {
    e.preventDefault();
    setError(null);
    try {
      setMessage(null);
      setTemporaryPassword(null);
      const { user: created, temporaryPassword: tempPassword } = await createUser({
        fullName: newParent.fullName,
        email: newParent.email,
        role: "Parent",
        branchId: null,
      });
      await addParentLink(id, created.id);
      setNewParent({ fullName: "", email: "" });
      setMessage(`Parent account for ${created.fullName} created and linked.`);
      if (tempPassword) setTemporaryPassword({ name: created.fullName, password: tempPassword });
      loadParentLinks();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create/link parent.");
    }
  }

  async function handleUnlinkParent(linkId) {
    if (!window.confirm("Unlink this parent? They will no longer see this student in the parent portal.")) return;
    setError(null);
    setMessage(null);
    try {
      await removeParentLink(id, linkId);
      setMessage("Parent unlinked.");
      loadParentLinks();
    } catch (err) {
      failed(err, "Could not unlink this parent.");
    }
  }

  async function handleSetCredentials(e) {
    e.preventDefault();
    setError(null);
    try {
      await setStudentCredentials(id, credentials.loginEmail, credentials.loginPassword);
      setCredentials({ loginEmail: "", loginPassword: "" });
      setMessage("Login credentials saved.");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save login credentials.");
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    try {
      await updateStudent(id, form);
      setEditing(false);
      setMessage("Profile updated.");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save changes.");
    }
  }

  async function handleToggleStatus() {
    if (busy) return;
    const deactivating = student.status === "Active";
    if (deactivating && !window.confirm(`Deactivate ${student.fullName}? They will no longer be billed or marked in attendance.`)) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (deactivating) await deactivateStudent(id);
      else await reactivateStudent(id);
      setMessage(`Student ${deactivating ? "deactivated" : "reactivated"}.`);
      await load();
    } catch (err) {
      failed(err, "Could not change this student's status.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    try {
      await uploadStudentDocument(id, file, docType);
      setFile(null);
      setMessage("Document uploaded.");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not upload document.");
    }
  }

  async function handleEnroll(classId) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await enrollStudent(id, Number(classId));
      setMessage("Enrolled in class.");
      await load();
    } catch (err) {
      failed(err, "Could not enroll the student in this class.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnenroll(classId) {
    if (busy) return;
    if (!window.confirm("Remove the student from this class? Future invoices for it will stop.")) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await unenrollStudent(id, classId);
      setMessage("Removed from class.");
      await load();
    } catch (err) {
      failed(err, "Could not remove the student from this class.");
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <DashboardShell title="Student Profile">
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{loadError}</div>
      </DashboardShell>
    );
  }

  if (!student || !form) {
    return (
      <DashboardShell title="Student Profile">
        <p className="text-slate-500 text-sm">Loading…</p>
      </DashboardShell>
    );
  }

  const enrolledClassIds = student.classes.map((c) => c.id);
  // A student can only be enrolled in classes run at their own branch.
  const availableClasses = classes.filter((c) => c.branchId === student.branchId && !enrolledClassIds.includes(c.id));

  return (
    <DashboardShell title={`Student: ${student.fullName}`}>

      {message && <p className="text-green-700 text-sm mb-3">{message}</p>}
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {temporaryPassword && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 mb-4 text-sm">
          <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">
            One-Time Temporary Password for {temporaryPassword.name}
          </p>
          <p className="font-mono text-base font-bold text-amber-900 mt-1.5 select-all">{temporaryPassword.password}</p>
          <p className="text-amber-700 text-xs mt-1">
            Copy and deliver securely. They will be asked to choose their own password at first sign in.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-emerald-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Profile</h2>
            <div className="flex gap-3">
              <button onClick={() => setEditing((v) => !v)} className="text-sm text-emerald-700 hover:underline">
                {editing ? "Cancel" : "Edit"}
              </button>
              <button onClick={handleToggleStatus} disabled={busy} className="text-sm text-slate-500 hover:text-red-600 disabled:opacity-50">
                {student.status === "Active" ? "Deactivate" : "Reactivate"}
              </button>
            </div>
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="sd-fullname" className="block text-xs text-slate-500 mb-1">Full Name</label>
                <input
                  id="sd-fullname"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="sd-dob" className="block text-xs text-slate-500 mb-1">Date of Birth</label>
                <input
                  id="sd-dob"
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="sd-phone" className="block text-xs text-slate-500 mb-1">Contact Phone</label>
                <input
                  id="sd-phone"
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="sd-parentname" className="block text-xs text-slate-500 mb-1">Parent Name</label>
                <input
                  id="sd-parentname"
                  value={form.parentName}
                  onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="sd-parentcontact" className="block text-xs text-slate-500 mb-1">Parent Contact</label>
                <input
                  id="sd-parentcontact"
                  value={form.parentContact}
                  onChange={(e) => setForm({ ...form, parentContact: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <button type="submit" className="bg-emerald-700 text-white rounded px-4 py-2 text-sm">
                  Save
                </button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">Student Code</dt><dd className="font-mono">{student.studentCode}</dd></div>
              <div><dt className="text-slate-500">Status</dt><dd>{student.status}</dd></div>
              <div><dt className="text-slate-500">Date of Birth</dt><dd>{student.dob}</dd></div>
              <div><dt className="text-slate-500">Gender</dt><dd>{student.gender || "—"}</dd></div>
              <div><dt className="text-slate-500">Contact Phone</dt><dd>{student.contactPhone || "—"}</dd></div>
              <div><dt className="text-slate-500">Parent</dt><dd>{student.parentName || "—"}</dd></div>
              <div><dt className="text-slate-500">Parent Contact</dt><dd>{student.parentContact || "—"}</dd></div>
            </dl>
          )}

          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-medium text-slate-700 text-sm mb-2">Enrolled Classes</h3>
            {student.classes.length === 0 ? (
              <p className="text-xs text-slate-500 mb-2">Not enrolled in any class yet.</p>
            ) : (
              <ul className="text-sm space-y-1 mb-2">
                {student.classes.map((c) => (
                  <li key={c.id} className="flex items-center justify-between">
                    <span>{c.subject}</span>
                    <button onClick={() => handleUnenroll(c.id)} disabled={busy} className="text-xs text-slate-500 hover:text-red-600 disabled:opacity-50">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {availableClasses.length > 0 && (
              <select
                aria-label="Enroll in a class"
                onChange={(e) => e.target.value && handleEnroll(e.target.value)}
                value=""
                disabled={busy}
                className="border border-slate-300 rounded px-2 py-1 text-sm disabled:opacity-50"
              >
                <option value="">+ Enroll in a class…</option>
                {availableClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.subject}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-medium text-slate-700 text-sm mb-2">Documents</h3>
            {student.documents.length === 0 ? (
              <p className="text-xs text-slate-500 mb-2">No documents uploaded yet.</p>
            ) : (
              <ul className="text-sm space-y-1 mb-3">
                {student.documents.map((d) => (
                  <li key={d.id}>
                    {d.docType}: {d.originalFileName} ({d.fileSizeKb} KB)
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleUpload} className="flex gap-2 items-center">
              <select
                aria-label="Document type"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-sm"
              >
                <option value="Photo">Photo</option>
                <option value="BirthCertificate">Birth Certificate</option>
                <option value="Other">Other</option>
              </select>
              <input
                aria-label="Document file"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => setFile(e.target.files[0])}
                className="text-xs"
              />
              <button type="submit" className="bg-slate-200 hover:bg-slate-300 text-xs rounded px-3 py-1.5">
                Upload
              </button>
            </form>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-medium text-slate-700 text-sm mb-2">Login Credentials</h3>
            <p className="text-xs text-slate-500 mb-2">
              {student.loginEmail ? (
                <>Current login: <span className="font-mono">{student.loginEmail}</span></>
              ) : (
                "No login set up yet — this student can't sign in until one is set."
              )}
            </p>
            <form onSubmit={handleSetCredentials} className="flex gap-2 items-center">
              <input
                type="email"
                placeholder="Login email"
                required
                value={credentials.loginEmail}
                onChange={(e) => setCredentials({ ...credentials, loginEmail: e.target.value })}
                className="border border-slate-300 rounded px-2 py-1 text-sm flex-1"
              />
              <input
                type="password"
                placeholder="New password"
                required
                minLength={8}
                value={credentials.loginPassword}
                onChange={(e) => setCredentials({ ...credentials, loginPassword: e.target.value })}
                className="border border-slate-300 rounded px-2 py-1 text-sm flex-1"
              />
              <button type="submit" className="bg-emerald-700 text-white text-xs rounded px-3 py-1.5 whitespace-nowrap">
                {student.loginEmail ? "Reset Login" : "Create Login"}
              </button>
            </form>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-medium text-slate-700 text-sm mb-2">Linked Parents (Parent Portal access)</h3>
            {parentLinks.length === 0 ? (
              <p className="text-xs text-slate-500 mb-2">No parent account linked yet.</p>
            ) : (
              <ul className="text-sm space-y-1 mb-3">
                {parentLinks.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <span>
                      {p.parentName} <span className="text-slate-500 text-xs">({p.parentEmail})</span>
                    </span>
                    <button onClick={() => handleUnlinkParent(p.id)} className="text-xs text-slate-500 hover:text-red-600">
                      Unlink
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2 items-center mb-3">
              <select
                aria-label="Link an existing parent account"
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-sm flex-1"
              >
                <option value="">+ Link an existing parent account…</option>
                {parentOptions
                  .filter((p) => !parentLinks.some((l) => l.parentUserId === p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.email})
                    </option>
                  ))}
              </select>
              <button onClick={handleLinkExistingParent} className="bg-slate-200 hover:bg-slate-300 text-xs rounded px-3 py-1.5">
                Link
              </button>
            </div>

            <form onSubmit={handleCreateAndLinkParent} className="flex gap-2 items-center">
              <input
                placeholder="New parent full name"
                value={newParent.fullName}
                onChange={(e) => setNewParent({ ...newParent, fullName: e.target.value })}
                className="border border-slate-300 rounded px-2 py-1 text-sm flex-1"
              />
              <input
                type="email"
                placeholder="Email"
                value={newParent.email}
                onChange={(e) => setNewParent({ ...newParent, email: e.target.value })}
                className="border border-slate-300 rounded px-2 py-1 text-sm flex-1"
              />
              <button type="submit" className="bg-emerald-700 text-white text-xs rounded px-3 py-1.5 whitespace-nowrap">
                Create &amp; Link
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-emerald-100 p-6 text-center space-y-3">
          <h3 className="font-medium text-slate-700 text-sm">Identity QR Code</h3>
          <div className="flex justify-center">
            <QRCodeSVG value={student.qrPayload} size={160} role="img" aria-label={`Identity QR code for ${student.fullName}`} />
          </div>
          <p className="text-xs text-slate-500">Used for attendance check-in (Phase 3).</p>
        </div>
      </div>
    </DashboardShell>
  );
}
