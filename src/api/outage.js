import { getJson, postJson } from './http'

const rawApiBase =
  import.meta.env.VITE_OUTAGE_API_BASE || '/realMeasCenter/dsOutageAnalysis/outageEvent'
const API_BASE = rawApiBase.replace('/proxy/3/', '/').replace('/proxy/', '/')

const OUTAGE_LIST_TIMEOUT = 30000
const OUTAGE_USER_DETAIL_TIMEOUT = 45000
const DEFAULT_STATS_TIMEOUT = 20000

const COUNTY_LIST_API = import.meta.env.VITE_COUNTY_LIST_API || '/api/county/list'
const COUNTY_STATS_API = import.meta.env.VITE_COUNTY_STATS_API || '/api/county/stats'
const COUNTY_DETAIL_STATS_API = import.meta.env.VITE_COUNTY_DETAIL_STATS_API || '/api/county/detail-stats'
const COUNTY_USER_LIST_API = import.meta.env.VITE_COUNTY_USER_LIST_API || '/api/county/user-list'

const TIME_TREND_SERIES_API = import.meta.env.VITE_TIME_TREND_SERIES_API || '/api/time-trend/series'
const TIME_TREND_USER_LIST_API = import.meta.env.VITE_TIME_TREND_USER_LIST_API || '/api/time-trend/user-list'
const TIME_TREND_USER_DETAIL_API = import.meta.env.VITE_TIME_TREND_USER_DETAIL_API || '/api/time-trend/user-detail'

const SPATIAL_EQUIPMENT_LIST_API = import.meta.env.VITE_SPATIAL_EQUIPMENT_LIST_API || '/api/spatial/equipment-list'
const SPATIAL_EQUIPMENT_DETAIL_API = import.meta.env.VITE_SPATIAL_EQUIPMENT_DETAIL_API || '/api/spatial/equipment-detail'

const FAULT_SUMMARY_API = import.meta.env.VITE_FAULT_SUMMARY_API || '/api/fault/summary'
const FAULT_EQUIPMENT_LIST_API = import.meta.env.VITE_FAULT_EQUIPMENT_LIST_API || '/api/fault/equipment-list'

const OUTAGE_SCOPE_SUMMARY_API = import.meta.env.VITE_OUTAGE_SCOPE_SUMMARY_API || '/api/outage-scope/summary'
const OUTAGE_SCOPE_EVENT_LIST_API = import.meta.env.VITE_OUTAGE_SCOPE_EVENT_LIST_API || '/api/outage-scope/event-list'

export const queryOutageIndex = (params) => postJson(`${API_BASE}/queryOutageIndex`, params)

export const queryOutageList = (params) =>
  postJson(`${API_BASE}/queryOutageList`, params, {
    timeout: OUTAGE_LIST_TIMEOUT,
  })

export const queryOutageUserDetail = (params) =>
  postJson(`${API_BASE}/queryOutageUserDetail`, params, {
    timeout: OUTAGE_USER_DETAIL_TIMEOUT,
  })

export const queryOutageDetailRuleStatistic = (params) =>
  postJson(`${API_BASE}/queryOutageDetailRuleStatistic`, params)

export const queryCountyList = (params = {}) =>
  postJson(COUNTY_LIST_API, params, {
    timeout: DEFAULT_STATS_TIMEOUT,
  })

export const queryCountyStats = (params) =>
  postJson(COUNTY_STATS_API, params, {
    timeout: DEFAULT_STATS_TIMEOUT,
  })

export const queryCountyDetailStats = (params) =>
  postJson(COUNTY_DETAIL_STATS_API, params, {
    timeout: DEFAULT_STATS_TIMEOUT,
  })

export const queryCountyUserList = (params) =>
  postJson(COUNTY_USER_LIST_API, params, {
    timeout: DEFAULT_STATS_TIMEOUT,
  })

export const queryTimeTrendSeries = (params) =>
  postJson(TIME_TREND_SERIES_API, params, {
    timeout: DEFAULT_STATS_TIMEOUT,
  })

export const queryTimeTrendUserList = (params) =>
  postJson(TIME_TREND_USER_LIST_API, params, {
    timeout: OUTAGE_USER_DETAIL_TIMEOUT,
  })

export const queryTimeTrendUserDetail = (params) =>
  getJson(TIME_TREND_USER_DETAIL_API, params, {
    timeout: DEFAULT_STATS_TIMEOUT,
  })

export const querySpatialEquipmentList = (params) =>
  postJson(SPATIAL_EQUIPMENT_LIST_API, params, {
    timeout: DEFAULT_STATS_TIMEOUT,
  })

export const querySpatialEquipmentDetail = (params) =>
  getJson(SPATIAL_EQUIPMENT_DETAIL_API, params, {
    timeout: DEFAULT_STATS_TIMEOUT,
  })

export const queryFaultSummary = (params) =>
  postJson(FAULT_SUMMARY_API, params, {
    timeout: DEFAULT_STATS_TIMEOUT,
  })

export const queryFaultEquipmentList = (params) =>
  postJson(FAULT_EQUIPMENT_LIST_API, params, {
    timeout: DEFAULT_STATS_TIMEOUT,
  })

export const queryOutageScopeSummary = (params) =>
  postJson(OUTAGE_SCOPE_SUMMARY_API, params, {
    timeout: DEFAULT_STATS_TIMEOUT,
  })

export const queryOutageScopeEventList = (params) =>
  postJson(OUTAGE_SCOPE_EVENT_LIST_API, params, {
    timeout: OUTAGE_LIST_TIMEOUT,
  })
