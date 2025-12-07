
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--no-sandbox", "--disable-gpu"])
        context = await browser.new_context(viewport={"width": 1280, "height": 720})
        page = await context.new_page()

        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"BROWSER ERROR: {err}"))

        print("Navigating to Login...")
        try:
            await page.goto("http://localhost:4200/auth/login", timeout=30000)
            await page.wait_for_timeout(5000) # Wait for redirects
            print(f"Current URL: {page.url}")
            await page.screenshot(path="verify_login_debug_2.png")
            await page.wait_for_selector("app-auth-layout", timeout=15000)
            print("Login success.")
        except Exception as e:
            print(f"Error accessing Login: {e}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
