"""
Browser end-to-end smoke test for the running CSMAS stack (headless Chromium via Playwright).

Run inside the Playwright image so no local browser install is needed:
  docker run --rm -v "$PWD/scripts:/scripts" mcr.microsoft.com/playwright/python:v1.48.0-jammy \
    sh -c "pip install -q playwright==1.48.0 && python /scripts/ui_smoke_test.py http://host.docker.internal"

For every role it signs in through the real login form, opens every page that role can reach,
and fails on: uncaught JavaScript errors, API responses >= 500, the error-boundary screen, or a
page still stuck on "Loading" after the network goes idle. It also drives the search boxes the
way a user would. Screenshots of every page are written to /scripts/screenshots.
"""
import os
import sys

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost"
PASSWORD = "Passw0rd!"
SHOTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots")

ROLES = {
    "admin@demo.csmas": [
        "/admin", "/students", "/students/1", "/students/new", "/students/import", "/teachers", "/classes",
        "/timetable", "/attendance", "/risk-students", "/fees", "/counter-payments", "/class-revenue",
        "/teacher-revenues", "/teacher-bank-details", "/teacher-revenue-transactions", "/schedule-requests",
        "/announcements", "/notifications", "/branches", "/settings", "/audit-log",
    ],
    "branchadmin@demo.csmas": ["/branch", "/students", "/classes", "/timetable", "/fees", "/risk-students", "/attendance"],
    "teacher@demo.csmas": ["/teacher", "/teacher/attendance-qr", "/teacher/timetable", "/teacher/bank-details"],
    "parent@demo.csmas": ["/portal", "/portal/payments"],
    "student@demo.csmas": ["/student", "/student/payments"],
}

failures = []
checks = 0


def fail(where, what):
    failures.append(f"{where}: {what}")
    print(f"FAIL  {where}: {what}")


def run():
    global checks
    os.makedirs(SHOTS, exist_ok=True)
    with sync_playwright() as p:
        # The refresh-token cookie is Secure; treat the test origin as secure so it is kept.
        browser = p.chromium.launch(args=[f"--unsafely-treat-insecure-origin-as-secure={BASE}"])
        for email, paths in ROLES.items():
            context = browser.new_context(viewport={"width": 1440, "height": 900})
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(f"JS error: {e}"))
            page.on("response", lambda r: errors.append(f"HTTP {r.status} {r.request.method} {r.url}")
                    if r.status >= 500 else None)

            page.goto(f"{BASE}/login")
            page.fill("input[type=email]", email)
            page.fill("input[type=password]", PASSWORD)
            page.click("button[type=submit]")
            try:
                page.wait_for_url(lambda url: "/login" not in url, timeout=15000)
            except Exception:
                fail(email, "login did not leave the login page")
                context.close()
                continue

            role = email.split("@")[0]
            for path in paths:
                checks += 1
                errors.clear()
                page.goto(f"{BASE}{path}")
                try:
                    page.wait_for_load_state("networkidle", timeout=20000)
                except Exception:
                    pass
                page.wait_for_timeout(500)
                where = f"{role} {path}"
                if "/login" in page.url:
                    fail(where, "redirected to login (session lost or route not allowed)")
                body = page.inner_text("body")
                if "Something went wrong" in body:
                    fail(where, "error boundary shown")
                main_text = page.inner_text("main") if page.query_selector("main") else body
                if main_text.strip().endswith("Loading…") or main_text.strip() == "Loading...":
                    fail(where, "still loading after network idle")
                for e in errors:
                    fail(where, e)
                page.screenshot(path=os.path.join(SHOTS, f"{role}{path.replace('/', '_')}.png"), full_page=False)

            if role == "admin":
                checks += 1
                # Header global search: type a name, expect a student result, open it.
                page.goto(f"{BASE}/admin")
                page.wait_for_load_state("networkidle")
                header_search = page.locator("header input[role=combobox]")
                header_search.fill("Saman Jay")
                try:
                    page.locator("header button:has-text('Saman Jayasuriya')").first.wait_for(timeout=5000)
                    page.keyboard.press("Enter")
                    page.wait_for_url("**/students/**", timeout=5000)
                except Exception:
                    fail("admin header search", "typing 'Saman Jay' did not show/open the student")

                checks += 1
                # Students page live search (no Enter / Filter click).
                page.goto(f"{BASE}/students")
                page.wait_for_load_state("networkidle")
                page.fill("input[aria-label='Search students']", "STU-01-00001")
                page.wait_for_timeout(1500)
                rows = page.locator("tbody tr").count()
                if rows != 1:
                    fail("admin students live search", f"expected 1 row for STU-01-00001, got {rows}")

                checks += 1
                # AI model card + on-demand prediction from the trained model.
                page.goto(f"{BASE}/risk-students")
                page.wait_for_load_state("networkidle")
                if "students from this system" not in page.inner_text("main"):
                    fail("admin risk page", "model card does not show a CSMAS-trained model")
                page.fill("input[placeholder^='Search by student name or code']", "Saman")
                page.keyboard.press("Enter")
                try:
                    page.locator("button:has-text('Run AI Prediction')").first.click(timeout=8000)
                    page.locator("text=probability that this student drops out").wait_for(timeout=15000)
                    page.screenshot(path=os.path.join(SHOTS, "admin_risk_prediction.png"), full_page=True)
                except Exception:
                    fail("admin risk prediction", "running a prediction did not show a result")

            context.close()
        browser.close()

    print(f"\n{checks - len(failures)}/{checks} page checks passed. Screenshots: {SHOTS}")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    run()
