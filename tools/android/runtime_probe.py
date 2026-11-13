"""Capture actual Android UI through ADB; no WebView debugging or JS injection."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET


class AndroidUi:
    def __init__(self, adb, serial, output):
        self.adb = str(adb)
        self.serial = serial
        self.output = Path(output)
        self.output.mkdir(parents=True, exist_ok=True)

    def command(self, *args):
        return subprocess.check_output([self.adb, "-s", self.serial, *args], timeout=30)

    def hierarchy(self):
        for _ in range(3):
            self.command("shell", "rm", "-f", "/sdcard/moducabin-window.xml")
            result = subprocess.run([self.adb, "-s", self.serial, "shell", "uiautomator", "dump", "/sdcard/moducabin-window.xml"], capture_output=True, timeout=30)
            if result.returncode == 0 and b"dumped to:" in result.stdout:
                xml = self.command("exec-out", "cat", "/sdcard/moducabin-window.xml")
                return xml, ET.fromstring(xml)
            time.sleep(0.5)
        raise RuntimeError("Android UIAutomator did not return a fresh hierarchy; refusing to use stale nodes.")

    def capture(self, name):
        xml, root = self.hierarchy()
        (self.output / f"{name}.xml").write_bytes(xml)
        (self.output / f"{name}.png").write_bytes(self.command("exec-out", "screencap", "-p"))
        return [node.attrib for node in root.iter("node") if node.get("text") or node.get("content-desc")]

    def tap(self, text):
        _, root = self.hierarchy()
        candidates = [node for node in root.iter("node") if node.get("text") == text or node.get("content-desc") == text]
        if not candidates:
            raise RuntimeError(f"No Android UI node has exact text: {text}")
        node = next((candidate for candidate in candidates if candidate.get("clickable") == "true"), candidates[0])
        if node.get("enabled") == "false":
            raise RuntimeError(f"Android UI node is disabled: {text}")
        x1, y1, x2, y2 = map(int, re.findall(r"\d+", node.get("bounds")))
        if x2 <= x1 or y2 <= y1:
            raise RuntimeError(f"Android UI node is outside the visible viewport: {text}")
        self.command("shell", "input", "tap", str((x1 + x2) // 2), str((y1 + y2) // 2))
        time.sleep(0.5)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--adb", required=True, type=Path)
    parser.add_argument("--serial", default="emulator-5554")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--capture", required=True)
    parser.add_argument("--tap")
    args = parser.parse_args()
    ui = AndroidUi(args.adb, args.serial, args.output)
    if args.tap:
        ui.tap(args.tap)
    nodes = ui.capture(args.capture)
    print(json.dumps([{key: node.get(key) for key in ("text", "content-desc", "clickable", "enabled", "bounds")} for node in nodes], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
