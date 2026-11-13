# 향후 Pleos 연동 작업 — 현재 미구현

현재 Android APK는 독립적인 시뮬레이션이며 SDK 연결, 실제 좌석 감지, 프로필 식별, HVAC/열선 제어를 수행하지 않습니다. 아래는 2026-11-13에 확인한 공식 문서에 근거한 다음 단계입니다. 구현 코드나 검증 결과를 의미하지 않습니다.

1. [프로젝트/SDK 시작 가이드](https://document.pleos.ai/en/docs/pleos-only/getting-started)에 따라 SDK 사용 신청과 사용 권한을 확인합니다. 문서에 안내된 Maven 저장소는 `https://nexus-playground.pleos.ai/repository/maven-releases/`이며 예제 의존성은 `ai.pleos.playground:Vehicle:2.3.1`입니다. 적용 시점에 다시 버전을 확인합니다. 현재 Gradle에는 이 저장소/의존성을 넣지 않았습니다.
2. [Pleos Connect Emulator 가이드](https://document.pleos.ai/docs/connect/guide/getting-started/application-development/setup-connect-sdk-emulator)에 따라 API 34 이미지와 자동차 AVD를 설치합니다. Windows/Linux용 SDK Update Site는 `https://nexus-playground.pleos.ai/repository/raw-releases/connect-avd/2.x/crp-sys-img.xml`입니다. 실제 SDK 응답을 검증할 환경은 이 단계에서 구성합니다.
3. 실제 네이티브 차량 어댑터를 설계하고 각 제어의 권한·영역·값 범위를 [Capability 문서](https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/Vehicle/check-capability)로 확인합니다. 기능별 `AccessType`과 영역별 경계값을 검사하고 쓰기 불가/읽기 불가/미지원 기능은 UI에서 명확히 처리합니다. 시뮬레이션의 임의 범위를 실제 API 범위로 간주하지 않습니다.
4. 지원되는 API에 한해 현재값 읽기 → 사용자 동의 → 명령 → 후속 현재값/콜백 확인을 연결합니다. 성공 콜백만으로 물리 상태 반영을 단정하지 않고 타임아웃·미일치·수동 변경을 처리합니다. 좌석과 프로필 연결은 별도의 동의/식별 설계와 검증이 필요합니다.
5. 네이티브/WebView 간 통신이 필요해지면 허용된 원점과 고정 메시지 스키마를 갖춘 최소 인터페이스를 별도로 보안 검토합니다. 현재 APK에는 이 인터페이스가 없습니다. 범용 JavaScript 브리지로 임의 차량 명령을 노출하지 않습니다.
6. 정차/주행 전환, 기능 미지원, 권한 거부, 연결 끊김, 취소/만료, 앱 백그라운드 전환, 값 검증 실패를 Pleos 환경에서 테스트합니다. 실제 차량 검증은 제공된 시험 환경과 절차를 따르고 별도 결과를 기록합니다.

이 샘플의 APK 빌드 성공이나 브라우저 시연은 Pleos 호환성 인증, 차량 안전성 검증 또는 대회 제출 자격 확인을 대신하지 않습니다.
