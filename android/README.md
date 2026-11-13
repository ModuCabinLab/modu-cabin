# 모두의 캐빈 Android 시뮬레이션

이 프로젝트는 **로컬 웹 화면과 가상 차량 로직을 담은 Android 시뮬레이션 프로토타입**입니다. Pleos Vehicle SDK를 가져오거나 실제 차량에 연결하지 않습니다. APK의 이름과 화면에도 시뮬레이션임을 표시합니다.

## 구성

- 패키지: `io.moducabin.demo`, 버전 `0.3.0-submission` / versionCode `4`
- Kotlin `Activity` + 플랫폼 `WebView`, 가로 화면 태블릿용
- 최소 Android API 28, compile/target API 34
- Android Gradle Plugin 8.7.3, Kotlin 1.9.25, Gradle Wrapper 8.9, JDK 17
- 빌드 때 `../web/index.html`, `styles.css`, `app.js`, `cabin-core.js`, `ioniq5.jpg`, `ioniq9.jpg`, `palisade.jpg`를 생성 assets 디렉터리로 동기화합니다. 웹 파일을 수정한 후 APK를 다시 빌드해야 합니다.

`https://appassets.androidplatform.net/assets/index.html`은 앱 내부에서 처리하는 주소입니다. 실제 HTTP 요청을 하지 않습니다. `WebViewClient`는 고정된 일곱 파일 (HTML/CSS/JS 4개, 공식 외관 JPEG 3개)만 제공하고 그 밖의 요청은 403으로 차단합니다. 앱은 Android 권한을 요청하지 않으며, 인터넷/파일/콘텐츠 접근, 팝업, 위치, 웹 권한 요청을 차단합니다. JavaScript는 번들 화면 실행에만 사용하고 네이티브 JavaScript bridge는 제공하지 않습니다. 네트워크 기반 폰트나 스크립트도 사용하지 않습니다.

## 빌드

JDK 17, Android SDK의 `platforms;android-34`, `build-tools;34.0.0`, `platform-tools`를 설치하고 `JAVA_HOME`, `ANDROID_HOME`을 설정합니다. Gradle 플러그인/의존성의 첫 다운로드에는 인터넷 연결이 필요합니다. 앱 실행에는 연결이 필요하지 않습니다.

```powershell
# 저장소 루트에서 실행. Python 3는 APK 검사에 사용됩니다.
./tools/android/build.ps1
```

또는 `android` 디렉터리에서:

```powershell
./gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug --no-daemon
```

macOS/Linux에서는 동일한 JDK/SDK 구성 후 `sh ./gradlew`를 사용합니다. `local.properties`를 사용할 경우 각자의 `sdk.dir`만 지정하고 버전 관리에 넣지 않습니다. `GRADLE_USER_HOME`으로 별도 캐시 경로를 지정할 수 있습니다. 사용자 경로나 서명 키는 저장소에 포함하지 않습니다.

기본 Gradle 출력은 `app/build/outputs/apk/debug/app-debug.apk`입니다. PowerShell 빌드 스크립트는 `dist/ModuCabin-simulation-debug.apk`, `.sha256`, `apk-verification.txt`도 만듭니다. 디버그 키는 설치/시연용이며 배포용 서명이 아닙니다.

## 서명된 릴리스 APK

제출용 파일은 [ModuCabin_ModuCabin_release.apk](../apk/ModuCabin_ModuCabin_release.apk)입니다. `release` 빌드는 `debuggable=false`이며 Android Debug 인증서 대신 별도의 로컬 제출용 키로 서명합니다. APK는 API 28 이상에서 유효한 v3 서명을 사용하며 v2 서명도 포함합니다. 실제 검증에서는 설치된 APK와 제출 파일의 SHA-256이 일치하는지 확인했습니다.

릴리스 키와 비밀번호는 저장소 밖에서 관리합니다. 비밀번호를 코드·명령 인수·로그에 넣지 않고 `MODUCABIN_RELEASE_STORE_PASSWORD`, `MODUCABIN_RELEASE_KEY_PASSWORD` 프로세스 환경 변수로 전달합니다. 기본 키 별칭은 `moducabin-submission`입니다.

```powershell
# 저장소 루트에서 실행. KeyStore는 본인이 보관한 비공개 키 파일입니다.
./tools/android/build-release.ps1 -KeyStore '<local-private-keystore.p12>'
```

이 명령은 릴리스 JUnit 테스트와 Lint, 메타데이터 검증기 테스트를 실행한 다음 APK 정렬 확인 → 서명 → 비디버그·서명·7개 파일 검증을 수행합니다. 결과는 `artifacts/ModuCabin_ModuCabin_release.apk`, 같은 이름의 `.sha256`, `artifacts/apk-verification.txt`입니다. 서명 키는 향후 같은 앱을 업데이트할 때 필요하므로 APK와 별도로 안전하게 보관해야 합니다.

## 실행 및 검증 범위

기기에서 개발자 옵션 및 USB 디버깅을 활성화하거나 API 28 이상 에뮬레이터를 시작한 뒤:

```text
adb install -r ../apk/ModuCabin_ModuCabin_release.apk
adb shell am start -W -n io.moducabin.demo/.MainActivity
```

기존 디버그 APK와 릴리스 APK의 서명 키가 다르므로, 기존 디버그 앱이 설치되어 있으면 제거 후 릴리스 APK를 설치해야 할 수 있습니다.

2026-11-13에 **서명된 릴리스 APK를 실제 AOSP Android 에뮬레이터에 설치·실행**했습니다. 환경은 Android 14/API 34 x86_64 기본 이미지 revision 2, Android Emulator 37.2.13.0, 1600×1000/160 dpi 가로 화면, WebView `com.android.webview` 113.0.5672.136입니다. 기존 Windows WHPX 가속을 사용했습니다. Pleos Connect Emulator나 실제 차량에서 실행한 결과는 아닙니다.

ADB 터치·스와이프·키 입력과 UIAutomator XML, 스크린샷으로 13개 항목을 확인했습니다. 가족 연결, 적용 후 현재값 확인, 수면 요청과 적용, 좌석 이동, 명령 실패 표시, 주행 중 조작 제한, 백그라운드 복귀, 강제 종료 후 재실행, 차종 및 9인 좌석 구성이 포함됩니다. WebView 디버깅이나 JavaScript 주입은 사용하지 않았습니다. 설치된 APK를 직접 읽어 제출 파일과 해시가 같은 것도 확인했습니다.

릴리스 JUnit 5개와 서명/메타데이터 검증기 테스트 5개가 통과했습니다. 수집한 앱 로그에서 fatal/uncaught 오류 표시는 없었습니다. 최초 에뮬레이터 호스트 실행에는 Windows 접근 위반 종료가 한 차례 있었으며, 재시작한 세션에서 위 검증을 완료했습니다. 자세한 결과와 실제 화면 녹화는 [Android 실행 검증 기록](../docs/ANDROID_RUNTIME.md)을 참고하세요.

`tools/android/runtime_probe.py`는 실제 Android 화면과 신선한 접근성 XML을 수집하며, `collect_runtime_evidence.py`는 저장된 UI 결과와 설치 APK 해시를 확인해 절대 경로가 없는 JSON 보고서를 만듭니다. 서로 다른 Android/WebView 버전, 실기기, Pleos SDK 및 차량 통합은 별도 검증 범위입니다.

가로 화면 태블릿 시연용이므로 `screenOrientation="landscape"`를 지정했습니다. 이에 따른 Android Lint의 고정 방향 경고는 의도된 제한입니다. 다양한 휴대전화/접이식 폼팩터 지원은 별도 검증 범위입니다.

## 공식 참고 자료

- [Android 로컬 콘텐츠 로드](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content)
- [AGP 8.7 호환성](https://developer.android.com/build/releases/agp-8-7-0-release-notes)
- [Gradle 8.9](https://docs.gradle.org/8.9/release-notes.html)
- [Pleos 개발 시작](https://document.pleos.ai/en/docs/pleos-only/getting-started)

향후 실제 SDK 연결 계획은 [PLEOS_NEXT_STEPS.md](PLEOS_NEXT_STEPS.md)를 참고하세요. 현재 APK의 구현 범위와 구분된 작업 계획입니다.
