# Environment Variables Guide

## Setup

```bash
cp env/.env.example .env
```

`.env` 파일을 수정하여 실제 값을 입력하세요.

## Variables

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `NODE_ENV` | 실행 환경 | `development` |
| `WEB_PORT` | Web 서비스 포트 | `3000` |
| `API_PORT` | API 서비스 포트 | `4000` |
| `ADMIN_PORT` | Admin 서비스 포트 | `8080` |
| `DATABASE_URL` | DB 연결 문자열 | - |

## 주의사항

- `.env` 파일은 git에 커밋하지 마세요
- `.env.example`만 커밋합니다
- 프로덕션 환경에서는 별도의 시크릿 관리 도구를 사용하세요
