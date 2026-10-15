"""Capture versioned homepage screenshots and actual playing video frames."""

import json
import sys
from datetime import datetime
from io import BytesIO
from pathlib import Path

from PIL import Image
from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4174"
STAMP = datetime.now().strftime("%Y%m%d-%H%M%S")
OUTPUT = Path(__file__).parent / "home-redesign" / f"preview-{STAMP}"
OUTPUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    context = browser.new_context(
        viewport={"width": 1440, "height": 1000},
        locale="zh-CN",
        color_scheme="light",
        reduced_motion="no-preference",
    )
    context.route("https://ccswitch.io/**", lambda route: route.abort())
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    response = page.goto(f"{BASE}/?preview={STAMP}")
    assert response.headers.get("cache-control") == "no-store"
    expect(page.locator(".home-headline")).to_have_text("\u591a\u5143\u6a21\u578b\uff0c\u4e00\u4e2a\u5165\u53e3", timeout=60000)
    expect(page.locator(".home-cta-section")).to_have_count(0)

    for section in page.locator("main.home-landing section").all():
        section.scroll_into_view_if_needed()
    expect(page.locator(".home-code-panel:visible")).to_contain_text("BASE_URL")
    expect(page.locator(".home-code-panel:visible")).to_contain_text("API_KEY")
    expect(page.locator(".home-code-panel:visible")).not_to_contain_text("$NEW_API")
    expect(page.locator(".home-provider-logos li:has(svg)")).to_have_count(6)
    page.evaluate("document.fonts.ready")
    page.locator("main img").evaluate_all("images => Promise.all(images.map(img => img.decode()))")
    page.evaluate("window.scrollTo(0, 0)")
    page.locator(".home-hero-copy").evaluate("el => Promise.all(el.getAnimations().map(animation => animation.finished))")
    video = page.locator('.home-hero-video')
    expect(video).to_have_attribute('src', '/videos/home/gateway-neural-light.mp4')
    expect(video).to_have_js_property('paused', False)
    expect(video).to_have_attribute('data-ready', 'true')
    page.wait_for_function("getComputedStyle(document.querySelector('.home-hero-video')).opacity === '1'")
    expect(page.locator(".home-banner button")).to_have_count(0)
    expect(video).to_have_js_property('controls', False)

    page.screenshot(path=str(OUTPUT / "homepage.png"), full_page=True)
    page.screenshot(path=str(OUTPUT / "hero.png"))
    page.locator(".home-terminal").screenshot(path=str(OUTPUT / "protocols.png"))
    footer = page.get_by_role("contentinfo")
    expect(footer.get_by_role("img")).to_have_count(0)
    footer.screenshot(path=str(OUTPUT / "footer.png"))
    if "--still" in sys.argv:
        assert not errors, errors
        print(json.dumps({"preview": str(OUTPUT), "page_errors": errors}))
        browser.close()
        sys.exit(0)
    page.evaluate("window.scrollTo(0, 0)")
    expect(video).to_have_js_property('paused', False)

    # Capture uninterrupted native playback. Preserve wall-clock intervals;
    # seeking or speeding up a still image would not prove real autoplay.
    hero_bounds = page.locator(".home-hero").bounding_box()
    frames = []
    samples = []
    for _ in range(36):
        previous = samples[-1]['mediaTime'] if samples else None
        sample = video.evaluate("""(el, previous) => new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Playback stalled')), 15000);
          function capture(_, frame) {
            const elapsed = (frame.mediaTime - previous + el.duration) % el.duration;
            if (previous === null || elapsed >= 0.25) {
              clearTimeout(timeout);
              resolve({ mediaTime: frame.mediaTime, frames: frame.presentedFrames, timestamp: performance.now() });
              return;
            }
            el.requestVideoFrameCallback(capture);
          }
          el.requestVideoFrameCallback(capture);
        })""", previous)
        samples.append(sample)
        shot = page.screenshot(clip=hero_bounds)
        frame = Image.open(BytesIO(shot)).convert("RGB")
        frame.thumbnail((960, 960), Image.Resampling.LANCZOS)
        frames.append(frame)
    assert samples[-1]['frames'] > samples[0]['frames'], 'Native playback must decode new frames'
    assert frames[0].tobytes() != frames[-1].tobytes(), 'The captured banner must move'
    intervals = [round(samples[i + 1]['timestamp'] - sample['timestamp']) for i, sample in enumerate(samples[:-1])]
    intervals.append(intervals[-1])
    frames[0].save(
        OUTPUT / "banner-motion.webp",
        save_all=True,
        append_images=frames[1:],
        duration=intervals,
        loop=0,
        quality=85,
        method=4,
    )
    frames[0].save(
        OUTPUT / 'banner-motion.gif',
        save_all=True,
        append_images=frames[1:],
        duration=intervals,
        loop=0,
        optimize=True,
    )
    assert not errors, errors
    print(json.dumps({"preview": str(OUTPUT), "animation_frames": len(frames),
                      "animation_duration_ms": sum(intervals), "native_frames": samples[-1]['frames'] - samples[0]['frames'],
                      "page_errors": errors}))
    browser.close()
