# ConceptBug UI Design System

이 문서는 ConceptBug와 하위 앱(컨셉충, AI포토그래퍼 등)의 UI를 동일한 시각 규칙으로 유지하기 위한 기준 문서입니다.
새 기능을 추가할 때 먼저 이 문서를 기준으로 맞춥니다.

## 1. Global Tokens

### Colors
- App Background: `#050505`
- Primary Accent: `#40a5cd`
- Primary Accent Hover: `#358eb0`
- Surface: `rgba(24,24,27,0.45)`
- Border: `rgba(255,255,255,0.08)`
- Text Primary: `#e4e4e7`
- Text Muted: `rgb(113 113 122)` (`text-zinc-500`)
- Error Surface: `rgba(239,68,68,0.15)`
- Error Border: `rgba(239,68,68,0.3)`

### Typography
- Base Font Family: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`
- Panel Title / Sub Title (통일):
  - `font-size: 10px`
  - `font-weight: 900`
  - `text-transform: uppercase`
  - `letter-spacing: 0.3em`
  - `line-height: 1`
  - `color: rgb(113 113 122)`
- Panel Title Icon:
  - 제목 앞 12px 선 아이콘 사용
  - 아이콘 색상은 제목과 동일(`rgb(113 113 122)`)
  - 아이콘+텍스트 간격 `8px`
- CTA Button Text:
  - `font-size: 12px`
  - `font-weight: 900`
  - `text-transform: uppercase`
  - `letter-spacing: 0.2em`
- Body Textarea:
  - `11px ~ 12px`
- Numeric/Camera Values:
  - `font-mono` 허용

### Radius / Spacing / Frame
- Panel Radius: `5px`
- Global Layout Padding: `10px`
- Global Panel Gap: `10px`
- 최상위 화면 프레임(바깥 카드/테두리): **사용하지 않음**

## 2. Layout Rules

- 기본 4열 구조를 유지한다.
- 1열: Subject + Camera + Temp (한 개의 큰 패널)
- 2열: Viewport + Archive (분할, H/V 전환 가능)
- 3열: Ratio + Lens + Effects
- 4열: Subject Prompt + Preview + String + Generate
- 2열 분할선은 `10px` 트랙, 가운데 핸들 라인만 표시한다.

## 3. Panel Rules

- 공통 패널:
  - `background: rgba(24,24,27,0.45)`
  - `border: 1px solid rgba(255,255,255,0.08)`
  - `border-radius: 5px`
  - `backdrop-filter: blur(3px)`
- 패널 내부 섹션 구분은 `border-top: 1px solid rgba(255,255,255,0.10)` 사용.
- 패널 제목과 소제목은 반드시 동일한 토큰(`panel-title`) 사용.

## 4. Controls

### Select Buttons
- 기본:
  - 배경 `rgba(255,255,255,0.03)`
  - 보더 `rgba(255,255,255,0.08)`
  - 텍스트 `#a1a1aa`
- Hover:
  - 보더 `#40a5cd`
  - 텍스트 `#fff`
  - 배경 `rgba(255,255,255,0.09)`
- Active:
  - 배경/보더 `#40a5cd`
  - 텍스트 `#fff`
  - glow `0 0 14px rgba(64,165,205,0.38)`

### Primary CTA
- 배경 `#40a5cd`
- Hover `#358eb0`
- 텍스트 흰색 + `font-black` + uppercase
- Disabled: `opacity: 0.5`

### Input / Textarea
- 배경 `rgba(0,0,0,0.5)` 또는 `rgba(0,0,0,0.7)`
- 보더 `rgba(255,255,255,0.10)`
- Focus 보더 `#40a5cd`

## 5. Photographer-Specific Rules

- 숫자 접두사 제목(`1.`, `2.` 등) 사용 금지.
- Subject/Camera/Temp는 분리 카드가 아니라 하나의 카드로 합친다.
- Archive 버튼은 텍스트(H/V) 대신 기기 회전 아이콘 버튼 사용.
- Archive 전환 버튼은 썸네일 정렬 전환이 아니라
  - Viewport + Archive 패널 분할 방향(H/V) 전환으로 동작해야 한다.
- 앱 배경은 네이비 그라데이션 금지, 항상 `#050505` 고정.
- 3열 패널은 `Output Settings / Lens / Effects` 구성으로 유지하고,
  - `Effects` 패널은 하단까지 채우는 `flex-1` 구조를 사용한다.
- 우측 문자열 영역은 `PROMPT PREVIEW` 이름과 컨셉충 `PROMPT PREVIEW` 타이포/컬러 스타일을 따른다.

## 6. Consistency Checklist

- 패널 간 간격이 모두 `10px`인가?
- 제목/소제목 폰트가 모두 동일한가?
- 최상위 바깥 프레임이 없는가?
- Primary 색상이 `#40a5cd` 계열로 통일되었는가?
- 숫자 접두사 제목이 남아있지 않은가?
- 2열 H/V 전환이 Viewport/Archive 패널에 실제 적용되는가?
