"""Reuse the canonical application icon without modifying its artwork."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent
repo = root.parent
catalog = root / "Resources" / "Images.xcassets"
catalog.mkdir(parents=True, exist_ok=True)
info = {"version": 1, "author": "xcode"}
(catalog / "Contents.json").write_text(json.dumps({"info": info}))
logo = (repo / "desktop/src/icon.png").read_bytes()
if not logo.startswith(bytes([137,80,78,71,13,10,26,10])):
    raise ValueError("Application icon must be PNG")
assets = {
    "AppLogo": ("logo.png", logo),
    "LoginBackground": ("background.jpg", (repo / "desktop/src/login-cave.jpg").read_bytes()),
    "TMDBLogo": ("tmdb.svg", (repo / "desktop/public/tmdb-logo.svg").read_bytes()),
}
for name, (filename, data) in assets.items():
    folder = catalog / (name + ".imageset")
    folder.mkdir(exist_ok=True)
    (folder / filename).write_bytes(data)
    content = {"images": [{"filename": filename, "idiom": "universal"}], "info": info}
    if filename.endswith(".svg"):
        content["properties"] = {"preserves-vector-representation": True}
    (folder / "Contents.json").write_text(json.dumps(content))
print("Android logo, login background and TMDB attribution assets prepared.")

# iOS app icons require a distinct AppIcon asset set. Flatten transparency only
# for that packaged icon; the logo displayed inside the app stays untouched.
import platform
import subprocess
icon = catalog / "AppIcon.appiconset"
icon.mkdir(exist_ok=True)
source = catalog / "AppLogo.imageset" / "logo.png"
target = icon / "app-icon.png"
if platform.system() == "Darwin":
    subprocess.run(["swift", str(root / "prepare-icon.swift"), str(source), str(target)], check=True)
else:
    from PIL import Image
    image = Image.open(source).convert("RGBA").resize((1024, 1024), Image.Resampling.LANCZOS)
    background = Image.new("RGB", image.size, (13, 16, 25))
    background.paste(image, mask=image.getchannel("A"))
    background.save(target)
(icon / "Contents.json").write_text(json.dumps({"images":[{"filename":"app-icon.png","idiom":"universal","platform":"ios","size":"1024x1024"}],"info":info}))
