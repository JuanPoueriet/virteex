
from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Test Global Login
        print("Navigating to Global Login...")
        try:
            page.goto("http://localhost:4200/es/auth/login", timeout=30000)
            page.wait_for_selector('app-login', timeout=10000)
            print("Login page loaded.")
            page.screenshot(path="/home/jules/verification/login.png")
        except Exception as e:
            print(f"Login navigation failed: {e}")

        # Test Country Specific Register
        print("Navigating to Register...")
        try:
            page.goto("http://localhost:4200/do/es/auth/register", timeout=30000)
            page.wait_for_selector('app-register', timeout=10000)
            print("Register page loaded.")

            # Check for new Select inputs
            page.screenshot(path="/home/jules/verification/register_step1.png")

            # Fill first step to see next steps
            page.fill('input[formControlName="firstName"]', 'Test')
            page.fill('input[formControlName="lastName"]', 'User')
            page.fill('input[formControlName="email"]', 'testuser@example.com')
            page.fill('input[formControlName="password"]', 'StrongPass1!')
            page.fill('input[formControlName="confirmPassword"]', 'StrongPass1!')

            # Click next
            next_btn = page.locator('button.primary-button').first
            next_btn.click()
            time.sleep(1)

            # Step 2: Business Info - Check Selects
            page.screenshot(path="/home/jules/verification/register_step2.png")

        except Exception as e:
            print(f"Register navigation failed: {e}")

        browser.close()

if __name__ == "__main__":
    run()
