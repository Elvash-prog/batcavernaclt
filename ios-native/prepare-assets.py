"""Reuse the actual Android identity assets without modifying their artwork."""
import base64
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent
repo = root.parent
catalog = root / "Resources" / "Images.xcassets"
catalog.mkdir(parents=True, exist_ok=True)
info = {"version": 1, "author": "xcode"}
(catalog / "Contents.json").write_text(json.dumps({"info": info}))
chunks = sorted((repo / "android-native/assets-source").glob("app_logo.png.b64.*"))
logo = base64.b64decode("".join(p.read_text().strip() for p in chunks), validate=True)
if hashlib.sha256(logo).hexdigest() != "708935a9bffc4b10c297a5819bb57bec5bdcc490d0bbcab9c6751c644f10a2d1":
    raise ValueError("Android logo checksum mismatch")
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
