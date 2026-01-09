# SmartLedPro Design System

React + Vite 기반의 SmartLedPro 디자인 시스템 패키지입니다.
Figma Make에서 설치해 프로토타입을 생성하거나, 실제 웹앱에서 동일한 컴포넌트를 재사용할 수 있도록 구성했습니다.

## 설치

```bash
npm i @softj/smartledpro-design-system
```

## 사용

```tsx
import { Button, Card, CardContent } from "@softj/smartledpro-design-system";
```

### 스타일

이 패키지는 Tailwind 유틸리티 클래스 기반 컴포넌트를 포함합니다.

- **Tailwind를 사용하는 앱**: 기존 Tailwind 설정을 그대로 사용하면 됩니다.
- **Tailwind가 없는 환경(Figma Make 등)**: 필요 시 아래 CSS를 추가로 로드할 수 있습니다.

```ts
import "@softj/smartledpro-design-system/styles.css";
```

## 빌드 (패키지 개발)

```bash
npm run build
```
