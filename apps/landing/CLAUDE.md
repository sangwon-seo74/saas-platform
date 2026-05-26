# landing 도메인 지침

## 도메인 요약
saas-platform 플랫폼 마케팅 랜딩 페이지. 별도 DB/인증 없음.
배포: saas-platform.vercel.app

## 역할
- saas-platform 플랫폼 브랜딩 및 소개
- 각 SaaS 제품(apps/*) 진입점 링크 제공
- 정적 마케팅 콘텐츠 (DB 연결 없음)

## 새 SaaS 추가 시
1. `src/app/page.tsx` → `Solutions` 섹션에 제품 카드 추가
2. `.env.local.example`에 해당 앱 URL 환경변수 추가
3. `NEXT_PUBLIC_<APP>_URL`을 Vercel 환경변수에도 등록

## 환경변수
| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_RROS_URL` | Revenue Retention OS 앱 URL |

@AGENTS.md
