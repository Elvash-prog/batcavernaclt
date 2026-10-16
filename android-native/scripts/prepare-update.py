#!/usr/bin/env python3
"""Prepare assets from the APK signed with the existing preview key. Does not publish."""
import argparse, hashlib, json, pathlib, re, shutil, subprocess
p = argparse.ArgumentParser()
p.add_argument('apk', type=pathlib.Path)
p.add_argument('--aapt', required=True)
p.add_argument('--apksigner', required=True)
p.add_argument('--notes', required=True, type=pathlib.Path)
p.add_argument('--output', type=pathlib.Path, default=pathlib.Path('build/update-release'))
a = p.parse_args()
subprocess.run([a.apksigner, 'verify', str(a.apk)], check=True)
badging = subprocess.check_output([a.aapt, 'dump', 'badging', str(a.apk)], text=True)
m = re.search(r"package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'", badging)
if not m or m[1] != 'dev.gamersclt.batcaverna.nativeapp.preview':
    raise SystemExit('Expected the existing native preview application ID')
version = m[3]
if not re.fullmatch(r'\d+\.\d+\.\d+', version):
    raise SystemExit('Invalid version name')
a.output.mkdir(parents=True, exist_ok=True)
apk = a.output / f'BatCaverna-{version}.apk'
shutil.copyfile(a.apk, apk)
manifest = dict(versionCode=int(m[2]), versionName=version,
    url=f'https://github.com/Elvash-prog/batcavernaclt/releases/download/android-v{version}/{apk.name}',
    sha256=hashlib.sha256(apk.read_bytes()).hexdigest(), notes=a.notes.read_text())
(a.output/'android-update.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
print(f'Prepared {apk} and android-update.json. Publish together in android-v{version}.')
