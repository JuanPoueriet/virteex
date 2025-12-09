
from playwright.sync_api import sync_playwright
import time
import random
import string
import sys

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase, k=length))

def random_email():
    return f"test.{random_string()}@example.com"

def random_tax_id(length=9):
    return ''.join(random.choices(string.digits, k=length))

def run_test(country_code, country_name, tax_id_label, tax_id_value):
    print(f"[{country_code}] Navigating to register page...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        try:
            page.goto(f"http://localhost:4200/es/{country_code}/auth/register")
            # Take initial screenshot to see if app loaded
            page.wait_for_timeout(3000) # wait 3s for rendering
            page.screenshot(path=f"{country_code}_loaded.png")

            # Check for generic errors or modals
            if page.is_visible("app-geo-mismatch-modal"):
                 print(f"[{country_code}] Geo Mismatch Modal detected. Closing...")
                 # try to close it if possible, or just note it
                 # page.click("button.close") # hypothetical

            print(f"[{country_code}] Filling Step 1...")
            page.fill("input[formControlName='firstName']", "Test")
            page.fill("input[formControlName='lastName']", "User")
            page.fill("input[formControlName='email']", random_email())
            page.fill("input[formControlName='password']", "Password123!")
            page.fill("input[formControlName='confirmPassword']", "Password123!")

            page.click("button[type='submit']")

            print(f"[{country_code}] Filling Step 2 (Tax ID: {tax_id_value})...")
            page.wait_for_selector("input[formControlName='taxId']")
            page.fill("input[formControlName='taxId']", tax_id_value)

            time.sleep(1)
            page.click("button.bg-primary")

            print(f"[{country_code}] Filling Step 3...")
            page.wait_for_selector("input[formControlName='companyName']", timeout=10000)

            page.fill("input[formControlName='companyName']", f"Test Corp {country_code}")
            page.select_option("select[formControlName='industry']", index=1)
            page.select_option("select[formControlName='numberOfEmployees']", index=1)

            page.click("button.bg-primary")

            print(f"[{country_code}] Filling Step 4...")
            page.wait_for_selector("input[type='checkbox']")
            page.check("input[type='checkbox']")

            page.click("button.bg-primary")

            print(f"[{country_code}] Waiting for success redirect...")
            page.wait_for_url("**/auth/plan-selection", timeout=30000)
            print(f"[{country_code}] Registration SUCCESS! Redirected to plan selection.")

        except Exception as e:
            print(f"[{country_code}] Test FAILED: {e}")
            page.screenshot(path=f"{country_code}_failure.png")
            browser.close()
            return False

        browser.close()
        return True

if __name__ == "__main__":
    do_tax_id = random_tax_id(9)
    us_tax_id = random_tax_id(9)

    success = True
    if not run_test("do", "República Dominicana", "RNC", do_tax_id):
        success = False

    # if not run_test("us", "United States", "EIN", us_tax_id):
    #    success = False

    if not success:
        sys.exit(1)
    print("ALL VERIFICATIONS PASSED.")
