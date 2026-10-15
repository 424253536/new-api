"""Browser regression and visual QA. Requires Python Playwright and Chromium.

Run from web/: python src/features/home/__tests__/homepage.browser.py [base_url]
API fixtures isolate the public page by default; --live verifies the running backend.
"""
import json
import re
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5174"
OUTPUT = Path(__file__).resolve().parents[4] / ".tmp" / "home-redesign"
OUTPUT.mkdir(parents=True, exist_ok=True)
STATUS = {"system_name": "New API", "logo": "/logo.png", "setup": True,
          "docs_link": "https://docs.newapi.pro"}


def handle_api(route):
    path = route.request.url.split("?")[0]
    data = []
    if path.endswith("/api/status"):
        data = STATUS
    elif path.endswith("/api/setup"):
        data = {"status": True}
    elif path.endswith(("/api/notice", "/api/home_page_content", "/api/about")):
        data = ""
    elif "/auth/refresh" in path:
        route.fulfill(status=401, json={"success": False})
        return
    route.fulfill(json={"success": True, "data": data})


def check_layout(page):
    expect(page.locator("main.home-landing")).to_be_visible()
    overflow = page.locator("main.home-landing").evaluate("""root =>
      [...root.querySelectorAll('h1, h2, h3, a, button, pre, [role=tablist]')]
      .filter(el => {
        if (!el.getClientRects().length) return false;
        const r = el.getBoundingClientRect();
        return r.left < -1 || r.right > document.documentElement.clientWidth + 1;
      }).map(el => ({ tag: el.tagName, text: el.textContent }))""")
    assert not overflow, overflow
    assert page.locator("h1").count() == 1
    expect(page.locator('.home-banner button')).to_have_count(0)
    expect(page.locator('.home-hero-video')).to_have_js_property('controls', False)
    assert page.locator('.home-hero-media').evaluate("""el =>
      el.getBoundingClientRect().top >= document.querySelector('.home-hero-actions').getBoundingClientRect().bottom - 1
    """), 'The AI artwork must sit below the primary actions rather than overlap them'
    expect(page.locator('.home-cta-section')).to_have_count(0)
    footer = page.get_by_role('contentinfo')
    expect(footer.get_by_role('img')).to_have_count(0)
    expect(footer.locator('a[href="https://github.com/QuantumNous/new-api"]')).to_have_count(1)
    assert footer.evaluate('el => el.getBoundingClientRect().height') < 240, 'The footer must not retain the promotional block or its empty space'
    expect(page.locator('main a[href="/sign-up"]')).to_have_count(1)
    if page.viewport_size['width'] >= 768 or page.locator('main').get_attribute('lang').startswith('zh'):
        assert page.locator('.home-headline').evaluate("el => el.getBoundingClientRect().height < parseFloat(getComputedStyle(el).lineHeight) * 1.5"), 'The compact headline should fit on one line'
    expect(page.locator(".home-feature-card")).to_have_count(4)
    for container in page.locator(".home-container").all():
        assert container.evaluate("""el => {
          const r = el.getBoundingClientRect();
          const expected = Math.min(innerWidth - (innerWidth < 768 ? 40 : 64), 1216);
          return Math.abs(r.width - expected) <= 1 && r.left >= 0;
        }"""), "Page sections should share the same responsive content width"
    assert page.locator('.home-hero-copy').evaluate("""el => {
      const heading = el.querySelector('h1').getBoundingClientRect();
      return Math.abs(heading.left - el.getBoundingClientRect().left) <= 1;
    }"""), 'The hero headline should align with the content grid'
    assert page.locator(".home-feature-grid").evaluate("""el => {
      const cells = [...el.children].map(item => item.getBoundingClientRect());
      if (innerWidth < 768) return cells.every((cell, index) => !index || cell.top >= cells[index - 1].bottom);
      return cells[1].top >= cells[0].bottom && cells[2].left >= cells[1].right &&
        cells[3].top >= cells[1].bottom && cells[4].left >= cells[3].right;
    }"""), "Feature panels must form an aligned grid without overlaps"
    assert page.locator(".home-features").evaluate("""el =>
      el.getBoundingClientRect().top - document.querySelector('.home-stats-section').getBoundingClientRect().bottom <= 32
    """), "Large blank section gaps must not return"
    for section in page.locator(".home-landing section").all():
        section.scroll_into_view_if_needed()
    page.evaluate("window.scrollTo(0, 0)")
    page.evaluate("document.fonts.ready")


def check_video_motion(page):
    page.wait_for_function("""() => {
      const video = document.querySelector('.home-hero-video');
      return video && !video.paused && video.readyState >= 2;
    }""", timeout=20000)
    video = page.locator('.home-hero-video')
    expect(video).to_have_attribute('data-ready', 'true')
    page.wait_for_function("getComputedStyle(document.querySelector('.home-hero-video')).opacity === '1'")
    # Observe decoded frames from uninterrupted playback; never seek the video.
    sample = video.evaluate("""el => new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Video did not produce moving frames')), 15000);
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 72;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      let first;
      function sampleFrame(_, frame) {
        // Compare the neural core, not the intentionally empty outer margins.
        ctx.drawImage(el, el.videoWidth * 0.25, el.videoHeight * 0.15,
          el.videoWidth * 0.5, el.videoHeight * 0.75, 0, 0, canvas.width, canvas.height);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        if (!first) first = { time: frame.mediaTime, count: frame.presentedFrames, pixels };
        const elapsed = (frame.mediaTime - first.time + el.duration) % el.duration;
        if (elapsed >= 1.25) {
          let changed = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            const delta = Math.abs(pixels[i] - first.pixels[i]) +
              Math.abs(pixels[i + 1] - first.pixels[i + 1]) +
              Math.abs(pixels[i + 2] - first.pixels[i + 2]);
            if (delta > 24) changed++;
          }
          clearTimeout(timeout);
          resolve({ source: el.currentSrc, elapsed,
            decodedFrames: frame.presentedFrames - first.count,
            changedFraction: changed / (pixels.length / 4) });
          return;
        }
        el.requestVideoFrameCallback(sampleFrame);
      }
      el.requestVideoFrameCallback(sampleFrame);
    })""")
    assert sample['decodedFrames'] > 1, sample
    assert sample['changedFraction'] > 0.12, sample
    return sample


with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={"width": 1440, "height": 1000},
                                  locale="zh-CN", color_scheme="light",
                                  reduced_motion="reduce")
    if "--live" not in sys.argv:
        context.route("**/api/**", handle_api)
        context.route("https://ccswitch.io/**", lambda route: route.abort())
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(BASE)
    try:
        expect(page.locator(".home-hero-image")).to_be_visible(timeout=60000)
    except AssertionError:
        print(json.dumps({"url": page.url, "body": page.locator("body").inner_text(), "errors": errors}))
        page.screenshot(path=str(OUTPUT / "failure.png"))
        raise
    expect(page.get_by_role('tab', name='Chat', exact=True)).to_have_count(0)
    check_layout(page)
    expect(page.get_by_role('tab', name='Chat', exact=True)).to_be_attached(timeout=20000)
    expect(page.locator('.home-provider-logos li:has(svg)')).to_have_count(6, timeout=20000)
    expect(page.locator('.home-map-models > div:has(svg)')).to_have_count(6, timeout=20000)
    assert page.locator('.home-hero-image').evaluate("async el => { await el.decode(); return el.naturalWidth > 0; }")
    assert page.locator('.home-hero-copy').evaluate("el => getComputedStyle(el).animationName") == 'none'
    expect(page.locator('.home-hero-video')).to_have_js_property('paused', True)
    expect(page.locator('.home-hero-video')).to_have_js_property('currentTime', 0)
    expect(page.locator('.home-hero-video')).to_have_attribute('data-ready', 'false')
    expect(page.locator('.home-banner button')).to_have_count(0)
    page.screenshot(path=str(OUTPUT / "desktop-light.png"), full_page=True)
    page.screenshot(path=str(OUTPUT / "hero-light.png"))

    page.emulate_media(color_scheme="dark")
    expect(page.locator("html")).to_have_class(re.compile(r"\bdark\b"))
    expect(page.locator('.home-hero-video')).to_have_attribute('src', re.compile(r'gateway-neural-dark\.mp4$'))
    page.locator('.home-hero-image').evaluate('el => el.decode()')
    page.screenshot(path=str(OUTPUT / "desktop-dark.png"), full_page=True)
    page.screenshot(path=str(OUTPUT / "hero-dark.png"))
    page.emulate_media(color_scheme="light")

    for width, height in [(375, 812), (320, 720), (768, 1024), (1024, 768), (812, 375), (1920, 1080)]:
        page.set_viewport_size({"width": width, "height": height})
        check_layout(page)
        suffix = '-small.mp4' if width < 768 else '-light.mp4'
        expect(page.locator('.home-hero-video')).to_have_attribute('src', re.compile(re.escape(suffix) + '$'))
        if width == 375:
            page.locator('.home-hero-image').evaluate('el => el.decode()')
            page.screenshot(path=str(OUTPUT / "mobile.png"), full_page=True)

    motion_samples = []
    if "--quick" not in sys.argv:
        page.set_viewport_size({"width": 1440, "height": 1000})
        page.emulate_media(reduced_motion="no-preference")
        page.evaluate("() => Promise.all(document.querySelector('.home-hero-copy').getAnimations().map(animation => animation.finished))")
        assert page.locator('.home-hero-copy').evaluate("el => getComputedStyle(el).opacity") == '1'
        banner = page.locator('.home-hero-video')
        motion_samples.append(check_video_motion(page))
        expect(banner).to_have_js_property('autoplay', True)
        page.locator('.home-hero a[href="/sign-up"]').focus()
        page.keyboard.press('Tab')
        expect(page.locator('.home-docs')).to_be_focused()
        page.keyboard.press('Tab')
        expect(page.locator('.home-provider-link')).to_be_focused()
        page.locator('.home-terminal').scroll_into_view_if_needed()
        expect(banner).to_have_js_property('paused', True)
        page.evaluate('window.scrollTo(0, 0)')
        expect(banner).to_have_js_property('paused', False)

        page.emulate_media(color_scheme='dark')
        expect(banner).to_have_attribute('src', re.compile(r'gateway-neural-dark\.mp4$'))
        motion_samples.append(check_video_motion(page))
        page.set_viewport_size({'width': 375, 'height': 812})
        expect(banner).to_have_attribute('src', re.compile(r'gateway-neural-dark-small\.mp4$'))
        motion_samples.append(check_video_motion(page))
        page.screenshot(path=str(OUTPUT / 'mobile-dark.png'))
        page.emulate_media(color_scheme='light')
        expect(banner).to_have_attribute('src', re.compile(r'gateway-neural-light-small\.mp4$'))
        motion_samples.append(check_video_motion(page))
        page.set_viewport_size({'width': 1440, 'height': 1000})
        expect(banner).to_have_attribute('src', re.compile(r'gateway-neural-light\.mp4$'))
        expect(banner).to_have_js_property('paused', False)

        page.emulate_media(reduced_motion="reduce")
        expect(banner).to_have_js_property('paused', True)

        page.reload()
        assert page.locator('.home-hero-copy').evaluate("el => getComputedStyle(el).animationName") == 'none'
        expect(banner).to_have_js_property('paused', True)
        expect(banner).to_have_attribute('data-ready', 'false')
        page.emulate_media(reduced_motion='no-preference')
        motion_samples.append(check_video_motion(page))
        page.emulate_media(reduced_motion='reduce')
        expect(banner).to_have_js_property('paused', True)
        page.locator('.home-integration').scroll_into_view_if_needed()

        for name, endpoint in [("Responses", "/v1/responses"), ("Claude", "/v1/messages"),
                               ("Gemini", "/v1beta/models/your-model:generateContent")]:
            page.get_by_role("tab", name=name, exact=True).click()
            expect(page.get_by_role("tabpanel", name=name)).to_contain_text(endpoint)
            expect(page.get_by_role("tabpanel", name=name)).to_contain_text('BASE_URL')
            expect(page.get_by_role("tabpanel", name=name)).to_contain_text('API_KEY')
            expect(page.get_by_role("tabpanel", name=name)).not_to_contain_text('$NEW_API')
            expect(page.locator(".home-code-panel:visible")).to_have_count(1)

        for language in ["en", "fr", "ru", "ja", "vi", "zhTW"]:
            page.evaluate("lang => localStorage.setItem('i18nextLng', lang)", language)
            page.reload()
            expect(page.locator('.home-hero-image')).to_be_visible()
            for width in [320, 768, 1440]:
                page.set_viewport_size({"width": width, "height": 900})
                check_layout(page)
            if language == "en":
                page.screenshot(path=str(OUTPUT / "desktop-english.png"), full_page=True)

        page.set_viewport_size({"width": 375, "height": 812})
        page.locator("html").evaluate("el => el.style.fontSize = '20px'")
        check_layout(page)

        # Loading home CSS must not recolor subsequent public routes.
        page.locator("html").evaluate("el => el.style.fontSize = ''")
        page.set_viewport_size({"width": 1440, "height": 1000})
        page.locator('header a[href="/about"]').click()
        expect(page).to_have_url(BASE + '/about')
        expect(page.locator('.home-shell')).to_have_count(0)
        assert page.locator('body').evaluate("el => getComputedStyle(el).getPropertyValue('--home-accent').trim()") == ''
        expect(page.locator('header')).to_be_visible()

        # Failed video falls back to the poster without affecting navigation.
        page.emulate_media(reduced_motion='no-preference')
        page.route('**/videos/home/*.mp4', lambda route: route.abort())
        page.goto(BASE)
        expect(page.locator('.home-hero h1')).to_be_visible()
        expect(page.locator('.home-hero a[href="/sign-up"]')).to_be_visible()
        expect(page.locator('.home-banner-toggle')).to_have_count(0)
        expect(banner).to_have_attribute('data-ready', 'false')
        assert page.locator('.home-hero-image').evaluate('async el => { await el.decode(); return el.naturalWidth > 0; }')
        check_layout(page)
        page.route('**/images/home/gateway-neural*.webp', lambda route: route.abort())
        page.reload()
        check_layout(page)

    assert not errors, errors
    checks = ["aligned responsive layout", "light/dark", "reduced motion", "responsive media sources", "feature grid", "section density", "compact headline", "compact footer", "no bottom CTA"]
    if "--quick" not in sys.argv:
        checks += ["AI video autoplay decoded frame changes", "no playback controls or focus stops", "offscreen suspension", "motion preference changes", "protocol placeholders", "protocol tabs", "seven languages", "text scaling",
                   "route style isolation", "video and poster failure fallback"]
    print(json.dumps({"result": "passed", "screenshots": str(OUTPUT),
                      "api_mode": "live" if "--live" in sys.argv else "fixture",
                      "checks": checks, "motion_samples": motion_samples}))
    browser.close()
