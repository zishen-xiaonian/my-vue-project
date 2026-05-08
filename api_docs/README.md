# ESB Authentication Service (Python Flask)

This is a standalone Python Flask project that replicates the functionality of `EsbConfigProperties.java` for ESB (Enterprise Service Bus) authentication.

## Features

- SM3 hash encryption (using `gmssl` library)
- Token generation for ESB authentication
- Flask REST API endpoints
- Environment-based configuration
- Request timeout handling

## Project Structure

```
esb-flask-project/
├── app/
│   ├── __init__.py          # Flask application factory
│   └── esb_service.py       # ESB authentication service
├── config/
│   └── esb_config.py        # Configuration classes
├── utils/
│   └── sm3_utils.py         # SM3 encryption utilities
├── run.py                   # Application entry point
├── requirements.txt         # Python dependencies
├── .env.example            # Environment variables template
└── README.md               # This file
```

## Installation

1. Install Python dependencies:
```bash
cd esb-flask-project
pip install -r requirements.txt
```

2. Copy and configure environment variables:
```bash
cp .env.example .env
```

3. Edit `.env` file with your ESB configuration:
```env
ESB_URL=http://pgp.esbgateway.jibei.sgcc.com.cn
ESB_TOKEN_URL=http://esbgateway.jibei.sgcc.com.cn
ESB_APP_ID=your_app_id
ESB_SIGN=your_sign_key
FLASK_PORT=5000
```

## Running the Application

### Development Mode
```bash
python run.py
```

The server will start at `http://localhost:5000`

### Production Mode
```bash
# Set environment variable
export FLASK_ENV=production
python run.py
```

## API Endpoints

### Unified Response Format
Most backend APIs now return a unified JSON envelope:

```json
{
  "code": 0,
  "success": true,
  "message": "ok",
  "data": {},
  "errors": [],
  "traceId": "9f2a5c4f1c7d4d3a9d55d3a2f3f0b7bd",
  "timestamp": "2026-04-25T16:20:10.123456+08:00"
}
```

Error response example:

```json
{
  "code": 400,
  "success": false,
  "message": "beginTime and endTime are required",
  "data": null,
  "errors": [
    {
      "message": "beginTime and endTime are required",
      "code": 400,
      "detail": "optional debug detail"
    }
  ],
  "traceId": "d0ad3b9ea0d24878b902bd3263f4c0f2",
  "timestamp": "2026-04-25T16:21:33.654321+08:00"
}
```

Notes:
- `traceId` can be used to correlate backend logs and frontend errors.
- `/api/esb/request-token` keeps backward-compatible top-level fields (`success`, `access_token`, `expires_in`) for existing clients.
- `/realMeasCenter/*` success responses are upstream pass-through by design; proxy error responses follow the unified envelope.

### 1. Health Check
```
GET /health
```
Returns service health status.

### 2. Get Configuration
```
GET /api/esb/config
```
Returns current ESB configuration (sensitive data masked).

### 3. Generate Token Data
```
GET /api/esb/token-data
```
Generates and returns the token request data (equivalent to the main method output in Java).

**Response:**
```json
{
  "success": true,
  "data": {
    "esb_appid": "esb_66103_1718330081572787442357",
    "esb_sign": "encrypted_sign",
    "sign": "generated_signature",
    "timestamp": 1718330081572,
    "grant_type": "all"
  }
}
```

### 4. Request Token from ESB
```
POST /api/esb/request-token
```
Makes an actual HTTP request to the ESB token endpoint.

### 5. Refresh Configuration
```
POST /api/esb/refresh-config
```
Reloads configuration from environment variables.

## Testing

### Test token data generation:
```bash
curl http://localhost:5000/api/esb/token-data
```

### Test actual token request:
```bash
curl -X POST http://localhost:5000/api/esb/request-token
```

### Check service health:
```bash
curl http://localhost:5000/health
```

## Comparison with Java Version

| Java Feature | Python Equivalent |
|-------------|-------------------|
| `@ConfigurationProperties` | `dataclasses` + `python-dotenv` |
| `DigestUtils.sm3()` | `utils.sm3_utils.DigestUtils.sm3_hash()` |
| `DigestUtils.sm3(key, data)` | `utils.sm3_utils.DigestUtils.sm3_with_key()` |
| `HttpConfig` class | `config.esb_config.HttpConfig` |
| Main method logic | `app.esb_service.EsbAuthService.get_token_request_data()` |

## Dependencies

- **Flask** (3.0.0): Web framework
- **gmssl** (3.2.2): SM3 encryption algorithm
- **requests** (2.31.0): HTTP client library
- **python-dotenv** (1.0.0): Environment variable management

## Notes

- SM3 is a Chinese cryptographic hash standard (GM/T 0004-2012)
- The service uses millisecond timestamps (same as Java version)
- All timestamps are generated using `time.time() * 1000`
- Request timeouts are configurable via environment variables

## Frontend User Identification (Modified Version)

This modified backend adds:

- `POST /api/frontend/users/identify-all`
  - Queries all users from upstream `queryOutageUserDetail` by paging
  - Scores each record by the key/sensitive rule set
  - Optionally persists identified users to MySQL
- `POST /api/frontend/users/from-mysql`
  - Reads identified users directly from MySQL with pagination/filters
  - `beginTime/endTime` are required (frontend time range)
  - Region filter is optional: `rdtCountyId` or `rdtCountyName`; pass `all` (or omit) for all
  - Time filtering uses stored `upstream_begin_time` (upstream record `beginTime`)
  - Supports strict filters from sample fields: `tradeType`, `tradeName`, `rdtCountyId`
- `GET /api/frontend/users/mysql-summary`
  - Returns MySQL-side summary counts (`beginTime/endTime` required)
- `POST /api/frontend/users/distribution/industry`
  - Returns industry distribution (`tradeType/tradeName`) for chart panel (`beginTime/endTime` required)
- `POST /api/frontend/users/distribution/outage-nature`
  - Returns outage nature distribution (`故障停电/计划停电/其他`) for chart panel (`beginTime/endTime` required)
- `GET /api/frontend/users/detail?id=<id>` or `?recordKey=<recordKey>`
  - Returns one row detail for table "详情"
- `GET /api/frontend/system/status`
  - Returns frontend status indicator data (`redis/mysql/upstream`)

Minimal request body:

```json
{
  "beginTime": "2025-03-31 00:00:00",
  "endTime": "2025-03-31 23:59:59",
  "outageNumbers": ["MID20250331000102"],
  "perPage": 200,
  "maxPages": 200,
  "persistToMysql": true,
  "persistScope": "all",
  "includeAllFields": false
}
```

`persistScope` options:

- `all` (default): persist all identified users (including normal users)
- `matched`: only persist users where `isKeyUser=true` or `isSensitiveUser=true`

`includeAllFields` options:

- `false` (default): return compact user fields for frontend usage
- `true`: return full upstream user fields (for debugging only)

`identify-all` output fields follow `chuancan` naming, for example:

```json
{
  "consNo": "1601183507153",
  "consName": "某用户",
  "consTypeName": "低压居民",
  "consVoltType": "02",
  "tradeName": "乡村居民",
  "tradeType": "9920",
  "rdtCityId": "1100...",
  "rdtCityName": "唐山...",
  "rdtCountyId": "1100...",
  "rdtCountyName": "某区县...",
  "isKeyUser": false,
  "isSensitiveUser": false
}
```

`summary.totalUsers` uses upstream `queryOutageUserDetail.result.total` (count value).  
`summary.fetchedUsers` is the actual fetched row count in this request.

Time-window modes (optional):

- `mode: "store_t2"`: force persist and default `daysAgo=2` (T-2 full day)
- `mode: "store_2days"` or `mode: "store_last_2_days"`: force persist and default `daysAgoList=[1,2]` (T-1 + T-2)
- If `beginTime/endTime` are omitted, backend auto-builds date window from `daysAgo`.

`from-mysql` request example (strict sample field filters):

```json
{
  "page": 1,
  "perPage": 20,
  "beginTime": "2026-04-25 09:00:00",
  "endTime": "2026-04-25 10:00:00",
  "userLevel": "key",
  "tradeType": "4410",
  "tradeName": "电厂",
  "rdtCountyId": "1100F3DE23116FADE050007F01006CBE",
  "snapshotStartDate": "2026-04-23",
  "snapshotEndDate": "2026-04-24"
}
```

`from-mysql` response key fields:

- `consNo`, `consName`, `outageNumber`
- `tradeType`, `tradeName`
- `rdtCityId`, `rdtCityName`, `rdtCountyId`, `rdtCountyName`
- `consVoltType`, `consTypeName`
- `isKeyUser`, `isSensitiveUser`, `matchedRules`

Schema migration notes:

- Deprecated columns `query_begin_time` / `query_end_time` are removed automatically during startup.
- Time filtering now uses `upstream_begin_time` (mapped from upstream `beginTime`).

MySQL must be enabled in `.env`:

```env
MYSQL_ENABLED=true
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=tangshan_backend
MYSQL_USER_SCORE_TABLE=user_priority_scores
```

## 四大前端模块 API

以下接口已部署至 `http://154.12.39.249:5003`，数据源为 `outage_user_full` 表（224,220 条）。

数据时间范围：`2024-08-30` ~ `2025-06-30`，前端请求时务必使用此范围内的 `beginTime/endTime`。

### 通用说明

**统一响应格式：**
```json
{
  "code": 0,
  "success": true,
  "message": "ok",
  "data": { ... },
  "errors": [],
  "traceId": "...",
  "timestamp": "2026-05-06T12:00:00+08:00"
}
```

**分页响应格式（data 部分）：**
```json
{
  "total": 1234,
  "page": 1,
  "perPage": 20,
  "list": [ ... ]
}
```

**通用筛选参数（所有 POST 接口均可选）：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `beginTime` | string | 必填，开始时间，如 `"2024-08-01"` 或 `"2024-08-01 00:00:00"` |
| `endTime` | string | 必填，结束时间，如 `"2025-07-01"` 或 `"2025-07-01 23:59:59"` |
| `rdtCountyId` | string | 可选，区县 ID 筛选 |
| `rdtCountyName` | string | 可选，区县名称筛选（与 rdtCountyId 二选一） |
| `page` | int | 可选，页码，默认 1 |
| `perPage` | int | 可选，每页条数，默认 20 |

---

### 一、时间趋势模块

#### 1.1 时间序列数据

```
POST /api/time-trend/series
```

返回按日聚合的停电用户数时间序列，用于折线图。

**额外参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `snapshotDate` | string | 可选，快照日期 |
| `snapshotStartDate` | string | 可选，快照开始日期 |
| `snapshotEndDate` | string | 可选，快照结束日期 |
| `userLevel` | string | 可选，`"key"` / `"sensitive"` 筛选重点/敏感用户 |

**请求示例：**
```json
{
  "beginTime": "2024-08-01",
  "endTime": "2025-07-01"
}
```

**响应示例（data 部分）：**
```json
{
  "list": [
    {
      "date": "2024-10-31",
      "totalUsers": 13600,
      "keyUsers": 973,
      "sensitiveUsers": 38
    }
  ]
}
```

---

#### 1.2 用户停电次数列表

```
POST /api/time-trend/user-list
```

按用户聚合停电次数，分页返回，用于表格展示。

**额外参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `keyword` | string | 可选，搜索用户名/用户编号 |
| `minOutageCount` | int | 可选，最少停电次数筛选 |
| `userLevel` | string | 可选，`"key"` / `"sensitive"` |

**请求示例：**
```json
{
  "beginTime": "2024-08-01",
  "endTime": "2025-07-01",
  "page": 1,
  "perPage": 10,
  "minOutageCount": 3
}
```

**响应示例（data 部分）：**
```json
{
  "total": 56,
  "page": 1,
  "perPage": 10,
  "list": [
    {
      "consNo": "1601183507153",
      "consName": "某用户",
      "consAddr": "某地址",
      "consTypeName": "低压居民",
      "tradeName": "乡村居民",
      "rdtCountyName": "某区县",
      "outageCount": 5
    }
  ]
}
```

---

#### 1.3 用户详情 + 停电历史

```
GET /api/time-trend/user-detail?consNo=<consNo>
```

查询单个用户的完整信息及所有停电记录。

**参数（Query String）：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `consNo` | string | 必填，用户编号 |

**响应示例（data 部分）：**
```json
{
  "consNo": "1601183507153",
  "consName": "某用户",
  "consAddr": "某地址",
  "consTypeName": "低压居民",
  "outageCount": 5,
  "outageHistory": [
    {
      "outageNumber": "MID2024...",
      "beginTime": "2024-10-31 08:00:00",
      "endTime": "2024-10-31 12:00:00",
      "equipmentName": "某设备",
      "outageTypeName": "故障停电"
    }
  ]
}
```

---

### 二、空间分布模块

#### 2.1 设备影响列表

```
POST /api/spatial/equipment-list
```

按设备聚合受影响用户数，分页返回，用于地图/表格。

**额外参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `keyword` | string | 可选，搜索设备名称/ID |

**请求示例：**
```json
{
  "beginTime": "2024-08-01",
  "endTime": "2025-07-01",
  "page": 1,
  "perPage": 10
}
```

**响应示例（data 部分）：**
```json
{
  "total": 4075,
  "page": 1,
  "perPage": 10,
  "list": [
    {
      "equipmentId": "00382bce-...",
      "equipmentName": "东北川528线路千佛寺2变压器",
      "equipmentType": "0401004",
      "totalUsers": 155,
      "keyUsers": 12,
      "sensitiveUsers": 3,
      "rdtCountyName": "某区县"
    }
  ]
}
```

---

#### 2.2 设备关联用户列表

```
GET /api/spatial/equipment-detail?equipmentId=<id>
```

查询某设备下所有受影响用户，分页。

**参数（Query String）：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `equipmentId` | string | 必填，设备 ID |
| `beginTime` | string | 可选 |
| `endTime` | string | 可选 |
| `page` | int | 可选，默认 1 |
| `perPage` | int | 可选，默认 20 |

**响应示例（data 部分）：**
```json
{
  "total": 155,
  "page": 1,
  "perPage": 20,
  "list": [
    {
      "consNo": "1601183507153",
      "consName": "某用户",
      "consAddr": "某地址",
      "beginTime": "2024-10-31 08:00:00",
      "endTime": "2024-10-31 12:00:00"
    }
  ]
}
```

---

### 三、电力故障定位模块

#### 3.1 故障类型汇总

```
POST /api/fault/summary
```

按设备类型分组统计，将设备按影响用户数分为三档（>5000 / 1000~5000 / <1000）。

**额外参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `equipmentType` | string | 可选，设备类型筛选 |

**请求示例：**
```json
{
  "beginTime": "2024-08-01",
  "endTime": "2025-07-01"
}
```

**响应示例（data 部分）：**
```json
{
  "highImpact": { "count": 5, "description": "影响用户>5000" },
  "mediumImpact": { "count": 23, "description": "影响用户1000~5000" },
  "lowImpact": { "count": 4047, "description": "影响用户<1000" },
  "equipment": [
    {
      "equipmentId": "...",
      "equipmentName": "某设备",
      "equipmentType": "0401004",
      "totalUsers": 155
    }
  ]
}
```

---

#### 3.2 故障设备列表

```
POST /api/fault/equipment-list
```

按故障类型/影响等级筛选设备，分页。

**额外参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `equipmentType` | string | 可选，设备类型 |
| `impactLevel` | string | 可选，`"high"` / `"medium"` / `"low"` |

**请求示例：**
```json
{
  "beginTime": "2024-08-01",
  "endTime": "2025-07-01",
  "impactLevel": "high",
  "page": 1,
  "perPage": 10
}
```

**响应示例（data 部分）：**
```json
{
  "total": 5,
  "page": 1,
  "perPage": 10,
  "list": [
    {
      "equipmentId": "...",
      "equipmentName": "某设备",
      "equipmentType": "0401004",
      "totalUsers": 8000,
      "rdtCountyName": "某区县"
    }
  ]
}
```

---

### 四、停电范围评估模块

#### 4.1 四卡片汇总

```
POST /api/outage-scope/summary
```

返回 4 个汇总指标卡片。

**请求示例：**
```json
{
  "beginTime": "2024-08-01",
  "endTime": "2025-07-01"
}
```

**响应示例（data 部分）：**
```json
{
  "restoredEvents": 2309,
  "unrestoredEvents": 0,
  "affectedEquipment": 4075,
  "affectedUsers": 203367
}
```

| 字段 | 说明 |
|------|------|
| `restoredEvents` | 已恢复停电事件数 |
| `unrestoredEvents` | 未恢复停电事件数 |
| `affectedEquipment` | 受影响设备数 |
| `affectedUsers` | 受影响用户数 |

---

#### 4.2 停电事件列表

```
POST /api/outage-scope/event-list
```

按停电编号聚合事件，分页，支持关键词搜索和恢复状态筛选。

**额外参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `keyword` | string | 可选，搜索停电编号/设备名称 |
| `restored` | bool | 可选，`true`=已恢复，`false`=未恢复 |

**请求示例：**
```json
{
  "beginTime": "2024-08-01",
  "endTime": "2025-07-01",
  "page": 1,
  "perPage": 10,
  "restored": true
}
```

**响应示例（data 部分）：**
```json
{
  "total": 2309,
  "page": 1,
  "perPage": 10,
  "list": [
    {
      "outageNumber": "MID2024...",
      "beginTime": "2024-10-31 08:00:00",
      "endTime": "2024-10-31 12:00:00",
      "equipmentName": "某设备",
      "affectedUsers": 150,
      "rdtCountyName": "某区县"
    }
  ]
}
```

---

## Daily Job (Store T-1 + T-2)

Script:

`scripts/store_2days_job.py`

Required environment variables:

- `JOB_AUTH_TOKEN`: non-empty token used as Authorization header

Optional environment variables:

- `JOB_BASE_URL` (default `http://127.0.0.1:5000`)
- `JOB_PER_PAGE` (default `200`)
- `JOB_MAX_PAGES` (default `200`)
- `JOB_TIMEOUT_SEC` (default `600`)

Manual run:

```bash
python scripts/store_2days_job.py
```

Windows Task Scheduler example (daily 02:10):

```powershell
schtasks /Create /SC DAILY /TN "TangshanStore2Days" /TR "cmd /c set JOB_BASE_URL=http://127.0.0.1:5000&& set JOB_AUTH_TOKEN=your_token&& cd /d d:\Desktop\电网横向\backend\tangshan_backend\tangshan_backend_modified&& python scripts\store_2days_job.py" /ST 02:10
```

Linux cron example (daily 02:10):

```bash
10 2 * * * cd /path/to/tangshan_backend_modified && JOB_BASE_URL=http://127.0.0.1:5000 JOB_AUTH_TOKEN=your_token python scripts/store_2days_job.py >> logs/store_2days_job.log 2>&1
```
