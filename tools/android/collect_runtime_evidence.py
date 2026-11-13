"""Validate captured Android UI evidence and emit a portable, non-secret report."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as ET


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--adb", type=Path, required=True)
    parser.add_argument("--serial", default="emulator-5554")
    parser.add_argument("--apk", type=Path, required=True)
    parser.add_argument("--evidence", type=Path, required=True)
    args = parser.parse_args()

    def adb(*command):
        return subprocess.check_output([str(args.adb), "-s", args.serial, *command], timeout=30)

    specs = [
        ("initial_launch", "01-launch-ready", ["0명 탑승", "현대 아이오닉 9 공식 외관 참고 사진"]),
        ("family_connection", "03-family-connected", ["3명 탑승", "2개 제안"]),
        ("apply_and_readback", "04-applied", ["2 단계", "가상 상태 확인 완료", "함께 편안하게 적용됨"]),
        ("sleep_request", "05-sleep-request", ["조용한 휴식", "보호자가 아이의 수면을 선택했어요. 풍량 1단계를 제안해요."]),
        ("sleep_apply", "06-sleep-applied", ["1 단계", "조용한 휴식 적용됨"]),
        ("seat_move", "08-seat-moved", ["조수석 · 빈 좌석", "2열 오른쪽 · 동승자 B"]),
        ("command_failure", "11-command-failure", ["명령 실패 · 재확인 필요", "적용하기"]),
        ("driving_lock", "12-driving-lock", ["주행 중", "적용하기"]),
        ("background_resume", "13-background-resume", ["● 주행 중 · 조작 제한", "2열 오른쪽 · 동승자 B"]),
        ("cold_relaunch", "14-cold-relaunch", ["0명 탑승", "연결 대기", "3 단계"]),
        ("ioniq5_model", "16-ioniq5", ["아이오닉 5 · 5인승", "2열 · 2 + 3 배치", "현대 아이오닉 5 공식 외관 참고 사진"]),
        ("palisade_model", "18-palisade", ["팰리세이드 · 7인승", "3열 · 2 + 2 + 3 배치", "현대 팰리세이드 공식 외관 참고 사진"]),
        ("nine_seat_layout", "19-palisade-nine-seats", ["팰리세이드 · 9인승", "3열 · 3 + 3 + 3 배치"]),
    ]
    checks = []
    for check_id, name, expected_text in specs:
        xml_file = args.evidence / (name + ".xml")
        png_file = args.evidence / (name + ".png")
        nodes = list(ET.parse(xml_file).iter("node"))
        text = {node.get("text", "") for node in nodes}
        missing = [value for value in expected_text if value not in text]
        if missing:
            raise SystemExit(f"Runtime evidence {check_id} lacks expected UI text: {missing}")
        if check_id == "driving_lock":
            for label in ("가족 3명 연결 ↗", "적용하기", "이동 →"):
                node = next(node for node in nodes if node.get("text") == label and node.get("clickable") == "true")
                if node.get("enabled") != "false":
                    raise SystemExit(f"Driving lock evidence does not disable {label}")
        if check_id == "command_failure" and any(value.endswith("적용됨") for value in text):
            raise SystemExit("Failure screenshot incorrectly shows an applied result.")
        if check_id == "nine_seat_layout":
            seats = [node for node in nodes if node.get("clickable") == "true" and node.get("text", "").endswith(" · 빈 좌석")]
            if len(seats) != 9:
                raise SystemExit("Nine-seat evidence does not expose exactly nine seat controls.")
        checks.append({"id": check_id, "passed": True, "screenshot": png_file.name, "screenshot_sha256": sha(png_file.read_bytes()), "hierarchy": xml_file.name, "hierarchy_sha256": sha(xml_file.read_bytes())})

    package = "io.moducabin.demo"
    package_info = adb("shell", "dumpsys", "package", package).decode("utf-8")
    version_code = int(re.search(r"versionCode=(\d+)", package_info).group(1))
    version_name = re.search(r"versionName=(\S+)", package_info).group(1)
    package_path = adb("shell", "pm", "path", package).decode("utf-8").strip().splitlines()[0].removeprefix("package:")
    installed_hash = sha(adb("exec-out", "cat", package_path))
    apk_hash = sha(args.apk.read_bytes())
    if installed_hash != apk_hash or version_code != 4 or version_name != "0.3.0-submission":
        raise SystemExit("The installed package does not match the submission artifact/version.")
    if re.search(r"(?:pkgFlags|flags)=\[[^\]]*DEBUGGABLE", package_info):
        raise SystemExit("The installed submission package is debuggable.")

    pid = adb("shell", "pidof", package).decode().strip()
    app_log = adb("logcat", "-d", "--pid=" + pid, "-v", "threadtime").decode("utf-8", errors="replace")
    (args.evidence / "app-logcat-session2.txt").write_text(app_log, encoding="utf-8")
    prior_log = (args.evidence / "app-logcat-session1.txt").read_text(encoding="utf-8", errors="replace")
    fatal_patterns = ("FATAL EXCEPTION", "Fatal signal", "ANR in " + package, "Uncaught ")
    fatal_lines = [line for line in (prior_log + app_log).splitlines() if any(pattern in line for pattern in fatal_patterns)]
    if fatal_lines:
        raise SystemExit("Application crash or uncaught-error markers found in runtime logcat.")
    webview = adb("shell", "dumpsys", "webviewupdate").decode("utf-8")
    webview_match = re.search(r"Current WebView package \(name, version\): \(([^,]+), ([^)]+)\)", webview)
    exit_info = adb("shell", "dumpsys", "activity", "exit-info", package).decode("utf-8", errors="replace")
    (args.evidence / "application-exit-info.txt").write_text(exit_info, encoding="utf-8")
    video = args.evidence / "actual-android-demo-cfr.mp4"
    video_info = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "format=duration,size:stream=codec_name,width,height,avg_frame_rate", "-of", "json", str(video)]))
    report = {
        "verified_at_utc": datetime.now(timezone.utc).isoformat(),
        "package": package, "version_code": version_code, "version_name": version_name,
        "apk_filename": args.apk.name, "apk_bytes": args.apk.stat().st_size, "apk_sha256": apk_hash,
        "installed_apk_sha256": installed_hash, "installed_bytes_match_submission": True, "debuggable": False,
        "environment": {
            "kind": "Generic AOSP Android emulator, not Pleos Connect Emulator",
            "android_release": adb("shell", "getprop", "ro.build.version.release").decode().strip(),
            "api_level": int(adb("shell", "getprop", "ro.build.version.sdk").decode().strip()),
            "abi": adb("shell", "getprop", "ro.product.cpu.abi").decode().strip(),
            "emulator_version": "37.2.13.0", "system_image": "system-images;android-34;default;x86_64, revision 2",
            "display": "1600x1000, 160 dpi, landscape", "acceleration": "Existing Windows WHPX; SwiftShader rendering",
            "webview_package": webview_match.group(1), "webview_version": webview_match.group(2),
            "interaction": "ADB touch/swipe/key events with fresh UIAutomator XML and Android screencap; no JavaScript injection"
        },
        "runtime_checks_passed": len(checks), "runtime_checks_failed": 0, "checks": checks,
        "app_logcat_fatal_or_uncaught_markers": 0,
        "lifecycle": {"home_and_resume": "HOT resume retained session and driving lock", "force_stop_and_launch": "COLD relaunch reset the simulation session"},
        "video": {"file": video.name, "sha256": sha(video.read_bytes()), "probe": video_info, "origin": "Android screenrecord; re-encoded to constant 30 fps for playback; original retained as actual-android-demo.mp4"},
        "limitations": [
            "No Pleos SDK, Pleos Connect Emulator, physical vehicle, or physical Android device integration was tested.",
            "The first emulator host process crashed with Windows access violation 0xc0000005 before the sustained verification session; restart completed all listed checks. This was a host emulator failure, not a recorded Android application crash.",
            "UIAutomator occasionally returned a null root during transitions; tooling rejects stale XML and retries.",
            "Only one Android API level and one WebView version were exercised. Fixed landscape remains one intentional Android Lint warning."
        ]
    }
    serialized = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if re.search(r"[A-Za-z]:[\\/]|/Users/|DESKTOP-", serialized):
        raise SystemExit("Portable runtime report unexpectedly includes a host path or hostname.")
    (args.evidence / "runtime-verification.json").write_text(serialized, encoding="utf-8")
    print(json.dumps({"runtime_checks": len(checks), "installed_apk_matches": True, "apk_sha256": apk_hash, "app_error_markers": 0, "report": "runtime-verification.json"}, indent=2))


if __name__ == "__main__":
    main()
