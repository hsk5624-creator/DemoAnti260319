# Product Requirements Document: Developer Profile Website

## 1. 개요 (Overview)

개발자의 역량, 경험, 그리고 주요 프로젝트를 효과적으로 소개하기 위한 개인 프로필 웹사이트입니다. 방문자(채용 담당자, 클라이언트, 동료 개발자 등)에게 전문성을 인상 깊게 전달하는 것을 목표로 합니다. 

포지셔닝 문구 : 0부터 시작하는 제약업계 일반인 바이브코더


## 2. 타겟 목표 (Target Audience)

* **채용 담당자 및 헤드헌터:** 빠른 시간 안에 후보자의 기술 스택과 경력을 파악하려는 목적
* **잠재적 클라이언트:** 프리랜서 외주 작업을 위한 포트폴리오 확인 (해당하는 경우)
* **동료 개발자:** 기술 블로그나 오픈소스 기여 등을 살펴보고 네트워킹을 하기 위한 목적

## 3. 주요 기능 및 페이지 구조 (Key Features & Structure)

### 3.1. 홈/랜딩 섹션 (Home/Hero Section)

* **이름 : 김형수**
* **자기소개 한 줄 요약:** 0부터 시작하는 제약업계 일반인 바이브코더 김형수입니다.
* **Call to Action (CTA):** '이력서 다운로드(또는 보기)', '프로젝트 보기' 등 주요 행동 유도 버튼
* **소셜 링크:** GitHub, LinkedIn, 이메일, 블로그 등 아이콘 링크

### 3.2. 정보 섹션 (About Me)

* **상세 소개:** 개발자로서의 가치관, 성장 과정, 관심 분야 등
* **기술 스택 (Tech Stack):**
  * Frontend (예: React, Next.js, TypeScript, TailwindCSS 등)
  * Backend (예: Node.js, Python, Java 등)
  * Tools (예: Git, Docker, AWS 등)
  * 숙련도를 시각적으로 표현 (아이콘, 프로그레스 바 등)

### 3.3. 프로젝트 아카이브 (Projects)

* **프로젝트 갤러리/리스트:**
  * 썸네일 이미지 또는 데모 영상
  * 프로젝트명 및 간단한 설명
  * 사용한 기술 스택 배지
  * **링크:** GitHub Repository 링크, 실제 서비스(Live Demo) 링크
* **상세 모달/페이지 (선택사항):** 각 프로젝트의 해결한 문제, 기여도, 트러블슈팅 경험 등 상세 내용

### 3.4. 경력 및 학력 (Experience / Resume)

* **타임라인 뷰:** 최신순으로 정렬된 업무 경험
* 1995년 9월 11일 출생
* 2008년 경산초등학교 졸업
* 2011년 성화중학교 졸업
* 2014년 청주고등학교 졸업
* 2014년 충북대학교 생화학과 입학
* 2019년 셀트리온제약 인턴사원 입사
* 2020년 충북대학교 생화학과 졸업
* 2020년~ 셀트리온제약 정직원(운영지원팀)
* 현 직무 : 의약품개발 프로젝트매니저, 제조 경영관리
* 현 직함 : 대리
* 2021년 : US FDA CT-A05 허가승인/상업화
* 2022년 : US FDA CT-A06 허가승인/상업화
* 2024년 : 한국 MFDS CT-K2002(암로젯정) 허가승인/상업화
* 2025년 품질 AI 개발(with 타키타키) 및 충북과학기술혁신원장상 우수기업상 수상
* 2023년 직장인 뮤지컬 'Love actually' 주연
* 2023년 음원 '오늘 주님이 오신다' 외 2곡 발매
* 2024년 음원 '서른, 회상' 발매
* 2024년 2월~ 자일리톨캔디 '별뜰무렵' 스마트스토어 운영
* 별뜰무렵 : 2025년 기준 연매출 3,000만원
* 별뜰무렵 스마트스토어 주소 ([https://smartstore.naver.com/bttots?NaPm=ct%3Dmmwsuzhc%7Cci%3Dcheckout%7Ctr%3Dds%7Ctrx%3Dnull%7Chk%3D003ba9d3a9fb148dce97f7a65177114f73aa905e](https://smartstore.naver.com/bttots?NaPm=ct%3Dmmwsuzhc%7Cci%3Dcheckout%7Ctr%3Dds%7Ctrx%3Dnull%7Chk%3D003ba9d3a9fb148dce97f7a65177114f73aa905e))

### 3.5. 연락처 (Contact)

* 이메일 주소 : hsk2798@naver.com
* 인스타그램 : @brother_ssu
* 전화번호 : 010-2798-5879

## 4. 비기능적 요구사항 (Non-functional Requirements)

* **반응형 디자인 (Responsive Web):** 모바일, 태블릿, 데스크탑 등 다양한 기기에서 깨짐 없이 최적화된 UI 제공
* **성능 최적화 (Performance):** 빠른 페이지 로딩 속도 (이미지 최적화, 코드 스플리팅 등)
* **SEO (검색 엔진 최적화):** 적절한 메타 태그 설정, 시맨틱 HTML 작성으로 검색 엔진 노출 고려
* **접근성 (Accessibility):** 웹 접근성 지침을 준수하여 정보 제공의 평등성 확보
* **애니메이션 (Animation):** 과하지 않고 부드러운 마이크로 애니메이션이나 스크롤 이벤트를 통해 고급스러운 느낌 부여

## 5. 제안하는 기술 스택 (Tech Stack Suggestions)

*(프로젝트의 복잡도와 사용자 편의에 따라 다음 중 선택하거나 추가할 수 있습니다.)*

* **Option A (트렌디 & 확장성):** Next.js + TypeScript + Tailwind CSS + Framer Motion (애니메이션)
* **Option B (가볍고 빠름):** Vite (React/Vue) + Vanilla CSS (or SCSS)
* **Option C (순수 웹 기술 기반):** HTML5 + CSS3 + Vanilla JavaScript (복잡한 프레임워크 없는 간단한 정적 페이지 구현 시)
* **호스팅:** Vercel, Netlify, 또는 GitHub Pages

## 6. 다음 단계 (Next Steps)

1. **디자인 및 레퍼런스 수집:** 선호하는 스타일의 웹사이트 디자인(핀터레스트, awwwards 등 참고) 찾기
2. **콘텐츠 준비:** 본인의 실제 이력, 프로젝트 설명 텍스트 및 이미지 정리
3. **기술 스택 확정:** 위 제안 중 개발에 사용할 기술 스택 픽스
4. **개발 환경 세팅 및 프로젝트 시작**
