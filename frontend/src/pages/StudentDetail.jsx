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

  async function load() {
    const data = await getStudent(id);
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
    setParentLinks(await listParentLinks(id));
    setParentOptions(await listUsers({ role: "Parent" }));
  }

  useEffect(() => {
    load();
    loadParentLinks();
    listClasses().then(setClasses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleLinkExistingParent() {
    if (!selectedParentId) return;
    await addParentLink(id, Number(selectedParentId));
    setSelectedParentId("");
    loadParentLinks();
  }

  async function handleCreateAndLinkParent(e) {
    e.preventDefault();
    setError(null);
    try {
      const created = await createUser({ fullName: newParent.fullName, email: newParent.email, role: "Parent", branchId: null });
      await addParentLink(id, created.id);
      setNewParent({ fullName: "", email: "" });
      setMessage("Parent account created and linked (demo default password).");
      loadParentLinks();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create/link parent.");
    }
  }

  async function handleUnlinkParent(linkId) {
    await removeParentLink(id, linkId);
    loadParentLinks();
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
    if (student.status === "Active") {
      await deactivateStudent(id);
    } else {
      await reactivateStudent(id);
    }
    load();
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
    await enrollStudent(id, Number(classId));
    load();
  }

  async function handleUnenroll(classId) {
    await unenrollStudent(id, classId);
    load();
  }

  if (!student || !form) {
    return (
      <DashboardShell title="Student Profile">
        <p className="text-slate-500 text-sm">Loading…</p>
      </DashboardShell>
    );
  }

  const enrolledClassIds = student.classes.map((c) => c.id);
  const availableClasses = classes.filter((c) => !enrolledClassIds.includes(c.id));

  return (
    <DashboardShell title={`Student: ${student.fullName}`}>

      {message && <p className="text-green-700 text-sm mb-3">{message}</p>}
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-lg shadow-sm border border-violet-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Profile</h2>
            <div className="flex gap-3">
              <button onClick={() => setEditing((v) => !v)} className="text-sm text-violet-700 hover:underline">
                {editing ? "Cancel" : "Edit"}
              </button>
              <button onClick={handleToggleStatus} className="text-sm text-slate-500 hover:text-red-600">
                {student.status === "Active" ? "Deactivate" : "Reactivate"}
              </button>
            </div>
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
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
              <div className="col-span-2">
                <button type="submit" className="bg-violet-700 text-white rounded px-4 py-2 text-sm">
                  Save
                </button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-2 gap-3 text-sm">
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
                    <button onClick={() => handleUnenroll(c.id)} className="text-xs text-slate-500 hover:text-red-600">
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
                className="border border-slate-300 rounded px-2 py-1 text-sm"
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
              <button type="submit" className="bg-violet-700 text-white text-xs rounded px-3 py-1.5 whitespace-nowrap">
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
              <button type="submit" className="bg-violet-700 text-white text-xs rounded px-3 py-1.5 whitespace-nowrap">
                Create &amp; Link
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6 text-center space-y-3">
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
