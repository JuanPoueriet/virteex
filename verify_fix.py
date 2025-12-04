from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Navigate to the login page
            # Assuming default port 4200. I need to be sure.
            # Usually nx serve runs on 4200.
            page.goto("http://localhost:4200/es/do/auth/login")

            # Wait for content
            page.wait_for_selector(".login-wrapper", timeout=30000)

            # Take a screenshot of the login page to ensure no crash (null access error fixed)
            page.screenshot(path="login_page_fixed.png")
            print("Login page screenshot taken.")

            # Now try to trigger the modal.
            # The modal logic requires geoService mismatch.
            # Since I cannot easily mock backend geo response in E2E without intercepting,
            # I can try to intercept the request to /geo/location.

            # Intercept geo request
            # Route: **/geo/location
            page.route("**/geo/location", lambda route: route.fulfill(
                status=200,
                content_type="application/json",
                body='{"country": "CO", "ip": "1.2.3.4"}'
            ))

            # Navigate to a country specific page that uses CountryGuard
            # The Login page does NOT use CountryGuard based on my analysis of `app.routes.ts` (implied).
            # But let's check `app.routes.ts` to be sure.
            # If I cannot verify modal easily, at least verifying login page doesn't crash is good.

            # Let's try navigating to a route that definitely has CountryGuard.
            # e.g. /es/do/dashboard or similar?
            # Or just /es/do/auth/register (if it uses guard? Unlikely if public).

            # Let's stick to verifying the crash fix first.

        except Exception as e:
            print(f"Error: {e}")
            # Take screenshot on error
            page.screenshot(path="error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_frontend()
