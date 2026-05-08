# API 说明：`POST /api/frontend/users/stats-overview`

## 接口用途

返回总览统计数据：

1. 上游实时总用户数（`totalUsers`）
2. MySQL 中的重点/敏感/普通/总数统计

---

## 请求信息

- Method: `POST`
- URL: `/api/frontend/users/stats-overview`
- Header:
  - `Content-Type: application/json`
  - `Authorization: <token>`

---

## 请求参数

### 必填

- `beginTime`：`YYYY-MM-DD HH:mm:ss`
- `endTime`：`YYYY-MM-DD HH:mm:ss`

### 可选

- `rdtCountyId`：区县 ID（`all`/`*`/`全部` 或不传表示全地区）
- `rdtCountyName`：区县名称（可替代 ID）
- `snapshotDate`：`YYYY-MM-DD`
- `snapshotStartDate`：`YYYY-MM-DD`
- `snapshotEndDate`：`YYYY-MM-DD`

---

## 统计口径

### `totalUsers`

来自上游 `queryOutageUserDetail.result.total`（实时口径）。

### MySQL 统计字段

- `keyUsers`
- `sensitiveUsers`
- `normalUsers`
- `mysqlTotalUsers`

时间过滤条件：

- `upstream_begin_time >= beginTime`
- `upstream_begin_time <= endTime`

并叠加地区/快照日期过滤（若传入）。

---

## 请求示例

```json
{
  "beginTime": "2026-04-25 09:00:00",
  "endTime": "2026-04-25 10:00:00",
  "rdtCountyId": "all",
  "snapshotStartDate": "2026-04-24",
  "snapshotEndDate": "2026-04-25"
}
```

---

## 返回示例（data）

```json
{
  "totalUsers": 1250,
  "keyUsers": 320,
  "sensitiveUsers": 140,
  "normalUsers": 930,
  "mysqlTotalUsers": 1250,
  "latestUpdatedAt": "2026-04-25T10:25:12"
}
```

---

## 常见错误

- `400`：缺少 `beginTime/endTime`
- `401`：`Authorization` 缺失或无效
- `502`：上游接口失败或 MySQL 不可用

---

## 调试建议

如果 `totalUsers` 与 `mysqlTotalUsers` 不一致，优先检查：

1. 是否在同一时间窗
2. 是否启用了地区/快照过滤
3. 对应时间窗是否已执行过 `identify-all` 并成功入库

