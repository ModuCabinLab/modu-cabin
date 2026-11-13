# 현대차 모델 및 이미지 참고 자료

확인일: 2026-11-13. 국내 판매 모델의 정원과 열별 좌석 수를 UI에 반영합니다. 차량 상태·온도·열선은 실제 차량 API와 연결되지 않은 시뮬레이션입니다.

| UI 모델 | 정원 및 배치 | 근거 |
| --- | --- | --- |
| 2027 아이오닉 5 | 5인승 2+3 | [국내 모델 가격표](https://www.hyundai.com/contents/repn-car/catalog/ioniq-5-2027-price.pdf), [현대 공식 정원 표기](https://www.hyundai.com/in/en/blog/best-5-seater-electric-car-to-choose-in-india) |
| 2027 아이오닉 9 | 6인승 2+2+2, 7인승 2+3+2 | [공식 가격표의 6/7인승·2열·3열 시트](https://www.hyundai.com/contents/repn-car/catalog/ioniq9-2027-price.pdf) |
| 2027 팰리세이드 | 7인승 2+2+3, 9인승 3+3+3 | [2027 출시 자료](https://www.hyundaimotorgroup.com/ko/news/palisade-high-roof-xrt-black-ink-launch), [제조사 열별 배치 설명](https://www.hyundaimotorgroup.com/ko/story/CONT0000000000166796) |

아이오닉 5의 국내 가격표는 2열 6:4 분할 시트를 확인하는 자료이며, 정원 5명은 현대 공식 모델 설명과 함께 대조했습니다. 정원 외 가격·주행거리·성능은 앱에 표시하지 않습니다. 위 차종에서 제공하지 않는 4/8인 구성을 해당 차종의 사양처럼 표시하지 않습니다. 별도 일반 캐빈에서만 자유 배치로 제공합니다.

## 외관 사진

아래 사진은 현대자동차그룹 공식 뉴스룸의 제조사 제공 사진을 그대로 번들에 포함합니다. 이미지의 저작권은 현대자동차그룹에 있으며, 프로젝트 소스의 창작물로 주장하지 않습니다. 각 뉴스 페이지는 뉴스룸 기사·이미지의 자유로운 이용을 안내하고 있으며 제공받은 일부 자료에 예외가 있을 수 있음을 고지합니다. 이 프로젝트가 사용하는 세 사진에는 별도 제3자 권리 표시가 확인되지 않았습니다.

- `web/ioniq5.jpg`: [2027 아이오닉 5 출시 뉴스](https://www.hyundaimotorgroup.com/ko/news/hyundai-motor-company-2027-ioniq-5)의 대표 사진.
  [원본](https://www.hyundaimotorgroup.com/image/upload/asset_library/MDA00000000000080537/bae8dd5f42834f1f8ddc7cb19eaa2c58.jpg)
- `web/ioniq9.jpg`: [2027 아이오닉 9 출시 뉴스](https://www.hyundaimotorgroup.com/ko/news/hyundai-motor-company-2027-ioniq-9-launch)의 대표 사진. 캘리그래피 블랙잉크 외관 참고.
  [원본](https://www.hyundaimotorgroup.com/image/upload/asset_library/MDA00000000000076914/9b6e3ad84d7b4c18a7fb754d4ccb715d.jpg)
- `web/palisade.jpg`: [2027 팰리세이드 출시 뉴스](https://www.hyundaimotorgroup.com/ko/news/palisade-high-roof-xrt-black-ink-launch)의 블랙잉크 트림 사진.
  [원본](https://www.hyundaimotorgroup.com/image/upload/asset_library/MDA00000000000083401/aff0e6c8ad7448a6a0acd1c2b8bd268e.jpg)

상단에서 내려다본 좌석 지도는 직접 작성한 SVG입니다. 모델별 차체 윤곽·램프·유리·루프 레일을 참고했지만 실제 치수의 CAD, 정밀 3D 모델 또는 제조사 공식 HMI가 아닙니다. 좌석을 조작하기 위해 지붕을 생략한 설명용 도식입니다. 사진의 외관 트림과 UI 좌석 선택은 별개입니다.

## 제어 기능의 범위

모델 선택은 외형과 정원·좌석 배치를 바꿉니다. 실제 차종/트림의 제어 capability를 가져오는 기능은 없습니다. 특히 이 샘플의 좌석별 온도와 앞좌석 열선만 허용하는 규칙은 실제 차종의 공조 구역/열선 장비를 뜻하지 않습니다. 실제 아이오닉 9·팰리세이드에는 트림/옵션에 따라 뒷좌석 열선 등이 제공됩니다. SDK 통합 시 capability 조회로 교체해야 합니다.
