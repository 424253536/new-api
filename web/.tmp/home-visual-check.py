import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
OUTPUT = Path(__file__).parent
errors = []
status = {
    "system_name": "New API",
    "logo": "/logo.png",
    "setup": True,
    "docs_link": "https://docs.newapi.pro",
}
content = {"value": ""}

def handle_api(route):
    path = route.request.url.split("?")[0]
    if path.endswith("/api/status"):
        data = status
    elif path.endswith("/api/setup"):
        data = {"status": True}
    elif path.endswith("/api/notice"):
        data = ""
    elif path.endswith("/api/home_page_content"):
        data = content["value"]
    elif "/auth/refresh" in path:
        route.fulfill(status=401, json={"success": False})
        return
    else:
        data = []
    route.fulfill(json={"success": True, "data": data})

def reveal_sections(page):
    for section in page.locator(".home-landing section").all():
        section.scroll_into_view_if_needed()
    page.evaluate("window.scrollTo(0, 0)")
    page.evaluate("document.fonts.ready")
    page.wait_for_function("""() => [...document.querySelectorAll('.home-landing img')].every(img => img.complete)""")

def check_bounds(page):
    expect(page.locator("main.home-landing")).to_be_visible()
    overflow = page.locator("main.home-landing").evaluate("""root => [...root.querySelectorAll('h1, h2, h3, a, button, pre, [role=tablist]')].filter(el => {
      if (!el.getClientRects().length) return false;
      const r = el.getBoundingClientRect();
      return r.left < -1 || r.right > document.documentElement.clientWidth + 1;
    }).map(el => ({tag: el.tagName, text: el.textContent, width: el.getBoundingClientRect().width}))""")
    assert not overflow, overflow

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={"width": 1440, "height": 1000}, locale="zh-CN", reduced_motion="reduce")
    context.route("**/api/**", handle_api)
    context.route("https://ccswitch.io/**", lambda route: route.abort())
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: print(message.type, message.text) if message.type in ["error", "warning"] else None)
    page.goto(BASE)
    try:
        expect(page.locator(".home-network")).to_be_visible(timeout=20000)
    except Exception:
        print(page.url, page.locator('body').inner_text(), errors)
        raise
    reveal_sections(page)
    check_bounds(page)
    assert page.locator(".home-orbit-outer").evaluate("(el) => getComputedStyle(el).animationName") == "none"
    page.screenshot(path=str(OUTPUT / "home-desktop-light.png"), full_page=True, animations="disabled")
    page.screenshot(path=str(OUTPUT / "home-hero-light.png"), animations="disabled")

    page.evaluate("document.documentElement.classList.add('dark')")
    page.screenshot(path=str(OUTPUT / "home-desktop-dark.png"), full_page=True, animations="disabled")
    page.evaluate("document.documentElement.classList.remove('dark')")

    for width, height in [(375, 812), (320, 720), (768, 1024), (812, 375)]:
        page.set_viewport_size({"width": width, "height": height})
        reveal_sections(page)
        check_bounds(page)
        if width == 375:
            page.screenshot(path=str(OUTPUT / "home-mobile.png"), full_page=True, animations="disabled")

    page.set_viewport_size({"width": 1440, "height": 1000})
    page.emulate_media(reduced_motion="no-preference")
    toggle = page.get_by_role("button", name="暂停动画")
    toggle.click()
    expect(toggle).to_have_attribute("aria-pressed", "true")
    assert page.locator(".home-orbit-outer").evaluate("(el) => getComputedStyle(el).animationPlayState") == "paused"
    toggle.click()
    assert page.locator(".home-orbit-outer").evaluate("(el) => getComputedStyle(el).animationPlayState") == "running"
    page.emulate_media(reduced_motion="reduce")
    assert page.locator(".home-orbit-outer").evaluate("(el) => getComputedStyle(el).animationName") == "none"
    expect(toggle).to_be_hidden()

    for name, endpoint in [("Responses", "/v1/responses"), ("Claude", "/v1/messages"), ("Gemini", "/v1beta/models/your-model:generateContent")]:
        page.get_by_role("tab", name=name, exact=True).click()
        expect(page.get_by_role("tabpanel", name=name)).to_contain_text(endpoint)
        expect(page.locator('.home-code-panel:visible')).to_have_count(1)

    for language in ["en", "fr", "ru", "ja", "vi", "zhTW"]:
        page.evaluate("(lang) => localStorage.setItem('i18nextLng', lang)", language)
        page.reload()
        expect(page.locator(".home-network")).to_be_visible()
        page.set_viewport_size({"width": 375, "height": 812})
        reveal_sections(page)
        check_bounds(page)

    assert not errors, errors
    print(json.dumps({"result": "passed", "viewports": ["1440x1000", "375x812", "320x720", "768x1024", "812x375"], "checks": ["light and dark", "responsive bounds", "reduced motion", "pause and resume", "protocol tabs", "locale layouts"], "screenshots": str(OUTPUT)}, ensure_ascii=False))
    browser.close()
