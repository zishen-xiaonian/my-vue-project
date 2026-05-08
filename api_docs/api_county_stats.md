# API 文档：区县统计

## 1. 获取区县列表

- Method: `POST`
- URL: `/api/county/list`

### 请求参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `cityId` | 否 | 按地市过滤区县，不传则返回全部 |

### 请求示例
```json
{}
```

按地市过滤：
```json
{
  "cityId": "1100F3DE22316FADE050007F01006CBE"
}
```

### 返回示例
```json
{
  "code": 0,
  "success": true,
  "data": {
    "list": [
      {
        "countyId": "1100F3DE23116FADE050007F01006CBE",
        "countyName": "遵化市供电公司",
        "cityId": "1100F3DE22316FADE050007F01006CBE"
      }
    ]
  }
}
```

---

## 2. 区县用户统计

- Method: `POST`
- URL: `/api/county/stats`

### 请求参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `beginTime` | 是 | 开始时间 `YYYY-MM-DD HH:mm:ss` |
| `endTime` | 是 | 结束时间 `YYYY-MM-DD HH:mm:ss` |
| `countyId` | 否 | 区县ID，传入则返回该区县统计，不传则返回所有区县统计 |
| `snapshotDate` | 否 | 快照日期 `YYYY-MM-DD` |
| `snapshotStartDate` | 否 | 快照起始日期 |
| `snapshotEndDate` | 否 | 快照结束日期 |

### 请求示例（全部区县）
```json
{
  "beginTime": "2026-04-25 00:00:00",
  "endTime": "2026-04-25 23:59:59"
}
```

### 返回示例（全部区县）
```json
{
  "code": 0,
  "success": true,
  "data": {
    "summary": {
      "totalUsers": 1250,
      "keyUsers": 320,
      "sensitiveUsers": 140,
      "normalUsers": 930
    },
    "list": [
      {
        "countyId": "1100F3DE23116FADE050007F01006CBE",
        "countyName": "遵化市供电公司",
        "totalUsers": 200,
        "keyUsers": 60,
        "sensitiveUsers": 25,
        "normalUsers": 140
      }
    ]
  }
}
```

### 请求示例（指定区县）
```json
{
  "beginTime": "2026-04-25 00:00:00",
  "endTime": "2026-04-25 23:59:59",
  "countyId": "1100F3DE23116FADE050007F01006CBE"
}
```

### 返回示例（指定区县）
```json
{
  "code": 0,
  "success": true,
  "data": {
    "totalUsers": 200,
    "keyUsers": 60,
    "sensitiveUsers": 25,
    "normalUsers": 140
  }
}
```

---

## 3. 区县详细统计（行业分布 + 停电性质分布）

- Method: `POST`
- URL: `/api/county/detail-stats`

### 请求参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `beginTime` | 是 | 开始时间 `YYYY-MM-DD HH:mm:ss` |
| `endTime` | 是 | 结束时间 `YYYY-MM-DD HH:mm:ss` |
| `countyId` | 否 | 区县ID，不传则统计全部 |
| `snapshotDate` | 否 | 快照日期 `YYYY-MM-DD` |
| `snapshotStartDate` | 否 | 快照起始日期 |
| `snapshotEndDate` | 否 | 快照结束日期 |

### 请求示例
```json
{
  "beginTime": "2026-04-25 00:00:00",
  "endTime": "2026-04-25 23:59:59",
  "countyId": "1100F3DE23116FADE050007F01006CBE"
}
```

### 返回示例
```json
{
  "code": 0,
  "success": true,
  "data": {
    "summary": {
      "keyUsers": 60,
      "sensitiveUsers": 25,
      "total": 85
    },
    "keyUserByTrade": [
      { "tradeType": "101", "tradeName": "普通工业", "userCount": 30 },
      { "tradeType": "201", "tradeName": "商业", "userCount": 20 }
    ],
    "sensitiveUserByTrade": [
      { "tradeType": "301", "tradeName": "学校", "userCount": 15 },
      { "tradeType": "401", "tradeName": "医院", "userCount": 10 }
    ],
    "outageNatureDistribution": [
      { "outageNature": "故障停电", "userCount": 40, "percentage": 47.1 },
      { "outageNature": "计划停电", "userCount": 35, "percentage": 41.2 },
      { "outageNature": "其他", "userCount": 10, "percentage": 11.8 }
    ]
  }
}
```

---

## 4. 区县用户列表（分页 + 搜索 + 筛选）

- Method: `POST`
- URL: `/api/county/user-list`

### 请求参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `beginTime` | 是 | 开始时间 `YYYY-MM-DD HH:mm:ss` |
| `endTime` | 是 | 结束时间 `YYYY-MM-DD HH:mm:ss` |
| `countyId` | 否 | 区县ID，不传则返回全部 |
| `userLevel` | 否 | 筛选类别：`key`（重点）/ `sensitive`（敏感）/ 不传返回全部 |
| `keyword` | 否 | 按用户编号或姓名模糊搜索 |
| `page` | 否 | 页码，默认 1 |
| `perPage` | 否 | 每页条数，默认 20 |
| `snapshotDate` | 否 | 快照日期 `YYYY-MM-DD` |
| `snapshotStartDate` | 否 | 快照起始日期 |
| `snapshotEndDate` | 否 | 快照结束日期 |

### 请求示例
```json
{
  "beginTime": "2026-04-25 00:00:00",
  "endTime": "2026-04-25 23:59:59",
  "countyId": "1100F3DE23116FADE050007F01006CBE",
  "page": 1,
  "perPage": 20
}
```

### 返回示例
```json
{
  "code": 0,
  "success": true,
  "data": {
    "total": 85,
    "page": 1,
    "perPage": 20,
    "list": [
      {
        "consNo": "0012345678",
        "consName": "某某工厂",
        "countyName": "遵化市供电公司",
        "tradeName": "普通工业",
        "outageNature": "故障停电",
        "isKeyUser": true,
        "isSensitiveUser": false
      }
    ]
  }
}
```

---

## 前端对接流程

1. 页面加载 → `POST /api/county/list` → 填充区县下拉框
2. 页面加载 → `POST /api/county/stats`（不传 countyId）→ 显示各区县人数概览
3. 用户切换区县 → `POST /api/county/stats`（传 countyId）→ 显示该区县详细统计
4. 用户点击进入二级模块 → `POST /api/county/detail-stats`（传 beginTime/endTime/countyId）→ 填充环形图数据
5. 二级模块加载用户列表 → `POST /api/county/user-list`（传 beginTime/endTime/countyId）→ 默认展示用户列表
6. 用户搜索/筛选 → `POST /api/county/user-list`（追加 keyword/userLevel 参数）→ 刷新列表
