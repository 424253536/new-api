"""Build original looping banner assets. Requires Playwright, Pillow and ffmpeg."""
import base64
import json
import math
import shutil
import subprocess
import sys
from io import BytesIO
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
NEURAL = "--neural" in sys.argv
ASSET_NAME = "gateway-neural" if NEURAL else "gateway-flow"
RENDERER = "home-neural-renderer.html" if NEURAL else "home-motion-renderer.html"
OUTPUT = ROOT / ".tmp" / ("home-neural-motion" if NEURAL else "home-motion")
OUTPUT.mkdir(parents=True, exist_ok=True)
FPS = 24
SECONDS = 10

with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    page = browser.new_page(viewport={"width": 1600, "height": 600})
    page.goto((Path(__file__).parent / RENDERER).as_uri())
    page.wait_for_function("typeof window.renderFrame === 'function'")
    for mode in ["light", "dark"]:
        for second in [0, 2.5, 5]:
            data = page.evaluate("([phase, dark]) => window.renderFrame(phase, dark)",
                                 [second / SECONDS * math.tau, mode == "dark"])
            Image.open(BytesIO(base64.b64decode(data))).save(OUTPUT / f"{mode}-{second}.png")
        if "--samples" in sys.argv:
            continue
        video_dir = ROOT / "public" / "videos" / "home"
        video_dir.mkdir(parents=True, exist_ok=True)
        target = video_dir / f"{ASSET_NAME}-{mode}.mp4"
        command = [shutil.which("ffmpeg"), "-y", "-loglevel", "error",
                   "-f", "image2pipe", "-framerate", str(FPS), "-i", "pipe:0",
                   "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "23",
                   "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(target)]
        encoder = subprocess.Popen(command, stdin=subprocess.PIPE)
        try:
            for frame in range(FPS * SECONDS):
                data = page.evaluate("([phase, dark]) => window.renderFrame(phase, dark)",
                                     [frame / (FPS * SECONDS) * math.tau, mode == "dark"])
                png = base64.b64decode(data)
                encoder.stdin.write(png)
                if frame == 0:
                    poster = Image.open(BytesIO(png)).convert("RGB")
                    poster.save(ROOT / "public" / "images" / "home" / f"{ASSET_NAME}-{mode}.webp", quality=88)
                    poster.resize((800, 300), Image.Resampling.LANCZOS).save(
                        ROOT / "public" / "images" / "home" / f"{ASSET_NAME}-{mode}-small.webp", quality=85)
            encoder.stdin.close()
            assert encoder.wait() == 0, "Video encoding failed"
        finally:
            if encoder.poll() is None:
                encoder.terminate()
        small_target = video_dir / f"{ASSET_NAME}-{mode}-small.mp4"
        subprocess.run([shutil.which("ffmpeg"), "-y", "-loglevel", "error", "-i", str(target),
                        "-vf", "scale=800:300", "-an", "-c:v", "libx264", "-preset", "medium",
                        "-crf", "25", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(small_target)],
                       check=True)
        print(json.dumps({"asset": str(target), "bytes": target.stat().st_size}), flush=True)
    browser.close()
