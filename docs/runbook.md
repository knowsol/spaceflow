# meeting-room - Runbook

## 일반 운영

### 서비스 시작/중지

```powershell
# 시작
./scripts/start.ps1

# 중지
docker compose down

# 재시작
docker compose restart
```

### 로그 확인

```powershell
# 전체 로그
./scripts/logs.ps1

# 특정 서비스
docker compose logs -f api
docker compose logs -f web
```

### 서비스 상태

```bash
docker compose ps
docker stats
```

## 트러블슈팅

### 서비스 시작 실패

```bash
# 컨테이너 로그 확인
docker compose logs <service-name>

# 이미지 재빌드
./scripts/rebuild.ps1
```

### 포트 충돌

```bash
# 포트 사용 확인 (Windows)
netstat -ano | findstr :<PORT>
```

### DB 접속 실패

1. DB 컨테이너 실행 여부 확인: `docker compose ps`
2. `DATABASE_URL` 환경 변수 확인
3. DB 컨테이너 로그 확인

### 네트워크 문제

```bash
# 네트워크 확인
docker network inspect ai-dev-network

# 네트워크 재생성
docker network rm ai-dev-network
docker network create ai-dev-network
```

## 긴급 대응

### DB 초기화

```powershell
./scripts/reset-db.ps1
```

### 전체 재시작

```bash
docker compose down -v
docker compose up -d --build
```
