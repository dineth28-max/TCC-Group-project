import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import DashboardShell from "./DashboardShell";
import { createStudent, listBranches } from "../api/students";
import { listClasses } from "../api/classes";

export default function StudentRegister() {
  const [branches, setBranches] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({
    fullName: "",
    dob: "",
    gender: "",
    contactPhone: "",
    parentName: "",
    parentContact: "",
    branchId: "",
    classIds: [],
    loginEmail: "",
    loginPassword: "",
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  useEffect(() => {
    listBranches().then((data) => {
      setBranches(data);
      if (data.length > 0) {
        setForm((f) => ({ ...f, branchId: String(data[0].id) }));
      }
    });
    listClasses().then(setClasses);
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleClass(classId) {
    setForm((f) => ({
      ...f,
      classIds: f.classIds.includes(classId)
        ? f.classIds.filter((id) => id !== classId)
        : [...f.classIds, classId],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const student = await createStudent({
        fullName: form.fullName,
        dob: form.dob,
        gender: form.gender || null,
        contactPhone: form.contactPhone || null,
        parentName: form.parentName || null,
        parentContact: form.parentContact || null,
        branchId: Number(form.branchId),
        classIds: form.classIds,
        loginEmail: form.loginEmail || null,
        loginPassword: form.loginPassword || null,
      });
      setCreated(student);
    } catch (err) {
      setError(err.response?.data?.message || "Could not register this student.");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <DashboardShell title="Student Registered">
        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6 max-w-md text-center space-y-4">
          <p className="text-green-700 font-medium">{created.fullName} registered successfully.</p>
          <p className="text-sm text-slate-500">
            Student ID: <span className="font-mono">{created.studentCode}</span>
          </p>
          <div className="flex justify-center py-4">
            <QRCodeSVG value={created.qrPayload} size={180} />
          </div>
          <p className="text-xs text-slate-500">
            Print or hand this QR code to the student now — it's their identity QR for attendance check-in.
          </p>
          {created.loginEmail && (
            <p className="text-xs text-violet-700">
              Login created: <span className="font-mono">{created.loginEmail}</span> — share the password you just set with the student.
            </p>
          )}
          <div className="flex gap-2 justify-center">
            <Link to={`/students/${created.id}`} className="text-violet-700 text-sm hover:underline">
              View profile
            </Link>
            <button
              onClick={() => setCreated(null)}
              className="text-slate-500 text-sm hover:underline"
            >
              Register another
            </button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Register Student">

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-violet-100 p-6 max-w-2xl space-y-4">
        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label htmlFor="reg-fullname" className="block text-sm text-slate-600 mb-1">Full Name</label>
            <input
              id="reg-fullname"
              required
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="reg-dob" className="block text-sm text-slate-600 mb-1">Date of Birth</label>
            <input
              id="reg-dob"
              type="date"
              required
              value={form.dob}
              onChange={(e) => update("dob", e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="reg-gender" className="block text-sm text-slate-600 mb-1">Gender</label>
            <select
              id="reg-gender"
              value={form.gender}
              onChange={(e) => update("gender", e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            >
              <option value="">—</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="reg-phone" className="block text-sm text-slate-600 mb-1">Contact Phone</label>
            <input
              id="reg-phone"
              value={form.contactPhone}
              onChange={(e) => update("contactPhone", e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="reg-branch" className="block text-sm text-slate-600 mb-1">Branch</label>
            <select
              id="reg-branch"
              required
              value={form.branchId}
              onChange={(e) => update("branchId", e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="reg-parentname" className="block text-sm text-slate-600 mb-1">Parent / Guardian Name</label>
            <input
              id="reg-parentname"
              value={form.parentName}
              onChange={(e) => update("parentName", e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="reg-parentcontact" className="block text-sm text-slate-600 mb-1">Parent / Guardian Contact</label>
            <input
              id="reg-parentcontact"
              value={form.parentContact}
              onChange={(e) => update("parentContact", e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div className="col-span-2 border-t border-slate-100 pt-3">
            <p className="text-sm font-medium text-slate-700 mb-1">Student Login (optional)</p>
            <p className="text-xs text-slate-500 mb-2">
              Fill both fields to create a login this student can use immediately. Leave both blank to register without a login.
            </p>
          </div>

          <div>
            <label htmlFor="reg-login-email" className="block text-sm text-slate-600 mb-1">Login Email</label>
            <input
              id="reg-login-email"
              type="email"
              value={form.loginEmail}
              onChange={(e) => update("loginEmail", e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="reg-login-password" className="block text-sm text-slate-600 mb-1">Login Password</label>
            <input
              id="reg-login-password"
              type="password"
              minLength={8}
              value={form.loginPassword}
              onChange={(e) => update("loginPassword", e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-2">Enroll in classes</label>
          {classes.length === 0 ? (
            <p className="text-xs text-slate-500">
              No classes exist yet — create one on the Classes page, or register without enrolling now.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {classes.map((c) => (
                <label
                  key={c.id}
                  className={`px-3 py-1.5 rounded border text-sm cursor-pointer ${
                    form.classIds.includes(c.id)
                      ? "bg-violet-50 border-violet-400 text-violet-700"
                      : "border-slate-300 text-slate-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={form.classIds.includes(c.id)}
                    onChange={() => toggleClass(c.id)}
                  />
                  {c.subject}
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-violet-700 hover:bg-violet-800 disabled:opacity-60 text-white rounded px-5 py-2 text-sm font-medium"
        >
          {submitting ? "Registering…" : "Register Student"}
        </button>
      </form>
    </DashboardShell>
  );
}
