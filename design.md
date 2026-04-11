# ConceptBug UI Design Guide

이 문서는 ConceptBug의 UI 통일성을 유지하기 위한 단일 기준 문서입니다.  
새 기능 추가 시 이 문서를 우선 기준으로 사용합니다.

## 1. Design Principles

- Dark, minimal, high-contrast UI 유지
- 기능 밀도가 높아도 가독성 우선
- 패널 단위 정보 구조를 유지하고 화면 분할 구조를 깨지 않기
- 주요 액션은 Cyan 포인트 컬러로 일관
- 인터랙션은 빠르고 짧게, 과한 애니메이션 금지

## 2. Core Tokens

### Colors

- Background: `#050505`
- Brand Primary: `#40a5cd`
- Brand Primary Hover: `#358eb0`
- Surface Base: `bg-zinc-900/40`
- Surface Alt: `bg-zinc-900/30`, `bg-zinc-900/10`
- Border Default: `border-white/5`
- Border Active/Emphasis: `border-white/80`, `ring-white/20`
- Text Primary: `text-zinc-200`, `text-white`
- Text Secondary: `text-zinc-500`, `text-zinc-600`, `text-zinc-700`
- Error: `bg-red-500/10`, `border-red-500/20`, `text-red-500`

### Typography

- Font family: `Inter`
- Label/Section title: `text-[10px] font-black uppercase tracking-[0.3em]`
- Primary CTA text: `text-[12px] font-black uppercase tracking-[0.2em]`
- Body input text: `text-xs` 또는 `text-[10px]` (패널에 맞춰 선택)
- Mono-like control text(키/모델 등): `font-mono` 유지

### Radius, Spacing, Shadows

- Main panel radius: `rounded-[5px]`
- Input/button inner radius: `rounded-lg` 또는 `rounded-xl`
- Global layout spacing: `p-[10px]`, `gap-[10px]`
- Emphasis shadow: `shadow-2xl` (CTA, 카드 강조에만 사용)

## 3. Layout Rules

- 기본 4영역 레이아웃 구조 유지
- 좌측: 프로젝트/인증/옵션
- 중앙: 결과 미리보기 + 아카이브(분할 가능)
- 우측: 프롬프트 편집/참조 이미지/생성 액션
- 패널은 `border border-white/5`와 반투명 다크 배경 조합 유지
- 새 기능은 기존 패널 안에 넣되, 독립성이 크면 새 패널 추가

## 4. Component Patterns

### Panel

- 기본 형태: `bg-zinc-900/40 border border-white/5 rounded-[5px] p-3`
- 제목은 상단 좌측 고정, `uppercase + tracking` 유지

### Input / Textarea

- 배경: `bg-black/20` 또는 `bg-white/[0.03]`
- 테두리: `border-white/5`
- 포커스: 배경/테두리 약한 강화 (`focus:bg-white/[0.07]`, `focus:border-white/10`)
- 플레이스홀더는 저대비 (`placeholder:text-zinc-700`) 유지

### Buttons

- Primary CTA: `bg-[#40a5cd] hover:bg-[#358eb0] text-white`
- Danger/Cancel: red 계열 반투명 배경 사용
- Disabled: `disabled:opacity-50` 기본
- 버튼 타이포는 가능한 `font-black uppercase`

### Icon Buttons

- 배경 기본 약하게 (`bg-black/20`)
- hover 시 명확한 피드백 (`hover:bg-black/90`, `hover:text-white`)
- 도구성 버튼은 크기/패딩 일관 유지 (`p-3` 계열)

## 5. Interaction Rules

- 로딩 상태는 스피너 + 대문자 상태 텍스트 조합 유지
- 생성/업스케일/추출/번역 동시 실행 방지
- 에러 메시지는 하단 CTA 근처, 붉은 패널 형태로 표시
- 성공 상태는 과한 토스트 대신 다음 상태(결과 표시)로 전달

## 6. Content & Copy Rules

- 섹션명: 영문 대문자 형식 유지 (`OUTPUT SETTINGS`, `PROMPT PREVIEW`)
- 버튼 텍스트: 짧고 동사 중심 (`GENERATE`, `EXTRACT`, `SAVE`, `OPEN`)
- 기술 입력 필드(키/모델)는 사용자가 즉시 이해 가능한 용어 사용
- 오류 문구는 짧고 행동 지시 포함

## 7. New Feature Checklist

- 패널 배경/보더가 기존 규칙과 동일한가
- 타이포 스케일(`10px`, `12px`, `xs`)을 벗어나지 않았는가
- Primary 색상은 `#40a5cd` 계열만 사용했는가
- Disabled/Loading/Error 상태가 모두 정의되었는가
- 마우스 hover/active 피드백이 기존과 톤이 맞는가
- 모바일/작은 화면에서 패널 overflow가 깨지지 않는가

## 8. Do / Don't

- Do: 기존 패턴을 재사용하고, 새 패턴은 최소 단위로 추가
- Do: 기능이 늘어도 시각적 리듬(간격/테두리/타이포) 유지
- Don't: 임의 색상 추가, 과도한 그래디언트, 강한 글로우 남발
- Don't: 패널마다 다른 스타일 시스템 도입

## 9. Implementation Note

- 이 문서가 우선이며, 예외가 필요하면 먼저 문서에 토큰/패턴을 추가한 뒤 코드 반영
- 추후 컴포넌트 분리 시 `tokens.ts` 또는 `ui/theme.ts`로 이 토큰을 코드화할 것
