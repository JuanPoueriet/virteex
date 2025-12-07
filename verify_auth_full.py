
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--no-sandbox", "--disable-gpu"])
        context = await browser.new_context(viewport={"width": 1280, "height": 720})
        page = await context.new_page()

        print("Navigating to Login...")
        try:
            await page.goto("http://localhost:4200/es/auth/login", timeout=30000)
            await page.wait_for_selector("app-auth-layout", timeout=15000)
            await page.screenshot(path="verify_login.png")
            print("Login screenshot saved.")
        except Exception as e:
            print(f"Error accessing Login: {e}")

        print("Navigating to Register...")
        try:
            await page.goto("http://localhost:4200/es/auth/register", timeout=30000)
            await page.wait_for_selector("app-auth-layout", timeout=15000)
            await page.screenshot(path="verify_register.png")
            print("Register screenshot saved.")
        except Exception as e:
            print(f"Error accessing Register: {e}")

        print("Navigating to Forgot Password...")
        try:
            await page.goto("http://localhost:4200/es/auth/forgot-password", timeout=30000)
            await page.wait_for_selector("app-auth-layout", timeout=15000)
            await page.screenshot(path="verify_forgot.png")
            print("Forgot Password screenshot saved.")
        except Exception as e:
            print(f"Error accessing Forgot Password: {e}")

        print("Navigating to Reset Password (Mock)...")
        try:
            await page.goto("http://localhost:4200/es/auth/reset-password", timeout=30000)
            await page.wait_for_selector("app-auth-layout", timeout=15000)
            await page.screenshot(path="verify_reset.png")
            print("Reset Password screenshot saved.")
        except Exception as e:
            print(f"Error accessing Reset Password: {e}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
