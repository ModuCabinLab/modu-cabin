"""Inspect the built artifact; never claims emulator or real-vehicle execution."""
import argparse
import hashlib
from pathlib import Path
import subprocess
import zipfile


def validate_release_metadata(badging, signature):
    if "application-debuggable" in badging.splitlines():
        raise ValueError("Submission APK must not be debuggable.")
    if "CN=Android Debug" in signature:
        raise ValueError("Submission APK must not use an Android debug certificate.")


def has_verified_modern_signature(signature):
    return any(
        f"Verified using {scheme} scheme (APK Signature Scheme {scheme}): true" in signature
        for scheme in ("v2", "v3", "v3.1")
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apk", type=Path, required=True)
    parser.add_argument("--web", type=Path, required=True)
    parser.add_argument("--sdk", type=Path, required=True)
    parser.add_argument("--require-release", action="store_true")
    args = parser.parse_args()
    build_tools = args.sdk / "build-tools" / "34.0.0"
    aapt = build_tools / ("aapt2.exe" if (build_tools / "aapt2.exe").exists() else "aapt2")
    signer = build_tools / ("apksigner.bat" if (build_tools / "apksigner.bat").exists() else "apksigner")
    badging = subprocess.check_output([str(aapt), "dump", "badging", str(args.apk)], encoding="utf-8")
    expected = ["package: name='io.moducabin.demo'", "sdkVersion:'28'", "targetSdkVersion:'34'", "launchable-activity: name='io.moducabin.demo.MainActivity'"]
    for fragment in expected:
        if fragment not in badging:
            raise SystemExit(f"APK metadata did not contain {fragment}")
    if any(line.startswith("uses-permission") for line in badging.splitlines()):
        raise SystemExit("This offline simulation must not request any Android permissions.")
    if "시뮬레이션" not in badging:
        raise SystemExit("APK application label must identify the simulation.")
    signature = subprocess.check_output([str(signer), "verify", "--verbose", "--print-certs", str(args.apk)], encoding="utf-8")
    if not has_verified_modern_signature(signature):
        raise SystemExit("APK v2/v3 signature not verified.")
    if args.require_release:
        try:
            validate_release_metadata(badging, signature)
        except ValueError as error:
            raise SystemExit(str(error)) from error
    asset_lines = []
    with zipfile.ZipFile(args.apk) as archive:
        asset_names = sorted(name for name in archive.namelist() if name.startswith("assets/"))
        expected_names = sorted("assets/" + name for name in (
            "index.html", "styles.css", "app.js", "cabin-core.js", "ioniq5.jpg", "ioniq9.jpg", "palisade.jpg"
        ))
        if asset_names != expected_names:
            raise SystemExit(f"Unexpected assets: {asset_names}")
        for name in expected_names:
            actual = archive.read(name)
            if actual != (args.web / Path(name).name).read_bytes():
                raise SystemExit(f"Bundled asset differs from web source: {name}")
            asset_lines.append(f"{name} SHA256 {hashlib.sha256(actual).hexdigest()}")
    digest = hashlib.sha256(args.apk.read_bytes()).hexdigest()
    report = "\n".join([
        "Modu Cabin simulation prototype — static APK verification",
        "Package, minimum/target SDK, launcher and simulation label verified.",
        "No requested Android permissions.",
        "Non-debuggable APK and non-debug signing certificate verified." if args.require_release else "Debug/release status is listed in the metadata below.",
        "Seven bundled web assets match source byte-for-byte.",
        *asset_lines,
        f"APK SHA256 {digest}",
        "",
        badging.strip(),
        "",
        signature.strip(),
        "",
        "This report does not establish emulator/device launch or Pleos SDK integration.",
    ]) + "\n"
    (args.apk.parent / "apk-verification.txt").write_text(report, encoding="utf-8")
    (args.apk.parent / (args.apk.name + ".sha256")).write_text(f"{digest}  {args.apk.name}\n", encoding="ascii")
    print("Verified package/SDK/permissions, APK signature and all seven web assets.")
    print(f"SHA256 {digest}")


if __name__ == "__main__":
    main()
