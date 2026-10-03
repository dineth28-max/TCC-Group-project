"""
End-to-end API smoke + negative test for the running CSMAS stack.

Usage:  python scripts/api_smoke_test.py [base_url]
Default base_url: http://localhost:18080/api

Logs in as every seeded role, calls every endpoint the frontend uses, checks role/tenant
isolation, and sends malformed input to every write endpoint. Fails (exit 1) on any HTTP 5xx,
any unexpected status code, or any slow read (> 3 s). Write tests only touch data they create
themselves or revert, so it is safe to run repeatedly against the seeded demo database.
"""
import json
import sys
import time
import urllib.error
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:18080/api"
PASSWORD = "Passw0rd!"
SLOW_SECONDS = 3.0

results = []  # (ok, label, detail)


def call(method, path, token=None, body=None, raw=None, content_type="application/json"):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data is not None:
        req.add_header("Content-Type", content_type)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    for attempt in range(6):
        started = time.time()
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                payload = res.read()
                status = res.status
        except urllib.error.HTTPError as e:
            payload = e.read()
            status = e.code
        elapsed = time.time() - started
        if status != 429:
            break
        # Per-user rate limit hit (expected during a burst test) — wait for the window to slide.
        time.sleep(15)
    try:
        parsed = json.loads(payload) if payload else None
    except ValueError:
        parsed = None
    return status, parsed, elapsed


def check(label, method, path, token=None, expect=(200,), body=None, raw=None, content_type="application/json"):
    status, parsed, elapsed = call(method, path, token, body, raw, content_type)
    ok = status in expect and status < 500
    slow = method == "GET" and elapsed > SLOW_SECONDS
    detail = f"{method} {path} -> {status} in {elapsed:.2f}s"
    if not ok:
        detail += f" (expected {expect}) body={json.dumps(parsed)[:200] if parsed is not None else ''}"
    if slow:
        ok = False
        detail += " SLOW"
    results.append((ok, label, detail))
    return status, parsed


def login(email):
    status, parsed, _ = call("POST", "/auth/login", body={"email": email, "password": PASSWORD})
    if status != 200:
        print(f"FATAL: login failed for {email}: {status} {parsed}")
        sys.exit(1)
    return parsed["accessToken"]


def main():
    admin = login("admin@demo.csmas")
    branch = login("branchadmin2@demo.csmas")
    teacher = login("teacher@demo.csmas")
    parent = login("parent@demo.csmas")
    student = login("student@demo.csmas")
    other_admin = login("admin2@demo.csmas")

    # ---------------------------------------------------------------- auth
    check("login wrong password", "POST", "/auth/login", expect=(400, 401), body={"email": "admin@demo.csmas", "password": "nope"})
    check("login empty body", "POST", "/auth/login", expect=(400, 401), body={})
    check("login malformed json", "POST", "/auth/login", expect=(400,), raw=b"{not json")
    check("me unauthenticated", "GET", "/auth/me", expect=(401,))
    check("me with garbage token", "GET", "/auth/me", token="garbage", expect=(401,))
    for name, tok in [("admin", admin), ("branch", branch), ("teacher", teacher), ("parent", parent), ("student", student)]:
        check(f"me as {name}", "GET", "/auth/me", tok)
    check("change-password wrong current", "POST", "/auth/change-password", admin, expect=(400, 401),
          body={"currentPassword": "wrong", "newPassword": "Another1!"})
    check("change-password empty", "POST", "/auth/change-password", admin, expect=(400, 401), body={})

    # ---------------------------------------------------------------- admin reads
    period = time.strftime("%Y-%m")
    admin_reads = [
        "/admin/kpis", "/students", "/students?search=Saman", "/students?search=STU-01-0000",
        "/students?status=Inactive", "/students?branchId=2", "/students/1", "/students/1/parent-links",
        "/classes", "/classes/1/roster", "/users", "/users?role=Teacher", "/users?search=parent",
        "/branches", "/branches/1", "/timetable", "/timetable/requests", "/fees/structures",
        "/fees/discounts", f"/fees/invoices?period={period}", "/fees/invoices?studentId=1",
        "/fees/invoices?status=Overdue", "/fees/collection-summary", "/attendance/flagged",
        "/admin/risk-students", "/admin/risk-students?riskLevel=High", "/admin/risk-students?classId=1",
        "/teacher-revenue/summary", "/teacher-revenue/transactions",
        "/teacher-revenue/transactions?payoutStatus=Unpaid", "/teacher-revenue/bank-details/5",
        "/announcements", "/notifications/templates", "/notifications/delivery-log", "/settings",
        "/settings/payment-account", "/settings/revenue-split", "/settings/institute-bank-details",
        "/admin/audit-log", "/sessions", "/sessions?classId=1", "/sessions/classes/1/performance",
    ]
    for path in admin_reads:
        check(f"admin read {path}", "GET", path, admin)
    for path in ["/students/export", "/fees/export", f"/attendance/export?year={time.strftime('%Y')}&month={int(time.strftime('%m'))}"]:
        check(f"admin export {path}", "GET", path, admin)

    # ---------------------------------------------------------------- branch admin scoping
    check("branch kpis", "GET", "/admin/kpis", branch)
    status, students = check("branch students", "GET", "/students", branch)
    if students and any(s["branchId"] != 2 for s in students):
        results.append((False, "branch admin sees other branches' students", "GET /students"))
    check("branch admin cannot open Colombo student", "GET", "/students/1", branch, expect=(404, 403))
    check("branch admin cannot change settings", "PUT", "/settings", branch, expect=(403,), body={})

    # ---------------------------------------------------------------- tenant isolation
    check("other institute cannot open student 1", "GET", "/students/1", other_admin, expect=(404, 403))
    status, other_students = check("other institute student list", "GET", "/students", other_admin)
    if other_students:
        results.append((False, "tenant leak: other institute sees students", f"{len(other_students)} rows"))

    # ---------------------------------------------------------------- teacher
    for path in ["/sessions/my-classes", "/sessions", "/timetable", "/timetable/requests", "/teacher/bank-details",
                 "/sessions/classes/1/performance"]:
        check(f"teacher read {path}", "GET", path, teacher)
    check("teacher blocked from students", "GET", "/students", teacher, expect=(403,))
    check("teacher blocked from kpis", "GET", "/admin/kpis", teacher, expect=(403,))
    check("teacher session bad qr duration", "POST", "/sessions", teacher, expect=(400,), body={"classId": 1, "qrDurationMinutes": 999, "graceMinutes": 10})
    check("teacher session other teacher's class", "POST", "/sessions", teacher, expect=(403, 404), body={"classId": 50, "qrDurationMinutes": 10, "graceMinutes": 10})
    check("teacher timetable request missing body", "POST", "/timetable/requests", teacher, expect=(400,), body={})
    check("teacher bank details empty", "PUT", "/teacher/bank-details", teacher, expect=(400,), body={})

    # ---------------------------------------------------------------- parent
    status, children = check("parent children", "GET", "/portal/children", parent)
    for child in children or []:
        check(f"parent child {child['id']} attendance", "GET", f"/portal/children/{child['id']}/attendance", parent)
        check(f"parent child {child['id']} fees", "GET", f"/portal/children/{child['id']}/fees", parent)
    check("parent cannot see unlinked child", "GET", "/portal/children/500/fees", parent, expect=(404, 403))
    check("parent cannot pay unlinked child", "POST", "/portal/children/500/payments/checkout", parent, expect=(404, 403), body={"invoiceId": 1})
    check("parent announcements", "GET", "/portal/announcements", parent)
    check("parent notifications", "GET", "/portal/notifications", parent)
    check("parent blocked from admin", "GET", "/admin/kpis", parent, expect=(403,))
    check("parent blocked from risk", "GET", "/admin/risk-students", parent, expect=(403,))
    check("parent mark unknown notification", "POST", "/portal/notifications/999999/read", parent, expect=(404,))

    # ---------------------------------------------------------------- student
    for path in ["/me/profile", "/me/timetable", "/me/fees", "/me/notifications", "/me/parents"]:
        check(f"student read {path}", "GET", path, student)
    check("student blocked from risk", "GET", "/admin/risk-students", student, expect=(403,))
    check("student checkout someone else's invoice", "POST", "/me/payments/checkout", student, expect=(404, 400), body={"invoiceId": 999999})
    check("student add parent invalid", "POST", "/me/parents", student, expect=(400,), body={"parentName": "", "parentEmail": "", "password": "x"})
    check("student check-in garbage token", "POST", "/attendance/check-in", student, expect=(400, 404, 403),
          body={"qrToken": "garbage", "sessionId": 1, "lat": 6.9, "lng": 79.8})

    # ---------------------------------------------------------------- admin invalid writes (must be 4xx, never 5xx)
    invalid_writes = [
        ("POST", "/students", {}),
        ("POST", "/students", {"fullName": "X", "branchId": 99999, "dob": "2010-01-01"}),
        ("PUT", "/students/999999", {"fullName": "X"}),
        ("POST", "/students/999999/deactivate", None),
        ("POST", "/students/1/enrollments", {"classId": 999999}),
        ("POST", "/students/1/parent-links", {"parentUserId": 999999}),
        ("POST", "/students/1/credentials", {}),
        ("POST", "/classes", {}),
        ("POST", "/classes", {"subject": "X", "branchId": 99999}),
        ("PUT", "/classes/999999", {"subject": "X"}),
        ("POST", "/users", {}),
        ("POST", "/users", {"fullName": "X", "email": "teacher@demo.csmas", "role": "Teacher"}),
        ("POST", "/users", {"fullName": "X", "email": "x@y.z", "role": "SystemAdmin"}),
        ("PUT", "/users/999999", {"fullName": "X"}),
        ("POST", "/users/999999/reset-password", None),
        ("POST", "/branches", {}),
        ("PUT", "/branches/999999", {"name": "X"}),
        ("POST", "/fees/structures", {}),
        ("POST", "/fees/structures", {"classId": 1, "amount": -5}),
        ("POST", "/fees/discounts", {}),
        ("POST", "/fees/discounts", {"studentId": 1, "type": "Sibling", "percentOff": 150}),
        ("DELETE", "/fees/discounts/999999", None),
        ("POST", "/fees/invoices/999999/payments", {"amount": 100, "method": "Cash"}),
        ("POST", "/fees/invoices/1/payments", {"amount": -1, "method": "Cash"}),
        ("POST", "/fees/invoices/1/payments", {"amount": 99999999, "method": "Cash"}),
        ("POST", "/timetable", {}),
        ("POST", "/timetable", {"classId": 1, "dayOfWeek": "Funday", "startTime": "10:00", "endTime": "09:00"}),
        ("DELETE", "/timetable/999999", None),
        ("POST", "/timetable/requests/999999/approve", None),
        ("POST", "/timetable/requests/999999/reject", {}),
        ("POST", "/announcements", {}),
        ("DELETE", "/announcements/999999", None),
        ("PUT", "/notifications/templates/NotARealEvent", {"subject": "x", "body": "y"}),
        ("PUT", "/settings", {"attendanceThresholdPercent": 500}),
        ("PUT", "/settings/revenue-split", {"commissionPercent": 250}),
        ("PUT", "/settings/payment-account", {}),
        ("PUT", "/settings/institute-bank-details", {}),
        ("PUT", "/teacher-revenue/bank-details/5", {}),
        ("POST", "/teacher-revenue/transactions/999999/mark-paid", None),
        ("POST", "/admin/risk-students/999999/predict", None),
        ("POST", "/students/bulk-import", None),
    ]
    for method, path, body in invalid_writes:
        check(f"invalid {method} {path}", method, path, admin, expect=(400, 404, 409, 415), body=body,
              raw=b"" if body is None and method == "POST" else None)
    check("malformed json to /students", "POST", "/students", admin, expect=(400,), raw=b"{bad")
    check("wrong type to /fees/structures", "POST", "/fees/structures", admin, expect=(400,), body={"classId": "abc", "amount": "lots"})
    check("payment webhook unsigned", "POST", "/payments/webhook", expect=(400, 401, 404), body={"transactionId": 1})

    # ---------------------------------------------------------------- valid write round-trips
    status, ann = check("create announcement", "POST", "/announcements", admin,
                        body={"title": "Smoke test", "body": "Created by api_smoke_test.py", "branchId": None})
    if ann and "id" in ann:
        check("delete announcement", "DELETE", f"/announcements/{ann['id']}", admin, expect=(200, 204))
    check("deactivate student", "POST", "/students/3/deactivate", admin, expect=(200, 204))
    check("reactivate student", "POST", "/students/3/reactivate", admin, expect=(200, 204))
    check("risk predict now", "POST", "/admin/risk-students/1/predict", admin, expect=(200,))

    # ---------------------------------------------------------------- profile, revenue, enrollment rules
    check("profile empty name", "PUT", "/auth/profile", teacher, expect=(400,), body={"fullName": " ", "phoneNumber": None})
    check("profile bad phone", "PUT", "/auth/profile", teacher, expect=(400,), body={"fullName": "Dilani Fernando", "phoneNumber": "call me maybe"})
    check("profile update", "PUT", "/auth/profile", teacher, expect=(204,), body={"fullName": "Dilani Fernando", "phoneNumber": "0771234567"})
    status, me = check("profile persisted", "GET", "/auth/me", teacher)
    if me and me.get("phoneNumber") != "0771234567":
        results.append((False, "profile phone not persisted", json.dumps(me)[:200]))
    status, me = check("me has branch name", "GET", "/auth/me", branch)
    if me and not me.get("branchName"):
        results.append((False, "branch admin /auth/me has no branchName", json.dumps(me)[:200]))
    status, by_class = check("class revenue this month", "GET", f"/teacher-revenue/by-class?from={time.strftime('%Y-%m')}-01&to={time.strftime('%Y-%m-%d')}", admin)
    if by_class is not None and len(by_class) == 0:
        results.append((False, "class revenue empty for current month", ""))
    check("class revenue inverted range", "GET", "/teacher-revenue/by-class?from=2026-12-31&to=2026-01-01", admin, expect=(400,))
    # Student 1 is in Colombo (branch 1); class 61+ are Gampaha classes.
    check("enroll in other branch's class rejected", "POST", "/students/1/enrollments", admin, expect=(400,),
          raw=b"75", content_type="application/json")

    # ---------------------------------------------------------------- AI risk model
    status, model = check("risk model info", "GET", "/admin/risk-students/model", admin)
    if model and model.get("source") != "csmas":
        results.append((False, "risk model not trained on CSMAS data", json.dumps(model)[:200]))
    check("branch admin cannot retrain model", "POST", "/admin/risk-students/model/train", branch, expect=(403,))
    status, trained = check("retrain model on CSMAS data", "POST", "/admin/risk-students/model/train", admin)
    if trained:
        m = trained["model"]
        print(f"  model: {m['trainingRows']} students, {m['dropouts']} dropouts, accuracy {m['accuracy']}, "
              f"ROC-AUC {m['rocAuc']}, re-scored {trained['studentsScored']}")
        if trained["studentsScored"] < 1000:
            results.append((False, "retrain re-scored too few students", str(trained["studentsScored"])))
    status, cls = check("predict entire class", "POST", "/admin/risk-students/predict-class/1", admin)
    if cls and cls["succeeded"] != cls["totalStudents"]:
        results.append((False, "class prediction incomplete", f"{cls['succeeded']}/{cls['totalStudents']}"))

    # ---------------------------------------------------------------- report
    failures = [r for r in results if not r[0]]
    for ok, label, detail in results:
        if not ok:
            print(f"FAIL  {label}: {detail}")
    print(f"\n{len(results) - len(failures)}/{len(results)} checks passed.")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
