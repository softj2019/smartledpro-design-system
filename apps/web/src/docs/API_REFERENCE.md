# API Reference - 전광판 관리 시스템

## 📋 목차
- [인증](#인증)
- [템플릿 API](#템플릿-api)
- [스케줄 API](#스케줄-api)
- [전광판 송출 API](#전광판-송출-api)
- [감사 로그 API](#감사-로그-api)
- [공통 응답 형식](#공통-응답-형식)
- [에러 코드](#에러-코드)

---

## Base URL
```
https://{projectId}.supabase.co/functions/v1/make-server-5231839f
```

## 인증

모든 API 요청은 `Authorization` 헤더에 Bearer Token이 필요합니다.

```http
Authorization: Bearer {access_token}
```

### 테스트 계정 생성

**Endpoint**: `POST /setup-test-users`

**설명**: 개발/테스트용 계정을 생성합니다.

**권한**: 공개 (인증 불필요)

**Request**:
```http
POST /make-server-5231839f/setup-test-users
Authorization: Bearer {anon_key}
```

**Response**:
```json
{
  "success": true,
  "message": "테스트 계정 생성이 완료되었습니다.",
  "results": [
    {
      "email": "admin@goyang.go.kr",
      "status": "created",
      "user_id": "uuid",
      "role": "ADMIN"
    },
    {
      "email": "operator@goyang.go.kr",
      "status": "created",
      "user_id": "uuid",
      "role": "OPERATOR"
    },
    {
      "email": "viewer@goyang.go.kr",
      "status": "already_exists",
      "message": "이미 존재하는 계정입니다."
    }
  ]
}
```

**생성되는 계정**:
- `admin@goyang.go.kr` / `Admin1234!`
- `operator@goyang.go.kr` / `Operator1234!`
- `viewer@goyang.go.kr` / `Viewer1234!`

---

## 템플릿 API

### 템플릿 목록 조회

**Endpoint**: `GET /templates`

**설명**: 모든 템플릿을 조회합니다. 카테고리별 필터링 가능.

**권한**: 모든 역할

**Query Parameters**:
- `category` (optional): `emergency`, `notice`, `weather`, `general`, `event`, `all`

**Request**:
```http
GET /make-server-5231839f/templates?category=notice
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "주말 운영 안내",
      "title": "주말 체육공원 운영 안내",
      "body": "토요일, 일요일 오전 6시부터 오후 10시까지 운영합니다.",
      "highlight": "주말 특별 운영",
      "style_config": {
        "background": "#ffffff",
        "textColor": "#000000"
      },
      "category": "notice",
      "version": 1,
      "created_by": "uuid",
      "created_at": "2024-12-19T10:00:00Z",
      "updated_at": "2024-12-19T10:00:00Z"
    }
  ]
}
```

### 템플릿 상세 조회

**Endpoint**: `GET /templates/:id`

**설명**: 특정 템플릿의 상세 정보를 조회합니다.

**권한**: 모든 역할

**Request**:
```http
GET /make-server-5231839f/templates/{template_id}
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "template": {
    "id": "uuid",
    "name": "주말 운영 안내",
    "title": "주말 체육공원 운영 안내",
    "body": "토요일, 일요일 오전 6시부터 오후 10시까지 운영합니다.",
    "highlight": "주말 특별 운영",
    "style_config": {
      "background": "#ffffff",
      "textColor": "#000000"
    },
    "category": "notice",
    "version": 1,
    "created_by": "uuid",
    "created_at": "2024-12-19T10:00:00Z",
    "updated_at": "2024-12-19T10:00:00Z"
  }
}
```

**Error Responses**:
- `404 Not Found`: 템플릿을 찾을 수 없음

### 템플릿 생성

**Endpoint**: `POST /templates`

**설명**: 새로운 템플릿을 생성합니다.

**권한**: OPERATOR, ADMIN

**Request Body**:
```json
{
  "name": "주말 운영 안내",
  "title": "주말 체육공원 운영 안내",
  "body": "토요일, 일요일 오전 6시부터 오후 10시까지 운영합니다.",
  "highlight": "주말 특별 운영",
  "style_config": {
    "background": "#ffffff",
    "textColor": "#000000"
  },
  "category": "notice"
}
```

**Required Fields**:
- `name`: 템플릿 이름
- `title`: 제목
- `body`: 본문

**Optional Fields**:
- `highlight`: 강조 문구
- `style_config`: 스타일 설정 (JSON)
- `category`: 카테고리 (기본값: `general`)

**Response**:
```json
{
  "template": {
    "id": "newly-created-uuid",
    "name": "주말 운영 안내",
    "title": "주말 체육공원 운영 안내",
    "body": "토요일, 일요일 오전 6시부터 오후 10시까지 운영합니다.",
    "highlight": "주말 특별 운영",
    "style_config": {
      "background": "#ffffff",
      "textColor": "#000000"
    },
    "category": "notice",
    "version": 1,
    "created_by": "user-uuid",
    "created_at": "2024-12-19T10:00:00Z",
    "updated_at": "2024-12-19T10:00:00Z"
  }
}
```

**Status Code**: `201 Created`

**Error Responses**:
- `400 Bad Request`: 필수 필드 누락
- `401 Unauthorized`: 인증 실패
- `403 Forbidden`: 권한 부족 (VIEWER 역할)

### 템플릿 수정

**Endpoint**: `PUT /templates/:id`

**설명**: 기존 템플릿을 수정합니다. 버전이 자동으로 증가합니다.

**권한**: OPERATOR, ADMIN

**Request Body**:
```json
{
  "name": "주말 운영 안내 (수정)",
  "title": "주말 체육공원 운영 안내",
  "body": "토요일, 일요일 오전 7시부터 오후 10시까지 운영합니다.",
  "highlight": "운영 시간 변경",
  "style_config": {
    "background": "#ffffff",
    "textColor": "#000000"
  },
  "category": "notice"
}
```

**Response**:
```json
{
  "template": {
    "id": "uuid",
    "name": "주말 운영 안내 (수정)",
    "title": "주말 체육공원 운영 안내",
    "body": "토요일, 일요일 오전 7시부터 오후 10시까지 운영합니다.",
    "highlight": "운영 시간 변경",
    "style_config": {
      "background": "#ffffff",
      "textColor": "#000000"
    },
    "category": "notice",
    "version": 2,
    "created_by": "user-uuid",
    "created_at": "2024-12-19T10:00:00Z",
    "updated_at": "2024-12-19T11:00:00Z"
  }
}
```

**Error Responses**:
- `404 Not Found`: 템플릿을 찾을 수 없음
- `403 Forbidden`: 권한 부족

### 템플릿 삭제

**Endpoint**: `DELETE /templates/:id`

**설명**: 템플릿을 삭제합니다. 스케줄에서 사용 중이면 삭제할 수 없습니다.

**권한**: OPERATOR, ADMIN

**Request**:
```http
DELETE /make-server-5231839f/templates/{template_id}
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "success": true,
  "message": "Template deleted successfully"
}
```

**Error Responses**:
- `400 Bad Request`: 스케줄에서 사용 중
- `404 Not Found`: 템플릿을 찾을 수 없음
- `403 Forbidden`: 권한 부족

---

## 스케줄 API

### 스케줄 목록 조회

**Endpoint**: `GET /schedules`

**설명**: 모든 스케줄을 조회합니다.

**권한**: 모든 역할

**Query Parameters**:
- `active` (optional): `true`, `false`, `all` (기본값: `all`)
- `template_id` (optional): 특정 템플릿의 스케줄만 조회

**Request**:
```http
GET /make-server-5231839f/schedules?active=true
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "schedules": [
    {
      "id": "uuid",
      "name": "아침 운영 안내",
      "template_id": "template-uuid",
      "start_datetime": "2024-12-20T09:00:00Z",
      "end_datetime": null,
      "display_duration_type": "5min",
      "display_duration_minutes": null,
      "repeat_type": "daily",
      "repeat_config": null,
      "is_active": true,
      "priority": 200,
      "created_by": "user-uuid",
      "created_at": "2024-12-19T10:00:00Z",
      "updated_at": "2024-12-19T10:00:00Z",
      "last_executed_at": "2024-12-20T09:00:00Z"
    }
  ]
}
```

### 스케줄 상세 조회

**Endpoint**: `GET /schedules/:id`

**설명**: 특정 스케줄의 상세 정보와 실행 이력을 조회합니다.

**권한**: 모든 역할

**Request**:
```http
GET /make-server-5231839f/schedules/{schedule_id}
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "schedule": {
    "id": "uuid",
    "name": "아침 운영 안내",
    "template_id": "template-uuid",
    "start_datetime": "2024-12-20T09:00:00Z",
    "end_datetime": null,
    "display_duration_type": "5min",
    "display_duration_minutes": null,
    "repeat_type": "daily",
    "repeat_config": null,
    "is_active": true,
    "priority": 200,
    "created_by": "user-uuid",
    "created_at": "2024-12-19T10:00:00Z",
    "updated_at": "2024-12-19T10:00:00Z",
    "last_executed_at": "2024-12-20T09:00:00Z"
  },
  "template": {
    "id": "template-uuid",
    "name": "아침 안내",
    "title": "좋은 아침입니다"
  },
  "executions": [
    {
      "id": "exec-uuid",
      "schedule_id": "uuid",
      "template_id": "template-uuid",
      "executed_at": "2024-12-20T09:00:00Z",
      "status": "success",
      "details": {
        "priority": 200,
        "replaced": false
      }
    }
  ]
}
```

### 스케줄 생성

**Endpoint**: `POST /schedules`

**설명**: 새로운 스케줄을 생성합니다.

**권한**: OPERATOR, ADMIN

**Request Body**:
```json
{
  "name": "아침 운영 안내",
  "template_id": "template-uuid",
  "start_datetime": "2024-12-20T09:00:00Z",
  "end_datetime": null,
  "display_duration_type": "5min",
  "display_duration_minutes": null,
  "repeat_type": "daily",
  "repeat_config": null,
  "is_active": true
}
```

**Required Fields**:
- `name`: 스케줄 이름
- `template_id`: 템플릿 ID
- `start_datetime`: 시작 날짜/시간 (ISO 8601)
- `display_duration_type`: 표시 시간 타입 (`1min`, `5min`, `10min`, `all-day`, `custom`)

**Optional Fields**:
- `end_datetime`: 종료 날짜 (없으면 무기한)
- `display_duration_minutes`: custom 타입일 때 분 단위
- `repeat_type`: 반복 타입 (`none`, `daily`, `weekly`, `custom`)
- `repeat_config`: 반복 설정 (weekly일 때 요일 정보)
- `is_active`: 활성화 상태 (기본값: `true`)

**Display Duration Types**:
- `1min`: 1분간 표시
- `5min`: 5분간 표시
- `10min`: 10분간 표시
- `all-day`: 해당 날짜 종일 표시
- `custom`: 직접 입력 (`display_duration_minutes` 필요)

**Repeat Types**:
- `none`: 반복 없음 (1회만 실행)
- `daily`: 매일 반복
- `weekly`: 매주 반복 (요일 지정 필요)
- `custom`: 사용자 정의 (향후 확장)

**Repeat Config (weekly 예시)**:
```json
{
  "days_of_week": [0, 2, 4]  // 월(0), 수(2), 금(4)
}
```

**Response**:
```json
{
  "schedule": {
    "id": "newly-created-uuid",
    "name": "아침 운영 안내",
    "template_id": "template-uuid",
    "start_datetime": "2024-12-20T09:00:00Z",
    "end_datetime": null,
    "display_duration_type": "5min",
    "display_duration_minutes": null,
    "repeat_type": "daily",
    "repeat_config": null,
    "is_active": true,
    "priority": 200,
    "created_by": "user-uuid",
    "created_at": "2024-12-19T10:00:00Z",
    "updated_at": "2024-12-19T10:00:00Z",
    "last_executed_at": null
  }
}
```

**Status Code**: `201 Created`

**Error Responses**:
- `400 Bad Request`: 필수 필드 누락, 유효하지 않은 날짜
- `404 Not Found`: 템플릿을 찾을 수 없음
- `409 Conflict`: 스케줄 시간 충돌

### 스케줄 수정

**Endpoint**: `PUT /schedules/:id`

**설명**: 기존 스케줄을 수정합니다.

**권한**: OPERATOR, ADMIN

**Request Body**:
```json
{
  "name": "아침 운영 안내 (수정)",
  "start_datetime": "2024-12-20T08:00:00Z",
  "display_duration_type": "10min",
  "is_active": true
}
```

**Response**:
```json
{
  "schedule": {
    "id": "uuid",
    "name": "아침 운영 안내 (수정)",
    "template_id": "template-uuid",
    "start_datetime": "2024-12-20T08:00:00Z",
    "end_datetime": null,
    "display_duration_type": "10min",
    "display_duration_minutes": null,
    "repeat_type": "daily",
    "repeat_config": null,
    "is_active": true,
    "priority": 200,
    "created_by": "user-uuid",
    "created_at": "2024-12-19T10:00:00Z",
    "updated_at": "2024-12-19T11:00:00Z",
    "last_executed_at": null
  }
}
```

### 스케줄 삭제

**Endpoint**: `DELETE /schedules/:id`

**설명**: 스케줄을 삭제합니다.

**권한**: OPERATOR, ADMIN

**Request**:
```http
DELETE /make-server-5231839f/schedules/{schedule_id}
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "success": true
}
```

### 스케줄 활성화/비활성화

**Endpoint**: `PUT /schedules/:id/toggle`

**설명**: 스케줄의 활성화 상태를 토글합니다.

**권한**: OPERATOR, ADMIN

**Request**:
```http
PUT /make-server-5231839f/schedules/{schedule_id}/toggle
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "schedule": {
    "id": "uuid",
    "name": "아침 운영 안내",
    "is_active": false,
    ...
  }
}
```

### 스케줄 자동 실행

**Endpoint**: `POST /schedules/check-and-execute`

**설명**: 현재 시간에 실행해야 할 스케줄을 확인하고 실행합니다. Cron Job에서 호출됩니다.

**권한**: 공개 (내부 사용, 향후 인증 추가 권장)

**Request**:
```http
POST /make-server-5231839f/schedules/check-and-execute
```

**Response**:
```json
{
  "executed": true,
  "schedule_id": "uuid",
  "schedule_name": "아침 운영 안내",
  "template_id": "template-uuid",
  "priority": 200,
  "replaced": false,
  "current_priority": null
}
```

또는 실행할 스케줄이 없는 경우:
```json
{
  "executed": false,
  "message": "No schedules to execute at this time"
}
```

### 스케줄 실행 이력 조회

**Endpoint**: `GET /schedules/:id/executions`

**설명**: 특정 스케줄의 실행 이력을 조회합니다.

**권한**: 모든 역할

**Query Parameters**:
- `limit` (optional): 결과 개수 (기본값: 50)

**Request**:
```http
GET /make-server-5231839f/schedules/{schedule_id}/executions?limit=10
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "schedule_id": "uuid",
  "schedule_name": "아침 운영 안내",
  "executions": [
    {
      "id": "exec-uuid",
      "schedule_id": "uuid",
      "template_id": "template-uuid",
      "template_name": "아침 안내",
      "executed_at": "2024-12-20T09:00:00Z",
      "status": "success",
      "details": {
        "priority": 200,
        "replaced": false
      }
    }
  ],
  "total": 10
}
```

### 전체 스케줄 실행 이력 조회

**Endpoint**: `GET /schedules/executions/recent`

**설명**: 모든 스케줄의 최근 실행 이력을 조회합니다.

**권한**: 모든 역할

**Query Parameters**:
- `limit` (optional): 결과 개수 (기본값: 100)

**Request**:
```http
GET /make-server-5231839f/schedules/executions/recent?limit=20
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "executions": [
    {
      "id": "exec-uuid",
      "schedule_id": "schedule-uuid",
      "schedule_name": "아침 운영 안내",
      "template_id": "template-uuid",
      "template_name": "아침 안내",
      "executed_at": "2024-12-20T09:00:00Z",
      "status": "success",
      "details": {
        "priority": 200,
        "replaced": false
      }
    }
  ],
  "total": 20
}
```

---

## 전광판 송출 API

### 수동 송출

**Endpoint**: `POST /display/send`

**설명**: 템플릿을 즉시 전광판으로 송출합니다.

**권한**: OPERATOR, ADMIN

**Request Body**:
```json
{
  "template_id": "template-uuid"
}
```

**Response**:
```json
{
  "success": true,
  "message": "전광판으로 전송되었습니다.",
  "template": {
    "id": "template-uuid",
    "name": "긴급 공지"
  }
}
```

**Error Responses**:
- `400 Bad Request`: template_id 누락
- `404 Not Found`: 템플릿을 찾을 수 없음
- `403 Forbidden`: 권한 부족

### 현재 송출 상태 조회

**Endpoint**: `GET /display/current`

**설명**: 현재 전광판에 표시 중인 템플릿을 조회합니다.

**권한**: 모든 역할

**Request**:
```http
GET /make-server-5231839f/display/current
Authorization: Bearer {access_token}
```

**Response (송출 중인 경우)**:
```json
{
  "success": true,
  "template": {
    "id": "template-uuid",
    "name": "아침 안내",
    "title": "좋은 아침입니다",
    "body": "체육공원을 이용해주셔서 감사합니다.",
    "highlight": null,
    "style_config": {},
    "category": "notice"
  },
  "source": "schedule",
  "last_updated": "2024-12-20T09:00:00Z",
  "settings": {
    "position": { "x": 0, "y": 0 },
    "scaleX": 1,
    "scaleY": 1,
    "showBorder": true
  }
}
```

**Response (송출 중이지 않은 경우)**:
```json
{
  "success": true,
  "template": null,
  "source": "none",
  "last_updated": "2024-12-20T09:00:00Z",
  "settings": {
    "position": { "x": 0, "y": 0 },
    "scaleX": 1,
    "scaleY": 1,
    "showBorder": true
  }
}
```

**Source Types**:
- `manual`: 수동 송출
- `schedule`: 스케줄 자동 송출
- `default`: 기본 템플릿
- `none`: 송출 중이지 않음

### 전광판 설정 업데이트

**Endpoint**: `PUT /display/settings`

**설명**: 전광판 위치 및 크기 설정을 업데이트합니다.

**권한**: OPERATOR, ADMIN

**Request Body**:
```json
{
  "position": { "x": 100, "y": 50 },
  "scaleX": 1.2,
  "scaleY": 1.2,
  "showBorder": false
}
```

**Response**:
```json
{
  "success": true,
  "settings": {
    "position": { "x": 100, "y": 50 },
    "scaleX": 1.2,
    "scaleY": 1.2,
    "showBorder": false
  }
}
```

### 전광판 설정 변경 이력

**Endpoint**: `GET /display/settings/history`

**설명**: 전광판 설정 변경 이력을 조회합니다.

**권한**: 모든 역할

**Request**:
```http
GET /make-server-5231839f/display/settings/history
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "success": true,
  "history": [
    {
      "id": "log-uuid",
      "timestamp": "2024-12-20T09:00:00Z",
      "user_email": "operator@goyang.go.kr",
      "user_role": "OPERATOR",
      "settings": {
        "position": { "x": 100, "y": 50 },
        "scaleX": 1.2,
        "scaleY": 1.2,
        "showBorder": false
      }
    }
  ]
}
```

---

## 감사 로그 API

### 감사 로그 조회

**Endpoint**: `GET /audit-logs`

**설명**: 감사 로그를 조회합니다. 다양한 필터 지원.

**권한**: 모든 역할

**Query Parameters**:
- `limit` (optional): 결과 개수 (기본값: 100)
- `action` (optional): `CREATE`, `UPDATE`, `DELETE`, `EXECUTE`, `DISPLAY_SEND`
- `resource_type` (optional): `TEMPLATE`, `SCHEDULE`, `DISPLAY`
- `user_id` (optional): 사용자 ID
- `start_date` (optional): 시작 날짜 (ISO 8601)
- `end_date` (optional): 종료 날짜 (ISO 8601)

**Request**:
```http
GET /make-server-5231839f/audit-logs?action=CREATE&resource_type=TEMPLATE&limit=50
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "logs": [
    {
      "id": "log-uuid",
      "user_id": "user-uuid",
      "user_email": "operator@goyang.go.kr",
      "user_role": "OPERATOR",
      "action": "CREATE",
      "resource_type": "TEMPLATE",
      "resource_id": "template-uuid",
      "action_detail": {
        "template_name": "주말 운영 안내",
        "category": "notice"
      },
      "created_at": "2024-12-19T10:00:00Z"
    }
  ],
  "total": 50
}
```

### 감사 로그 통계

**Endpoint**: `GET /audit-logs/stats`

**설명**: 최근 24시간 감사 로그 통계를 조회합니다.

**권한**: 모든 역할

**Request**:
```http
GET /make-server-5231839f/audit-logs/stats
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "stats": {
    "total_24h": 150,
    "by_action": {
      "CREATE": 20,
      "UPDATE": 50,
      "DELETE": 5,
      "EXECUTE": 70,
      "DISPLAY_SEND": 5
    },
    "by_resource_type": {
      "TEMPLATE": 30,
      "SCHEDULE": 90,
      "DISPLAY": 30
    }
  }
}
```

### 테스트 감사 로그 생성

**Endpoint**: `POST /audit-logs/test-data`

**설명**: 테스트용 감사 로그 데이터를 생성합니다.

**권한**: OPERATOR, ADMIN

**Request**:
```http
POST /make-server-5231839f/audit-logs/test-data
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "success": true,
  "message": "6개의 테스트 로그가 생성되었습니다.",
  "logs": [...]
}
```

---

## 공통 응답 형식

### 성공 응답
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### 에러 응답
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

---

## 에러 코드

| Status Code | 설명 |
|-------------|------|
| 200 OK | 성공 |
| 201 Created | 리소스 생성 성공 |
| 400 Bad Request | 잘못된 요청 (필수 필드 누락, 유효하지 않은 값) |
| 401 Unauthorized | 인증 실패 (토큰 없음, 만료됨) |
| 403 Forbidden | 권한 부족 (역할 부족) |
| 404 Not Found | 리소스를 찾을 수 없음 |
| 409 Conflict | 리소스 충돌 (스케줄 시간 충돌) |
| 500 Internal Server Error | 서버 내부 오류 |

---

## 예제 시나리오

### 시나리오 1: 템플릿 생성 후 즉시 송출

```bash
# 1. 템플릿 생성
curl -X POST https://{projectId}.supabase.co/functions/v1/make-server-5231839f/templates \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "긴급 공지",
    "title": "긴급: 시설 점검 안내",
    "body": "오늘 오후 2시부터 4시까지 시설 점검이 있습니다.",
    "category": "emergency"
  }'

# 2. 응답에서 template_id 확인
# Response: { "template": { "id": "abc123..." } }

# 3. 즉시 송출
curl -X POST https://{projectId}.supabase.co/functions/v1/make-server-5231839f/display/send \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "abc123..."
  }'
```

### 시나리오 2: 매일 반복 스케줄 생성

```bash
curl -X POST https://{projectId}.supabase.co/functions/v1/make-server-5231839f/schedules \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "아침 안내방송",
    "template_id": "template-uuid",
    "start_datetime": "2024-12-20T09:00:00Z",
    "end_datetime": null,
    "display_duration_type": "5min",
    "repeat_type": "daily",
    "is_active": true
  }'
```

### 시나리오 3: 매주 월/수/금 반복 스케줄

```bash
curl -X POST https://{projectId}.supabase.co/functions/v1/make-server-5231839f/schedules \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "주중 운동 프로그램 안내",
    "template_id": "template-uuid",
    "start_datetime": "2024-12-20T10:00:00Z",
    "end_datetime": "2025-01-31T23:59:59Z",
    "display_duration_type": "10min",
    "repeat_type": "weekly",
    "repeat_config": {
      "days_of_week": [0, 2, 4]
    },
    "is_active": true
  }'
```

---

**문서 버전**: 1.0  
**최종 업데이트**: 2024-12-19
