<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  queryCountyTrend,
  queryCountyOutageFreq,
  queryCountyDetailStats,
  queryCountyEquipmentList,
  queryCountyEquipmentPage,
  queryCountyEquipmentStats,
  queryCountyList,
  queryCountyStats,
  queryCountyUserDetail,
  queryCountyUserList,
  queryRightPanelCountyWarnings,
  queryRightPanelFaultLocation,
  queryRightPanelOutageChains,
  queryRightPanelOutageEventDetail,
  queryRightPanelOutageEvents,
  queryRightPanelOutageEventsSummary,
  queryRightPanelOutageScope,
} from './api/outage'
import UserTagModuleCard from './components/UserTagModuleCard.vue'
import KeyUserTimeTrendCard from './components/KeyUserTimeTrendCard.vue'
import KeyUserCountBarCard from './components/KeyUserCountBarCard.vue'
import FaultLocationModuleCard from './components/FaultLocationModuleCard.vue'
import OutageRangeAssessmentCard from './components/OutageRangeAssessmentCard.vue'
import CountyWarningLightsCard from './components/CountyWarningLightsCard.vue'

const tangshanCenter = [118.180194, 39.630867]

const countyCenterMap = {
  路南区: [118.169, 39.619],
  路北区: [118.202, 39.652],
  古冶区: [118.462, 39.721],
  开平区: [118.264, 39.671],
  丰南区: [118.101, 39.558],
  丰润区: [118.13, 39.824],
  曹妃甸区: [118.451, 39.271],
  高新区: [118.243, 39.682],
  迁西县: [118.305, 40.142],
  滦南县: [118.682, 39.503],
  乐亭县: [118.905, 39.425],
  玉田县: [117.739, 39.9],
  遵化市: [117.965, 40.188],
  迁安市: [118.698, 40.013],
  滦州市: [118.699, 39.744],
}

const amapKey = import.meta.env.VITE_AMAP_KEY || '18757937d56dd908ebb8493c2cbfdc59'
const amapSecurityJsCode = import.meta.env.VITE_AMAP_SECURITY_CODE || '822cf0516f173ce886ab3d24e1c2d459'
const keyUserCountyMarkersMessageType = 'KEY_USER_COUNTY_MARKERS'
const keyUserCountyMarkersClearMessageType = 'KEY_USER_COUNTY_MARKERS_CLEAR'
const keyUserMapReadyMessageType = 'KEY_USER_MAP_READY'
const mapCountyFocusMessageType = 'MAP_COUNTY_FOCUS'
const mapOutageFeederLocateMessageType = 'MAP_OUTAGE_FEEDER_LOCATE'
const tagAndKeyUserTargetCityName = '国网唐山供电公司'
const defaultTangshanCityId = '1100F3DE22316FADE050007F01006CBE'
const countyListCityId = import.meta.env.VITE_TANGSHAN_CITY_ID || defaultTangshanCityId

const mapRef = ref(null)
const mapFrameRef = ref(null)
let mapInstance = null
let amapSdk = null
let eventMarkers = []
let keyUserCountyMarkers = []
let districtOverlays = []
let infoWindow = null

const isLeftCollapsed = ref(false)
const isRightCollapsed = ref(false)
const activePageTab = ref('outageUsers')
const loading = ref(false)
const dataError = ref('')
const dataNotice = ref('')
const mapError = ref('')

const outageIndexRecords = ref([])
const outageEvents = ref([])
const outageUsers = ref([])
const tagStatsOverview = ref(null)
const countyStatsRows = ref([])
const countyList = ref([])
const faultSummaryData = ref(null)
const outageScopeSummaryData = ref(null)
const countyWarningLightsData = ref([])
const countyTrendData = ref({
  labels: [],
  sensitiveSeries: [],
  importantSeries: [],
})
const countyOutageFreqData = ref({
  keyUsers: {
    total: 0,
    distribution: [],
  },
  sensitiveUsers: {
    total: 0,
    distribution: [],
  },
})
const countyEquipmentStatsSummary = ref(null)
const countyEquipmentListRows = ref([])
const countyEquipmentPageRows = ref([])
const countyEquipmentPageTotal = ref(0)
const spaceDistributionDetailVisible = ref(false)
const spaceDistributionDetailLoadingCount = ref(0)
const spaceDistributionDetailLoading = computed(() => spaceDistributionDetailLoadingCount.value > 0)

const selectedRegion = ref('全部')
const selectedEventId = ref('')
const activeMapEvent = ref(null)
const showOutageRangeAssessmentPage = ref(false)
const outageRangeChainsData = ref([])
const outageRangeChainsTotal = ref(0)
const outageRangeChainsCurrentPage = ref(1)
const outageRangeChainsLoading = ref(false)
const showOutageDetailPage = ref(false)
const outageDetailModalVisible = ref(false)
const selectedOutageDetail = ref(null)
const outageEventsSummaryData = ref(null)
const outageDetailRows = ref([])
const outageDetailTotal = ref(0)
const outageDetailLoading = ref(false)
const outageDetailCurrentPage = ref(1)
const outageDetailSearchInput = ref('')
const outageDetailSearchKeyword = ref('')
const outageDetailSelectedNature = ref('')
const outageDetailGridBodyRef = ref(null)
const outageDetailPaginationRef = ref(null)
const outageDetailPageJumpRef = ref(null)
const outageDetailJumpPageInput = ref('')
const outageDetailRowsPerPage = ref(10)
const OUTAGE_DETAIL_MIN_PAGE_SIZE = 10
const OUTAGE_DETAIL_MAX_PAGE_SIZE = 10
const OUTAGE_DETAIL_FALLBACK_HEAD_HEIGHT = 34
const OUTAGE_DETAIL_FALLBACK_ROW_HEIGHT = 38
const OUTAGE_DETAIL_PAGE_SIZE_BUFFER = 0
const OUTAGE_DETAIL_MAX_PAGE_BUTTONS = 9
let outageDetailLayoutObserver = null
let outageDetailListRequestId = 0
let outageEventsSummaryRequestId = 0
let outageRangeChainsRequestId = 0
let outageEventDetailRequestId = 0
let suppressOutageDetailAutoReload = false
const showUserDetailPage = ref(false)
const userDetailModalVisible = ref(false)
const selectedUserDetail = ref(null)
const userDetailCurrentPage = ref(1)
const userDetailSearchInput = ref('')
const userDetailSearchKeyword = ref('')
const userDetailSelectedType = ref('')
const userDetailGridBodyRef = ref(null)
const userDetailPaginationRef = ref(null)
const userDetailPageJumpRef = ref(null)
const userDetailJumpPageInput = ref('')
const userDetailRowsPerPage = ref(1)
const userDetailMaxPageButtons = ref(9)
const USER_DETAIL_MIN_PAGE_SIZE = 1
const USER_DETAIL_MAX_PAGE_SIZE = 30
const USER_DETAIL_FALLBACK_HEAD_HEIGHT = 34
const USER_DETAIL_FALLBACK_ROW_HEIGHT = 38
const USER_DETAIL_MAX_PAGE_BUTTONS = 9
const USER_DETAIL_MIN_PAGE_BUTTONS = 3
const USER_DETAIL_PAGE_BUTTON_MIN_WIDTH = 38
const USER_DETAIL_PAGE_BUTTON_GAP = 6
let userDetailLayoutObserver = null
const showKeyUserDetailPage = ref(false)
const keyUserDetailModalVisible = ref(false)
const selectedKeyUserDetail = ref(null)
const selectedKeyUserCounty = ref('')
const keyUserDetailCurrentPage = ref(1)
const keyUserDetailSearchInput = ref('')
const keyUserDetailSearchKeyword = ref('')
const keyUserDetailSelectedFilterCategory = ref('level')
const keyUserDetailSelectedFilterValue = ref('key')
const keyUserDetailJumpPageInput = ref('')
const keyUserDetailStatsData = ref({
  summary: null,
  keyUserByTrade: [],
  sensitiveUserByTrade: [],
  outageNatureDistribution: [],
})
const keyUserDetailLoading = ref(false)
const keyUserDetailRows = ref([])
const keyUserDetailTotal = ref(0)
let keyUserDetailListRequestId = 0
let keyUserDetailModalRequestId = 0
const KEY_USER_DETAIL_ROWS_PER_PAGE = 9
const KEY_USER_DETAIL_MAX_PAGE_BUTTONS = 9
const countyUserListSnapshotDate = String(import.meta.env.VITE_COUNTY_USER_LIST_SNAPSHOT_DATE || '').trim()
const countyUserListSnapshotStartDate = String(import.meta.env.VITE_COUNTY_USER_LIST_SNAPSHOT_START_DATE || '').trim()
const countyUserListSnapshotEndDate = String(import.meta.env.VITE_COUNTY_USER_LIST_SNAPSHOT_END_DATE || '').trim()
const countyUserListOutageCount = String(import.meta.env.VITE_COUNTY_USER_LIST_OUTAGE_COUNT || '').trim()
const setOutageDetailGridBodyRef = (el) => {
  outageDetailGridBodyRef.value = el
}
const setOutageDetailPaginationRef = (el) => {
  outageDetailPaginationRef.value = el
}
const setOutageDetailPageJumpRef = (el) => {
  outageDetailPageJumpRef.value = el
}
const setUserDetailGridBodyRef = (el) => {
  userDetailGridBodyRef.value = el
}
const setUserDetailPaginationRef = (el) => {
  userDetailPaginationRef.value = el
}
const setUserDetailPageJumpRef = (el) => {
  userDetailPageJumpRef.value = el
}
const toDateTimeLocal = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const nowForFilter = new Date()
const startForFilter = new Date(nowForFilter.getTime() - 30 * 60 * 1000)
const queryStartTime = ref(toDateTimeLocal(startForFilter))
const queryEndTime = ref(toDateTimeLocal(nowForFilter))

const toBackendDateTime = (value) => {
  if (!value) {
    return ''
  }

  const normalized = value.trim().replace('T', ' ')
  return normalized.length === 16 ? `${normalized}:00` : normalized
}

const safeNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    if (value.startsWith('{') && value.endsWith('}')) {
      return value
        .slice(1, -1)
        .split(',')
        .map((item) => Number(item.trim()) || 0)
        .reduce((sum, item) => sum + item, 0)
    }

    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const toBooleanFlag = (value) => {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number') {
    return value === 1
  }
  const normalized = String(value || '').trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'y'
}

const countyUserListLevels = new Set(['all', 'key', 'sensitive', 'key_sensitive'])
const countyUserListOutageCounts = new Set(['1', '2', '3+'])

const normalizeCountyName = (countyName = '') => String(countyName || '').replace('供电公司', '').trim()
const toCountyDisplayName = (countyName = '') => String(countyName || '').trim()

const mapCountyList = (response) => {
  const data = response?.data || {}
  const rawList = Array.isArray(data?.list) ? data.list : []
  const dedup = new Map()
  rawList.forEach((item) => {
    const countyId = String(item?.countyId || '').trim()
    const countyName = toCountyDisplayName(item?.countyName || '')
    if (!countyName) {
      return
    }
    const key = countyId || normalizeCountyName(countyName)
    if (!key || dedup.has(key)) {
      return
    }
    dedup.set(key, { countyId, countyName })
  })
  return Array.from(dedup.values())
}

const loadCountyList = async () => {
  try {
    const payload = countyListCityId ? { cityId: countyListCityId } : {}
    const response = await queryCountyList(payload)
    countyList.value = mapCountyList(response)
    return countyList.value
  } catch (error) {
    console.error(error)
    countyList.value = []
    return []
  }
}

const getCountyIdByRegionName = (regionName) => {
  if (regionName === '全部') {
    return ''
  }

  const normalizedName = normalizeCountyName(regionName)
  const matched = countyList.value.find((item) => normalizeCountyName(item.countyName) === normalizedName)
  return matched?.countyId || ''
}

const appendCountyOrCityScope = (payload) => {
  const scopedPayload = payload || {}
  const countyId = getCountyIdByRegionName(selectedRegion.value)
  if (countyId) {
    scopedPayload.countyId = countyId
  } else if (countyListCityId) {
    scopedPayload.cityId = countyListCityId
  }
  return scopedPayload
}

const getEventId = (event) =>
  event?.id ||
  event?.eventId ||
  event?.event_id ||
  event?.outageId ||
  event?.outage_id ||
  extractOutageNumberParam(event) ||
  ''

const OUTAGE_NUMBER_FIELD_KEYS = ['outageNumber', 'outage_number', 'outageNo', 'outage_no', 'eventNo', 'event_no']

const toOutageNumberParam = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const text = String(value ?? '').trim()
  return text === '' ? '' : text
}

const extractOutageNumberParam = (record) => {
  const eventRecord = normalizeUserRecord(record)
  return toOutageNumberParam(readFieldValue(eventRecord, OUTAGE_NUMBER_FIELD_KEYS))
}

const hashText = (text) => {
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const getCountyCenter = (countyName) => {
  const normalized = normalizeCountyName(countyName)
  const fixed = countyCenterMap[normalized]
  if (fixed) {
    return fixed
  }

  const hash = hashText(normalized || '唐山')
  const lngOffset = ((hash % 100) - 50) / 400
  const latOffset = (((Math.floor(hash / 100) % 100) - 50) / 400)
  return [tangshanCenter[0] + lngOffset, tangshanCenter[1] + latOffset]
}

const postMessageToMapFrame = (message) => {
  const targetWindow = mapFrameRef.value?.contentWindow
  if (!targetWindow) {
    return
  }
  targetWindow.postMessage(message, window.location.origin)
}

const buildKeyUserCountyMarkerPayload = () =>
  keyUserCountyStats.value.map((countyStat) => ({
    countyName: countyStat.countyName,
    keyUserCount: safeNumber(countyStat.keyUserCount),
    ratioText: countyStat.ratioText,
    lngLat: getCountyCenter(countyStat.countyName),
    active: countyStat.countyName === selectedKeyUserCounty.value,
  }))

const syncKeyUserCountyMarkersToMapFrame = () => {
  if (!showKeyUserDetailPage.value) {
    postMessageToMapFrame({ type: keyUserCountyMarkersClearMessageType })
    return
  }

  postMessageToMapFrame({
    type: keyUserCountyMarkersMessageType,
    payload: buildKeyUserCountyMarkerPayload(),
  })
}

const syncCountyFocusToMapFrame = () => {
  if (selectedRegion.value === '全部') {
    postMessageToMapFrame({
      type: mapCountyFocusMessageType,
      payload: null,
    })
    return
  }

  postMessageToMapFrame({
    type: mapCountyFocusMessageType,
    payload: {
      countyName: selectedRegion.value,
      lngLat: getCountyCenter(selectedRegion.value),
    },
  })
}

const handleMapFrameLoad = () => {
  syncKeyUserCountyMarkersToMapFrame()
  syncCountyFocusToMapFrame()
}

const handleMapFrameMessage = (event) => {
  if (event.origin !== window.location.origin) {
    return
  }

  if (event?.data?.type === keyUserMapReadyMessageType) {
    syncKeyUserCountyMarkersToMapFrame()
    syncCountyFocusToMapFrame()
  }
}

const locateOutageFeederOnMapFrame = (item) => {
  const feederId = String(
    readFieldValue(item, ['rdtFeederId', 'rdt_feeder_id', 'feederId', 'feeder_id']) || '',
  ).trim()
  if (!feederId) {
    return
  }

  const feederName = String(
    readFieldValue(item, ['rdtFeederName', 'rdt_feeder_name', 'feederName', 'feeder_name']) || '',
  ).trim()
  const feederDevType = String(
    readFieldValue(item, ['rdtFeederDevType', 'rdt_feeder_dev_type', 'rdtFeederType', 'rdt_feeder_type', 'devType', 'dev_type']) || '',
  ).trim()

  postMessageToMapFrame({
    type: mapOutageFeederLocateMessageType,
    payload: {
      rdtFeederId: feederId,
      rdtFeederName: feederName,
      devType: feederDevType || '',
    },
  })
}

const OUTAGE_LIST_PAGE_SIZE = 300
const OUTAGE_LIST_MAX_PAGES = 60
const OUTAGE_USER_PAGE_SIZE = 500
const OUTAGE_USER_MAX_PAGES = 24
const OUTAGE_USER_BATCH_SIZE = 20
const OUTAGE_USER_MAX_RECORDS = 12000
const OUTAGE_SINGLE_EVENT_MAX = 400
const OUTAGE_SINGLE_EVENT_PAGE_LIMIT = 3
const OUTAGE_TIME_WINDOW_MONTHS = 1
const OUTAGE_TIME_WINDOW_MAX = 36
const OUTAGE_DETAIL_DEFAULT_PAGE = 1
const OUTAGE_DETAIL_DEFAULT_PER_PAGE = 10
const OUTAGE_DETAIL_REMOTE_MAX_PER_PAGE = 500
const OUTAGE_CHAINS_REMOTE_PAGE_SIZE = 4

const chunkArray = (list, size) => {
  if (!Array.isArray(list) || list.length === 0 || size <= 0) {
    return []
  }

  const chunks = []
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size))
  }
  return chunks
}

const buildUserRecordKey = (item) => {
  if (item?.id) {
    return String(item.id)
  }
  return [
    item?.outageNumber || '',
    item?.consNo || item?.userId || item?.meansNo || '',
    item?.beginTime || '',
  ].join('|')
}
const parseBackendDateTime = (value) => {
  if (!value) {
    return null
  }
  const text = String(value).trim()
  if (!text) {
    return null
  }

  const normalized = text
    .replaceAll('/', '-')
    .replace('T', ' ')
  const completed = normalized.length === 16 ? `${normalized}:00` : normalized
  const match = completed.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (match) {
    const [, year, month, day, hour, minute, second = '0'] = match
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    )
    return Number.isNaN(date.getTime()) ? null : date
  }

  const fallback = new Date(text.replace(' ', 'T'))
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

const formatBackendDateTime = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const buildTimeWindows = (beginTime, endTime) => {
  const start = parseBackendDateTime(beginTime)
  const end = parseBackendDateTime(endTime)
  if (!start || !end || start > end) {
    return []
  }

  const windows = []
  let cursor = new Date(start)

  while (cursor <= end && windows.length < OUTAGE_TIME_WINDOW_MAX) {
    const windowStart = new Date(cursor)
    const windowEnd = new Date(cursor)
    windowEnd.setMonth(windowEnd.getMonth() + OUTAGE_TIME_WINDOW_MONTHS)
    windowEnd.setSeconds(windowEnd.getSeconds() - 1)

    const finalEnd = windowEnd < end ? windowEnd : new Date(end)
    windows.push({
      start: windowStart,
      end: finalEnd,
      beginTime: formatBackendDateTime(windowStart),
      endTime: formatBackendDateTime(finalEnd),
    })

    cursor = new Date(finalEnd)
    cursor.setSeconds(cursor.getSeconds() + 1)
  }

  return windows
}

const queryOutageUsersByTimeWindows = async ({ beginTime, endTime, outageEvents = [] }) => {
  const recordMap = new Map()
  const windows = buildTimeWindows(beginTime, endTime)

  for (const window of windows) {
    const outageNumbers = outageEvents
      .filter((item) => {
        const eventBegin = parseBackendDateTime(item?.beginTime)
        if (!eventBegin) {
          return false
        }
        return eventBegin >= window.start && eventBegin <= window.end
      })
      .map((item) => extractOutageNumberParam(item))
      .filter((item) => item !== '')

    if (outageNumbers.length === 0) {
      continue
    }

    const records = await queryOutageUsersByPages({
      beginTime: window.beginTime,
      endTime: window.endTime,
      outageNumbers,
    })

    records.forEach((item) => {
      const key = buildUserRecordKey(item)
      if (!recordMap.has(key)) {
        recordMap.set(key, item)
      }
    })

    if (recordMap.size >= OUTAGE_USER_MAX_RECORDS) {
      break
    }
  }

  return Array.from(recordMap.values())
}

const queryOutageEventsByPages = async () => []

const queryOutageUsersByPages = async () => []

const buildTagStatsOverviewPayload = ({ beginTime, endTime }) => {
  return appendCountyOrCityScope({
    beginTime,
    endTime,
  })
}

const hasCountyStatsField = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  return [
    'totalUsers',
    'keyUsers',
    'sensitiveUsers',
    'normalUsers',
  ].some((key) => value[key] !== undefined && value[key] !== null && String(value[key]).trim() !== '')
}

const toCountyStatsRow = (value, fallbackName = '未知区县') => {
  const countyName = toCountyDisplayName(value?.countyName || value?.name || fallbackName) || fallbackName
  const importantCount = Math.max(safeNumber(value?.keyUsers), 0)
  const sensitiveCount = Math.max(safeNumber(value?.sensitiveUsers), 0)

  return {
    name: countyName,
    importantCount,
    sensitiveCount,
  }
}

const mapCountyStatsRows = (response) => {
  const data = response?.data || response?.result || response
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return []
  }

  const tangshanCountyIdSet = new Set(
    countyList.value
      .map((item) => String(item?.countyId || '').trim())
      .filter((item) => item !== ''),
  )
  const tangshanCountyNameSet = new Set(
    countyList.value
      .map((item) => normalizeCountyName(item?.countyName || ''))
      .filter((item) => item !== ''),
  )

  const resolveStatsCountyId = (item) => String(item?.countyId || item?.id || '').trim()
  const resolveStatsCountyName = (item) => normalizeCountyName(
    toCountyDisplayName(item?.countyName || item?.name || ''),
  )

  const isTangshanCountyStatsItem = (item) => {
    if (tangshanCountyIdSet.size === 0 && tangshanCountyNameSet.size === 0) {
      return true
    }

    const countyId = resolveStatsCountyId(item)
    if (countyId && tangshanCountyIdSet.has(countyId)) {
      return true
    }

    const countyName = resolveStatsCountyName(item)
    if (countyName && tangshanCountyNameSet.has(countyName)) {
      return true
    }

    return false
  }

  if (Array.isArray(data.list)) {
    const mappedRows = data.list
      .filter((item) => hasCountyStatsField(item) && isTangshanCountyStatsItem(item))
      .map((item) => toCountyStatsRow(item))
      .sort((a, b) => {
        const aTotal = a.importantCount + a.sensitiveCount
        const bTotal = b.importantCount + b.sensitiveCount
        if (aTotal !== bTotal) {
          return bTotal - aTotal
        }
        if (a.importantCount !== b.importantCount) {
          return b.importantCount - a.importantCount
        }
        return a.name.localeCompare(b.name, 'zh-Hans-CN')
      })

    if (mappedRows.length > 0) {
      return mappedRows
    }
  }

  const summaryData =
    data?.summary && typeof data.summary === 'object' && !Array.isArray(data.summary)
      ? data.summary
      : data

  if (!hasCountyStatsField(summaryData)) {
    return []
  }

  const selectedName = selectedRegion.value === '全部' ? '当前区县' : selectedRegion.value
  return [toCountyStatsRow({ ...summaryData, countyName: selectedName }, selectedName)]
}

const mapTagStatsOverview = (response) => {
  const data = response?.data || response?.result || response
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null
  }

  const statsData =
    data?.summary && typeof data.summary === 'object' && !Array.isArray(data.summary)
      ? data.summary
      : data

  const hasAnyField = [
    'totalUsers',
    'keyUsers',
    'sensitiveUsers',
    'normalUsers',
  ].some((key) => statsData[key] !== undefined && statsData[key] !== null && String(statsData[key]).trim() !== '')

  if (!hasAnyField) {
    return null
  }

  const totalUsers = Math.max(safeNumber(statsData.totalUsers), 0)
  const keyUsers = Math.max(safeNumber(statsData.keyUsers), 0)
  const sensitiveUsers = Math.max(safeNumber(statsData.sensitiveUsers), 0)
  const normalRaw = statsData.normalUsers
  const normalUsers = normalRaw !== undefined && normalRaw !== null
    ? Math.max(safeNumber(normalRaw), 0)
    : Math.max(totalUsers - keyUsers - sensitiveUsers, 0)

  return {
    totalUsers,
    keyUsers,
    sensitiveUsers,
    normalUsers,
  }
}

const loadTagStatsOverview = async ({ beginTime, endTime }) => {
  if (!beginTime || !endTime) {
    tagStatsOverview.value = null
    countyStatsRows.value = []
    return null
  }

  try {
    const payload = buildTagStatsOverviewPayload({ beginTime, endTime })
    const response = await queryCountyStats(payload)
    const mapped = mapTagStatsOverview(response)
    tagStatsOverview.value = mapped
    countyStatsRows.value = mapCountyStatsRows(response)
    return mapped
  } catch {
    tagStatsOverview.value = null
    countyStatsRows.value = []
    return null
  }
}

const USER_TIME_TREND_POINT_COUNT = 6

const formatTrendDateLabel = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '----/--/--'
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

const formatTrendTimeLabel = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '--:--'
  }
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}

const buildTrendDateSegments = (beginTime, endTime) => {
  const startDate = parseBackendDateTime(beginTime)
  const endDate = parseBackendDateTime(endTime)
  if (!startDate || !endDate || startDate.getTime() >= endDate.getTime()) {
    return Array.from({ length: USER_TIME_TREND_POINT_COUNT }, () => '----/--/--')
  }

  const totalSpan = endDate.getTime() - startDate.getTime()
  const step = totalSpan / (USER_TIME_TREND_POINT_COUNT - 1)

  return Array.from({ length: USER_TIME_TREND_POINT_COUNT }, (_, index) => {
    const pointTime = new Date(startDate.getTime() + step * index)
    return formatTrendDateLabel(pointTime)
  })
}

const buildTrendTimeSegments = (beginTime, endTime) => {
  const startDate = parseBackendDateTime(beginTime)
  const endDate = parseBackendDateTime(endTime)
  if (!startDate || !endDate || startDate.getTime() >= endDate.getTime()) {
    return Array.from({ length: USER_TIME_TREND_POINT_COUNT }, () => '--:--')
  }

  const totalSpan = endDate.getTime() - startDate.getTime()
  const step = totalSpan / (USER_TIME_TREND_POINT_COUNT - 1)

  return Array.from({ length: USER_TIME_TREND_POINT_COUNT }, (_, index) => {
    const pointTime = new Date(startDate.getTime() + step * index)
    return formatTrendTimeLabel(pointTime)
  })
}

const buildDefaultCountyTrendData = (beginTime, endTime) => ({
  labels: buildTrendDateSegments(beginTime, endTime),
  timeLabels: buildTrendTimeSegments(beginTime, endTime),
  sensitiveSeries: Array.from({ length: USER_TIME_TREND_POINT_COUNT }, () => 0),
  importantSeries: Array.from({ length: USER_TIME_TREND_POINT_COUNT }, () => 0),
})

const buildDefaultCountyOutageFreqData = () => ({
  keyUsers: {
    total: 0,
    distribution: [
      { label: '停电1次', count: 0, percentage: 0 },
      { label: '停电2次', count: 0, percentage: 0 },
      { label: '停电3次及以上', count: 0, percentage: 0 },
    ],
  },
  sensitiveUsers: {
    total: 0,
    distribution: [
      { label: '停电1次', count: 0, percentage: 0 },
      { label: '停电2次', count: 0, percentage: 0 },
      { label: '停电3次及以上', count: 0, percentage: 0 },
    ],
  },
})

const mapCountyOutageFreqGroup = (group, fallbackLabels = []) => {
  const safeTotal = Math.max(safeNumber(group?.total), 0)
  const list = Array.isArray(group?.distribution) ? group.distribution : []
  const fallback = fallbackLabels.length > 0
    ? fallbackLabels
    : ['停电1次', '停电2次', '停电3次及以上']
  const normalized = fallback.map((label, index) => {
    const item = list[index] || {}
    const count = Math.max(safeNumber(item?.count), 0)
    const percentage = item?.percentage === undefined || item?.percentage === null
      ? (safeTotal > 0 ? Number(((count / safeTotal) * 100).toFixed(1)) : 0)
      : Math.max(safeNumber(item?.percentage), 0)
    return {
      label: String(item?.label || label || '').trim() || label,
      count,
      percentage: Number(percentage.toFixed(1)),
    }
  })

  return {
    total: safeTotal,
    distribution: normalized,
  }
}

const mapCountyOutageFreqData = (response) => {
  const data = response?.data || {}
  const defaults = buildDefaultCountyOutageFreqData()
  return {
    keyUsers: mapCountyOutageFreqGroup(data?.keyUsers, defaults.keyUsers.distribution.map((item) => item.label)),
    sensitiveUsers: mapCountyOutageFreqGroup(
      data?.sensitiveUsers,
      defaults.sensitiveUsers.distribution.map((item) => item.label),
    ),
  }
}

const mapCountyTrendData = (response, beginTime, endTime) => {
  const data = response?.data
  const points =
    Array.isArray(data?.points)
      ? data.points
      : (Array.isArray(data?.list) ? data.list : (Array.isArray(data) ? data : []))
  if (points.length === 0) {
    return buildDefaultCountyTrendData(beginTime, endTime)
  }

  return {
    labels: points.map((item) => {
      const timePoint = readFieldValue(item, ['timePoint', 'time', 'date', 'x'])
      return formatTrendDateLabel(parseBackendDateTime(timePoint))
    }),
    timeLabels: points.map((item) => {
      const timePoint = readFieldValue(item, ['timePoint', 'time', 'date', 'x'])
      return formatTrendTimeLabel(parseBackendDateTime(timePoint))
    }),
    sensitiveSeries: points.map((item) => {
      const count = readFieldValue(item, ['sensitiveUsers', 'sensitiveUserCount', 'sensitiveCount'])
      return Math.max(safeNumber(count), 0)
    }),
    importantSeries: points.map((item) => {
      const count = readFieldValue(item, ['keyUsers', 'importantUsers', 'keyUserCount', 'importantCount'])
      return Math.max(safeNumber(count), 0)
    }),
  }
}

const loadCountyTrendData = async ({ beginTime, endTime }) => {
  if (!beginTime || !endTime) {
    countyTrendData.value = buildDefaultCountyTrendData(beginTime, endTime)
    return countyTrendData.value
  }

  countyTrendData.value = buildDefaultCountyTrendData(beginTime, endTime)

  const payload = {
    beginTime,
    endTime,
  }
  appendCountyOrCityScope(payload)

  try {
    const response = await queryCountyTrend(payload)
    countyTrendData.value = mapCountyTrendData(response, beginTime, endTime)
  } catch {
    countyTrendData.value = buildDefaultCountyTrendData(beginTime, endTime)
  }

  return countyTrendData.value
}

const loadCountyOutageFreqData = async ({ beginTime, endTime }) => {
  if (!beginTime || !endTime) {
    countyOutageFreqData.value = buildDefaultCountyOutageFreqData()
    return countyOutageFreqData.value
  }

  const payload = {
    beginTime,
    endTime,
  }
  appendCountyOrCityScope(payload)

  try {
    const response = await queryCountyOutageFreq(payload)
    countyOutageFreqData.value = mapCountyOutageFreqData(response)
  } catch {
    countyOutageFreqData.value = buildDefaultCountyOutageFreqData()
  }

  return countyOutageFreqData.value
}

const mapCountyEquipmentStatsSummary = (response) => {
  const data = response?.data || {}
  return {
    affectedDeviceCount: Math.max(safeNumber(data?.equipmentCount), 0),
    sensitiveUserTotal: Math.max(safeNumber(data?.sensitiveUsers), 0),
    importantUserTotal: Math.max(safeNumber(data?.keyUsers), 0),
    highRiskDeviceCount: Math.max(safeNumber(data?.highImpactEquipmentCount), 0),
    highRiskRatio: Math.max(safeNumber(data?.highImpactPercentage), 0),
  }
}

const loadCountyEquipmentStatsSummary = async ({ beginTime, endTime }) => {
  if (!beginTime || !endTime) {
    countyEquipmentStatsSummary.value = null
    return null
  }

  spaceDistributionDetailLoadingCount.value += 1
  const payload = {
    beginTime,
    endTime,
  }
  appendCountyOrCityScope(payload)

  try {
    const response = await queryCountyEquipmentStats(payload)
    countyEquipmentStatsSummary.value = mapCountyEquipmentStatsSummary(response)
    return countyEquipmentStatsSummary.value
  } catch {
    countyEquipmentStatsSummary.value = null
    return null
  } finally {
    spaceDistributionDetailLoadingCount.value = Math.max(spaceDistributionDetailLoadingCount.value - 1, 0)
  }
}

const mapCountyEquipmentListRows = (response) => {
  const data = response?.data || {}
  const list = Array.isArray(data?.list) ? data.list : []

  return list
    .map((item, index) => {
      const deviceNo = String(
        item?.equipmentId || item?.equipmentNo || item?.deviceNo || item?.device_id || '',
      ).trim() || '-'
      const equipmentId = String(item?.equipmentId || item?.equipment_id || deviceNo || '').trim() || '-'
      const deviceName = String(item?.equipmentName || item?.deviceName || item?.name || '').trim() || '-'
      const importantUserCount = Math.max(safeNumber(item?.keyUsers), 0)
      const sensitiveUserCount = Math.max(safeNumber(item?.sensitiveUsers), 0)
      const outageEventCount = Math.max(safeNumber(item?.outageCount), 0)

      return {
        key: String(item?.equipmentId || item?.id || `${deviceNo}-${deviceName}-${index}`),
        equipmentId,
        deviceNo,
        deviceName,
        importantUserCount,
        sensitiveUserCount,
        outageEventCount,
        importantUserList: [],
        sensitiveUserList: [],
      }
    })
    .sort((a, b) => {
      if (a.importantUserCount !== b.importantUserCount) {
        return b.importantUserCount - a.importantUserCount
      }
      if (a.outageEventCount !== b.outageEventCount) {
        return b.outageEventCount - a.outageEventCount
      }
      if (a.sensitiveUserCount !== b.sensitiveUserCount) {
        return b.sensitiveUserCount - a.sensitiveUserCount
      }
      return String(a.deviceName || '').localeCompare(String(b.deviceName || ''), 'zh-Hans-CN')
    })
}

const loadCountyEquipmentListRows = async ({ beginTime, endTime }) => {
  if (!beginTime || !endTime) {
    countyEquipmentListRows.value = []
    return []
  }

  spaceDistributionDetailLoadingCount.value += 1
  const payload = {
    beginTime,
    endTime,
  }
  appendCountyOrCityScope(payload)

  try {
    const response = await queryCountyEquipmentList(payload)
    countyEquipmentListRows.value = mapCountyEquipmentListRows(response)
  } catch {
    countyEquipmentListRows.value = []
  } finally {
    spaceDistributionDetailLoadingCount.value = Math.max(spaceDistributionDetailLoadingCount.value - 1, 0)
  }

  return countyEquipmentListRows.value
}

const SPACE_EQUIPMENT_PAGE_NUMBER = 1
const SPACE_EQUIPMENT_PAGE_SIZE = 10

const mapCountyEquipmentPageResult = (response) => {
  const data = response?.data || {}
  const list = Array.isArray(data?.list) ? data.list : []

  return {
    total: Math.max(safeNumber(data?.total), 0),
    page: Math.max(safeNumber(data?.page), 1),
    perPage: Math.max(safeNumber(data?.perPage), SPACE_EQUIPMENT_PAGE_SIZE),
    list: list.map((item, index) => {
      const deviceNo = String(
        item?.equipmentId || item?.equipmentNo || item?.deviceNo || item?.device_id || '',
      ).trim() || '-'
      const equipmentId = String(item?.equipmentId || item?.equipment_id || deviceNo || '').trim() || '-'
      const deviceName = String(item?.equipmentName || item?.deviceName || item?.name || '').trim() || '-'
      const importantUserCount = Math.max(safeNumber(item?.keyUsers), 0)
      const sensitiveUserCount = Math.max(safeNumber(item?.sensitiveUsers), 0)

      return {
        key: String(item?.equipmentId || item?.id || `${deviceNo}-${deviceName}-${index}`),
        equipmentId,
        deviceNo,
        deviceName,
        importantUserCount,
        sensitiveUserCount,
        outageEventCount: 0,
        importantUserList: [],
        sensitiveUserList: [],
      }
    }).sort((a, b) => {
      if (a.importantUserCount !== b.importantUserCount) {
        return b.importantUserCount - a.importantUserCount
      }
      if (a.sensitiveUserCount !== b.sensitiveUserCount) {
        return b.sensitiveUserCount - a.sensitiveUserCount
      }
      return String(a.deviceName || '').localeCompare(String(b.deviceName || ''), 'zh-Hans-CN')
    }),
  }
}

const loadCountyEquipmentPageRows = async ({ beginTime, endTime, page = SPACE_EQUIPMENT_PAGE_NUMBER }) => {
  if (!beginTime || !endTime) {
    countyEquipmentPageRows.value = []
    countyEquipmentPageTotal.value = 0
    return []
  }

  spaceDistributionDetailLoadingCount.value += 1
  const payload = {
    beginTime,
    endTime,
    page,
    perPage: SPACE_EQUIPMENT_PAGE_SIZE,
  }
  appendCountyOrCityScope(payload)

  try {
    const response = await queryCountyEquipmentPage(payload)
    const result = mapCountyEquipmentPageResult(response)
    countyEquipmentPageRows.value = result.list
    countyEquipmentPageTotal.value = result.total
  } catch {
    countyEquipmentPageRows.value = []
    countyEquipmentPageTotal.value = 0
  } finally {
    spaceDistributionDetailLoadingCount.value = Math.max(spaceDistributionDetailLoadingCount.value - 1, 0)
  }

  return countyEquipmentPageRows.value
}

const buildFaultLocationPayload = ({ beginTime, endTime, dimension }) => {
  return appendCountyOrCityScope({
    beginTime,
    endTime,
    dimension,
  })
}

const buildOutageScopePayload = ({ beginTime, endTime }) => {
  return appendCountyOrCityScope({
    beginTime,
    endTime,
  })
}

const normalizeOutageNatureCode = (value) => {
  const plain = String(value || '').trim()
  const lowered = plain.toLowerCase()
  if (['planned', '01', '1'].includes(lowered) || plain.includes('计划')) {
    return 'planned'
  }
  if (['fault', '02', '2'].includes(lowered) || plain.includes('故障')) {
    return 'fault'
  }
  if (['other', '03', '3'].includes(lowered) || plain.includes('其他')) {
    return 'other'
  }
  return ''
}

const buildOutageEventsPayload = ({ beginTime, endTime, page = OUTAGE_DETAIL_DEFAULT_PAGE, perPage = OUTAGE_DETAIL_DEFAULT_PER_PAGE }) => {
  const payload = {
    beginTime,
    endTime,
    page: Math.max(OUTAGE_DETAIL_DEFAULT_PAGE, Math.round(safeNumber(page))),
    perPage: Math.max(
      OUTAGE_DETAIL_MIN_PAGE_SIZE,
      Math.min(OUTAGE_DETAIL_REMOTE_MAX_PER_PAGE, Math.round(safeNumber(perPage) || OUTAGE_DETAIL_DEFAULT_PER_PAGE)),
    ),
  }

  appendCountyOrCityScope(payload)

  const keyword = String(outageDetailSearchKeyword.value || '').trim()
  if (keyword) {
    payload.keyword = keyword
  }

  const outageNatureCode = normalizeOutageNatureCode(outageDetailSelectedNature.value)
  if (outageNatureCode) {
    payload.outageNature = outageNatureCode
  }

  return payload
}

const resolveOutageEventsResponseData = (response) => {
  const data = response?.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null
  }
  if (data.outageEvents && typeof data.outageEvents === 'object' && !Array.isArray(data.outageEvents)) {
    return data.outageEvents
  }
  return data
}

const normalizeOutageEventsSummary = (summary, fallbackTotal = 0) => {
  const data = summary && typeof summary === 'object' && !Array.isArray(summary) ? summary : {}
  const totalEvents = Math.max(safeNumber(data.totalEvents), Math.max(0, safeNumber(fallbackTotal)))
  const natureRatioList = Array.isArray(data.natureRatio) ? data.natureRatio : []
  const normalizedNatureRatio = natureRatioList.map((item) => ({
    name: String(item?.name || '').trim(),
    code: normalizeOutageNatureCode(item?.code || item?.name || item?.outageNature),
    value: Math.max(safeNumber(item?.value), 0),
    percent: Math.max(safeNumber(item?.percent), 0),
  }))

  const restoredEvents = Math.max(safeNumber(data.restoredEvents), 0)
  const unrestoredEvents = Math.max(safeNumber(data.unrestoredEvents), Math.max(totalEvents - restoredEvents, 0))
  const restoredRate = Number.isFinite(Number(data.restoredRate))
    ? Number(Number(data.restoredRate).toFixed(2))
    : totalEvents > 0
      ? Number(((restoredEvents / totalEvents) * 100).toFixed(2))
      : 0

  return {
    totalEvents,
    natureRatio: normalizedNatureRatio,
    restoredEvents,
    unrestoredEvents,
    restoredRate,
  }
}

const resolveOutageEventsSummaryResponseData = (response) => {
  const data = response?.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null
  }
  if (data.outageEventsSummary && typeof data.outageEventsSummary === 'object' && !Array.isArray(data.outageEventsSummary)) {
    return data.outageEventsSummary
  }
  return data
}

const resolveOutageEventDetailResponseData = (response) => {
  const data = response?.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null
  }
  if (data.outageEventDetail && typeof data.outageEventDetail === 'object' && !Array.isArray(data.outageEventDetail)) {
    return data.outageEventDetail
  }
  return data
}

const toDisplayText = (value, fallback = '-') => {
  const text = String(value ?? '').trim()
  return text || fallback
}

const joinNameList = (value) => {
  if (!Array.isArray(value)) {
    return ''
  }
  return value
    .map((item) => String(item ?? '').trim())
    .filter((item) => item !== '')
    .join('、')
}

const mapOutageEventDetailForModal = (detailData, fallbackItem = null) => {
  const record = normalizeUserRecord(detailData)
  const fallback = fallbackItem && typeof fallbackItem === 'object' ? fallbackItem : {}
  const outageNumber = toDisplayText(
    readFieldValue(record, ['outageNumber', 'outage_number', 'eventNo', 'event_no', 'id']) || fallback?.outageNumber,
  )
  const beginTime = toDisplayText(
    readFieldValue(record, ['beginTime', 'begin_time', 'outageBeginTime', 'outage_begin_time']) || fallback?.beginTime,
  )
  const endTimeRaw = String(
    readFieldValue(record, ['endTime', 'end_time', 'outageEndTime', 'outage_end_time', 'restoreTime', 'restore_time']) || fallback?.endTime || '',
  ).trim()
  const hasEndTime = endTimeRaw !== '' && endTimeRaw !== '-' && endTimeRaw.toLowerCase() !== 'null'
  const restored = toBooleanFlag(readFieldValue(record, ['isRestored', 'restored'])) || hasEndTime
  const feederNamesText =
    joinNameList(readFieldValue(record, ['feederNames'])) ||
    toDisplayText(
      readFieldValue(record, ['rdtFeederName', 'rdt_feeder_name', 'feederName', 'feeder_name']) || fallback?.rdtFeederName,
    )
  const equipmentNamesText =
    joinNameList(readFieldValue(record, ['equipmentNames'])) ||
    toDisplayText(
      readFieldValue(record, ['faultEquipName', 'fault_equip_name', 'equipmentName', 'equipment_name']) || fallback?.faultEquipName,
    )

  return {
    ...fallback,
    ...record,
    id: toDisplayText(readFieldValue(record, ['id']) || fallback?.id || outageNumber),
    outageNumber,
    beginTime,
    status: restored ? '已复电' : '抢修中',
    endTime: hasEndTime ? endTimeRaw : '-',
    maintGroupName: toDisplayText(readFieldValue(record, ['maintGroupName', 'maint_group_name']) || fallback?.maintGroupName),
    countyName: toDisplayText(readFieldValue(record, ['countyName', 'county_name']) || fallback?.countyName),
    affectedConsCnt: Math.max(
      safeNumber(readFieldValue(record, ['affectedUsers', 'affected_users', 'affectedConsCnt', 'affected_cons_cnt']) || fallback?.affectedConsCnt),
      0,
    ),
    rdtFeederName: feederNamesText,
    rdtSubsName: toDisplayText(
      readFieldValue(record, ['substationName', 'substation_name', 'rdtSubsName', 'rdt_subs_name']) || fallback?.rdtSubsName,
    ),
    faultEquipName: equipmentNamesText,
    outageReason: toDisplayText(readFieldValue(record, ['outageReason', 'outage_reason']) || fallback?.outageReason),
    outageNature: outageNatureText(
      readFieldValue(record, ['outageNature', 'outage_nature']) || fallback?.outageNature,
    ),
  }
}

const buildOutageEventsSummaryPayload = ({ beginTime, endTime }) => {
  const payload = {
    beginTime,
    endTime,
  }

  appendCountyOrCityScope(payload)

  const keyword = String(outageDetailSearchKeyword.value || '').trim()
  if (keyword) {
    payload.keyword = keyword
  }

  const outageNatureCode = normalizeOutageNatureCode(outageDetailSelectedNature.value)
  if (outageNatureCode) {
    payload.outageNature = outageNatureCode
  }

  return payload
}

const loadRightPanelOutageEventsSummary = async ({ beginTime, endTime } = {}) => {
  if (!showOutageDetailPage.value) {
    return null
  }

  if (!beginTime || !endTime) {
    outageEventsSummaryData.value = null
    return null
  }

  const payload = buildOutageEventsSummaryPayload({ beginTime, endTime })
  const requestId = ++outageEventsSummaryRequestId

  try {
    const response = await queryRightPanelOutageEventsSummary(payload)
    if (requestId !== outageEventsSummaryRequestId) {
      return null
    }

    const remoteData = resolveOutageEventsSummaryResponseData(response) || {}
    outageEventsSummaryData.value = normalizeOutageEventsSummary(remoteData, 0)
    return outageEventsSummaryData.value
  } catch (error) {
    if (requestId !== outageEventsSummaryRequestId) {
      return null
    }
    console.error(error)
    outageEventsSummaryData.value = null
    return null
  }
}

const mapOutageDetailRow = (item, index, page, perPage) => {
  const outageNumber = String(item?.outageNumber || item?.outage_number || item?.eventNo || '').trim() || '-'
  const countyName = normalizeCountyName(item?.countyName || item?.county_name || '-') || '-'
  const affectedConsCnt = Math.max(safeNumber(item?.affectedUsers ?? item?.affectedConsCnt ?? item?.affected_cons_cnt), 0)
  const outageNatureCode = item?.outageNature || item?.outage_nature || item?.code || ''
  const beginTime = String(item?.beginTime || item?.begin_time || '-').trim() || '-'
  const endTimeRaw = String(item?.endTime || item?.end_time || '').trim()
  const hasEndTime = endTimeRaw !== '' && endTimeRaw !== '-' && endTimeRaw.toLowerCase() !== 'null'
  const restoredByFlag = toBooleanFlag(item?.isRestored ?? item?.restored)
  const restored = restoredByFlag || hasEndTime
  const rowIndex = (Math.max(page, 1) - 1) * Math.max(perPage, 1) + index

  return {
    ...item,
    id: String(item?.id || `${outageNumber}-${rowIndex}`),
    outageNumber,
    countyName,
    affectedConsCnt,
    outageNature: outageNatureText(outageNatureCode),
    beginTime,
    status: restored ? '已复电' : '抢修中',
    endTime: hasEndTime ? endTimeRaw : '-',
    maintGroupName: String(item?.maintGroupName || item?.maint_group_name || '-').trim() || '-',
    rdtFeederId: String(item?.rdtFeederId || item?.rdt_feeder_id || item?.feederId || item?.feeder_id || '').trim(),
    rdtFeederName: String(item?.rdtFeederName || item?.rdt_feeder_name || item?.feederName || item?.feeder_name || '-').trim() || '-',
    rdtFeederDevType: String(
      item?.rdtFeederDevType || item?.rdt_feeder_dev_type || item?.rdtFeederType || item?.rdt_feeder_type || item?.devType || item?.dev_type || '',
    ).trim(),
    rdtSubsName: String(item?.rdtSubsName || item?.rdt_subs_name || item?.substationName || item?.substation_name || '-').trim() || '-',
    faultEquipName: String(item?.faultEquipName || item?.fault_equip_name || item?.equipmentName || item?.equipment_name || '-').trim() || '-',
    outageReason: String(item?.outageReason || item?.outage_reason || '-').trim() || '-',
  }
}

const loadRightPanelOutageEvents = async ({
  beginTime,
  endTime,
  page = outageDetailCurrentPage.value,
  perPage = outageDetailRowsPerPage.value,
} = {}) => {
  if (!showOutageDetailPage.value) {
    return null
  }

  if (!beginTime || !endTime) {
    outageDetailRows.value = []
    outageDetailTotal.value = 0
    outageDetailLoading.value = false
    return null
  }

  const payload = buildOutageEventsPayload({ beginTime, endTime, page, perPage })
  const requestId = ++outageDetailListRequestId
  outageDetailLoading.value = true

  try {
    const response = await queryRightPanelOutageEvents(payload)
    if (requestId !== outageDetailListRequestId) {
      return null
    }

    const remoteData = resolveOutageEventsResponseData(response) || {}
    const remoteList = Array.isArray(remoteData.list) ? remoteData.list : []
    const resolvedPage = Math.max(OUTAGE_DETAIL_DEFAULT_PAGE, Math.round(safeNumber(remoteData.page) || payload.page))
    const resolvedPerPage = payload.perPage
    const resolvedTotal = Math.max(safeNumber(remoteData.total), remoteList.length)

    outageDetailCurrentPage.value = resolvedPage
    outageDetailRowsPerPage.value = resolvedPerPage
    outageDetailTotal.value = resolvedTotal
    outageDetailRows.value = remoteList.map((item, index) => mapOutageDetailRow(item, index, resolvedPage, resolvedPerPage))

    return {
      summary: normalizeOutageEventsSummary(remoteData.summary, resolvedTotal),
      total: outageDetailTotal.value,
      page: outageDetailCurrentPage.value,
      perPage: outageDetailRowsPerPage.value,
      list: outageDetailRows.value,
    }
  } catch (error) {
    if (requestId !== outageDetailListRequestId) {
      return null
    }

    console.error(error)
    outageDetailRows.value = []
    outageDetailTotal.value = 0
    return null
  } finally {
    if (requestId === outageDetailListRequestId) {
      outageDetailLoading.value = false
    }
  }
}

const normalizeFaultLocationModeSummary = (rawModeData, modeKey, label) => {
  const data =
    rawModeData && typeof rawModeData === 'object' && !Array.isArray(rawModeData)
      ? rawModeData
      : {}
  const danger = Math.max(safeNumber(data?.danger ?? data?.red ?? data?.highImpact?.count ?? data?.highImpact), 0)
  const warning = Math.max(
    safeNumber(data?.warning ?? data?.yellow ?? data?.mediumImpact?.count ?? data?.mediumImpact),
    0,
  )
  const safe = Math.max(safeNumber(data?.safe ?? data?.green ?? data?.lowImpact?.count ?? data?.lowImpact), 0)
  const barsTotal = danger + warning + safe
  const total = Math.max(safeNumber(data?.total ?? data?.count), barsTotal)
  const matchedEvents = Math.max(safeNumber(data?.matchedEvents), 0)

  return {
    key: modeKey,
    label,
    total,
    matchedEvents,
    bars: [
      { key: 'danger', colorLabel: '红色', count: danger },
      { key: 'warning', colorLabel: '黄色', count: warning },
      { key: 'safe', colorLabel: '绿色', count: safe },
    ],
  }
}

const resolveFaultLocationResponseData = (response) => {
  const data = response?.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null
  }
  if (data.faultLocation && typeof data.faultLocation === 'object' && !Array.isArray(data.faultLocation)) {
    return data.faultLocation
  }
  return data
}

const resolveOutageScopeResponseData = (response) => {
  const data = response?.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null
  }
  if (data.outageScope && typeof data.outageScope === 'object' && !Array.isArray(data.outageScope)) {
    return data.outageScope
  }
  return data
}

const loadRightPanelFaultLocationSummary = async ({ beginTime, endTime, dimension = 'feeder' }) => {
  if (!beginTime || !endTime) {
    faultSummaryData.value = null
    return null
  }

  const modeKey = dimension === 'substation' ? 'substation' : 'feeder'

  try {
    const response = await queryRightPanelFaultLocation(
      buildFaultLocationPayload({ beginTime, endTime, dimension: modeKey }),
    )
    const remoteData = resolveFaultLocationResponseData(response)
    const modeSummary = normalizeFaultLocationModeSummary(
      remoteData,
      modeKey,
      modeKey === 'substation' ? '变电站' : '线路',
    )
    const currentModes =
      faultSummaryData.value?.modes && typeof faultSummaryData.value.modes === 'object'
        ? faultSummaryData.value.modes
        : {}
    faultSummaryData.value = {
      modes: {
        ...currentModes,
        [modeKey]: modeSummary,
      },
    }

    return modeSummary
  } catch {
    if (modeKey === 'feeder') {
      faultSummaryData.value = null
    }
    return null
  }
}

const loadRightPanelOutageScopeSummary = async ({ beginTime, endTime }) => {
  if (!beginTime || !endTime) {
    outageScopeSummaryData.value = null
    return null
  }

  try {
    const response = await queryRightPanelOutageScope(buildOutageScopePayload({ beginTime, endTime }))
    outageScopeSummaryData.value = resolveOutageScopeResponseData(response)
    return outageScopeSummaryData.value
  } catch {
    outageScopeSummaryData.value = null
    return null
  }
}

const buildOutageChainsPayload = ({ beginTime, endTime, page = 1, perPage = OUTAGE_CHAINS_REMOTE_PAGE_SIZE }) => {
  const payload = {
    beginTime,
    endTime,
    page: Math.max(1, Math.round(safeNumber(page) || 1)),
    perPage: Math.max(1, Math.min(500, Math.round(safeNumber(perPage) || OUTAGE_CHAINS_REMOTE_PAGE_SIZE))),
  }
  appendCountyOrCityScope(payload)
  return payload
}

const resolveOutageChainsResponseData = (response) => {
  const data = response?.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null
  }
  if (data.outageChains && typeof data.outageChains === 'object' && !Array.isArray(data.outageChains)) {
    return data.outageChains
  }
  return data
}

const mapOutageRangeChainRow = (item, index = 0) => {
  const toNameList = (list) => {
    if (!Array.isArray(list)) {
      return []
    }
    return list
      .map((name) => String(name || '').trim())
      .filter((name) => name !== '')
  }

  const importantUsers = toNameList(item?.importantUsers)
  const sensitiveUsers = toNameList(item?.sensitiveUsers)
  const outageNumber = String(item?.outageNumber || item?.outage_number || '').trim() || '-'
  const rdtFeederName = String(item?.feederName || item?.rdtFeederName || item?.rdt_feeder_name || '-').trim() || '-'
  const rdtSubsName = String(item?.substationName || item?.rdtSubsName || item?.rdt_subs_name || '-').trim() || '-'
  const maintGroupName = String(item?.maintGroupName || item?.maint_group_name || '-').trim() || '-'
  const normalUserCount = Math.max(safeNumber(item?.normalUserCount), 0)
  const key = `${outageNumber}-${rdtFeederName}-${index}`

  return {
    key,
    outageNumber,
    rdtFeederName,
    rdtSubsName,
    maintGroupName,
    importantUsers,
    sensitiveUsers,
    importantUserText: importantUsers.length > 0 ? importantUsers.join('、') : '无',
    sensitiveUserText: sensitiveUsers.length > 0 ? sensitiveUsers.join('、') : '无',
    normalUserCount,
  }
}

const loadRightPanelOutageChains = async ({ beginTime, endTime, page = outageRangeChainsCurrentPage.value } = {}) => {
  if (!showOutageRangeAssessmentPage.value) {
    return null
  }

  if (!beginTime || !endTime) {
    outageRangeChainsData.value = []
    outageRangeChainsTotal.value = 0
    outageRangeChainsLoading.value = false
    return null
  }

  const requestId = ++outageRangeChainsRequestId
  outageRangeChainsLoading.value = true

  try {
    const payload = buildOutageChainsPayload({
      beginTime,
      endTime,
      page,
      perPage: OUTAGE_CHAINS_REMOTE_PAGE_SIZE,
    })
    const response = await queryRightPanelOutageChains(payload)

    if (requestId !== outageRangeChainsRequestId) {
      return null
    }

    const remoteData = resolveOutageChainsResponseData(response) || {}
    const resolvedPage = Math.max(1, Math.round(safeNumber(remoteData.page) || payload.page))
    const list = Array.isArray(remoteData.list) ? remoteData.list : []
    const total = Math.max(safeNumber(remoteData.total), list.length)

    outageRangeChainsCurrentPage.value = resolvedPage
    outageRangeChainsTotal.value = total
    outageRangeChainsData.value = list.map((item, index) =>
      mapOutageRangeChainRow(item, (resolvedPage - 1) * OUTAGE_CHAINS_REMOTE_PAGE_SIZE + index),
    )
    return outageRangeChainsData.value
  } catch (error) {
    if (requestId !== outageRangeChainsRequestId) {
      return null
    }
    console.error(error)
    outageRangeChainsData.value = []
    outageRangeChainsTotal.value = 0
    return null
  } finally {
    if (requestId === outageRangeChainsRequestId) {
      outageRangeChainsLoading.value = false
    }
  }
}

const handleOpenTimeTrendDetailPage = () => {
  const beginTime = toBackendDateTime(queryStartTime.value)
  const endTime = toBackendDateTime(queryEndTime.value)
  countyOutageFreqData.value = buildDefaultCountyOutageFreqData()
  void loadCountyOutageFreqData({
    beginTime,
    endTime,
  })
}

const handleFaultLocationModeChange = (modeKey) => {
  if (modeKey !== 'substation') {
    return
  }

  const existingSubstationMode = faultSummaryData.value?.modes?.substation
  if (existingSubstationMode && typeof existingSubstationMode === 'object') {
    return
  }

  const beginTime = toBackendDateTime(queryStartTime.value)
  const endTime = toBackendDateTime(queryEndTime.value)
  if (!beginTime || !endTime) {
    return
  }

  void loadRightPanelFaultLocationSummary({
    beginTime,
    endTime,
    dimension: 'substation',
  })
}

const loadDashboardData = async (customRange = null) => {
  loading.value = true
  dataError.value = ''
  dataNotice.value = ''
  tagStatsOverview.value = null
  countyStatsRows.value = []
  countyEquipmentStatsSummary.value = null
  countyEquipmentListRows.value = []
  countyEquipmentPageRows.value = []
  countyEquipmentPageTotal.value = 0
  faultSummaryData.value = null
  outageScopeSummaryData.value = null
  countyWarningLightsData.value = []
  outageRangeChainsData.value = []
  outageRangeChainsTotal.value = 0
  outageRangeChainsCurrentPage.value = 1
  outageEventsSummaryData.value = null
  outageDetailRows.value = []
  outageDetailTotal.value = 0

  const beginTime = customRange?.beginTime || toBackendDateTime(queryStartTime.value)
  const endTime = customRange?.endTime || toBackendDateTime(queryEndTime.value)

  if (!beginTime || !endTime) {
    dataError.value = '请完整选择开始和结束时间。'
    window.alert(dataError.value)
    loading.value = false
    return
  }

  const parsedBeginTime = parseBackendDateTime(beginTime)
  const parsedEndTime = parseBackendDateTime(endTime)
  if (!parsedBeginTime || !parsedEndTime || parsedBeginTime > parsedEndTime) {
    dataError.value = '开始时间不能晚于结束时间。'
    window.alert(dataError.value)
    loading.value = false
    return
  }

  if (countyList.value.length === 0) {
    await loadCountyList()
  }

  try {
    const basePayload = {
      beginTime,
      endTime,
    }
    const countyWarningsRequest = queryRightPanelCountyWarnings(basePayload).then((response) => {
      const countyWarningsData = response?.data
      const countyWarningsList = Array.isArray(countyWarningsData)
        ? countyWarningsData
        : Array.isArray(countyWarningsData?.list)
          ? countyWarningsData.list
          : Array.isArray(countyWarningsData?.countyWarnings)
            ? countyWarningsData.countyWarnings
            : []

      countyWarningLightsData.value = mapOverviewCountyWarningLights(countyWarningsList)
      return response
    })

    const requests = [
      loadTagStatsOverview(basePayload),
      queryOutageEventsByPages(basePayload),
      queryOutageUsersByPages(basePayload),
      loadCountyTrendData(basePayload),
      countyWarningsRequest,
      loadRightPanelFaultLocationSummary({ ...basePayload, dimension: 'feeder' }),
      loadRightPanelOutageScopeSummary(basePayload),
    ]
    if (spaceDistributionDetailVisible.value) {
      requests.push(loadCountyEquipmentStatsSummary(basePayload))
      requests.push(loadCountyEquipmentListRows(basePayload))
      requests.push(loadCountyEquipmentPageRows(basePayload))
    }

    const [
      tagStatsResponse,
      listRecords,
      users,
    ] = await Promise.all(requests)

    outageIndexRecords.value = []
    tagStatsOverview.value = tagStatsResponse
    outageEvents.value = listRecords.map((item, index) => normalizeOutageEventRecord(item, index))
    outageUsers.value = users

    if (outageUsers.value.length === 0 && outageEvents.value.length > 0) {
      dataNotice.value = '用户清单接口返回为空，标签识别和设备影响明细可能偏小。'
    }

    if (outageEvents.value.length === 0) {
      dataNotice.value = '接口调用成功，当前时间范围无停电事件数据。'
    }
  } catch (error) {
    console.error(error)
    outageIndexRecords.value = []
    outageEvents.value = []
    outageUsers.value = []
    tagStatsOverview.value = null
    countyStatsRows.value = []
    countyEquipmentStatsSummary.value = null
    countyEquipmentListRows.value = []
    countyEquipmentPageRows.value = []
    countyEquipmentPageTotal.value = 0
    faultSummaryData.value = null
    outageScopeSummaryData.value = null
    countyWarningLightsData.value = []
    outageRangeChainsData.value = []
    outageRangeChainsTotal.value = 0
    outageRangeChainsCurrentPage.value = 1
    outageEventsSummaryData.value = null
    outageDetailRows.value = []
    outageDetailTotal.value = 0
    countyTrendData.value = buildDefaultCountyTrendData(beginTime, endTime)
    countyOutageFreqData.value = buildDefaultCountyOutageFreqData()
    dataError.value = `后端接口调用失败：${error?.message || '未知错误'}`
  } finally {
    loading.value = false
  }
}

const regionOptions = computed(() => {
  const names = countyList.value
    .map((item) => toCountyDisplayName(item.countyName))
    .filter((item) => item !== '')
  const uniqueNames = Array.from(new Set(names))
  return ['全部', ...uniqueNames.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))]
})

const filteredOutageEvents = computed(() => {
  if (selectedRegion.value === '全部') {
    return outageEvents.value
  }
  const normalizedSelectedRegion = normalizeCountyName(selectedRegion.value)
  return outageEvents.value.filter((item) => normalizeCountyName(item.countyName) === normalizedSelectedRegion)
})

const countyRegionOptions = computed(() => regionOptions.value)
const selectedRegionCountyId = computed(() => getCountyIdByRegionName(selectedRegion.value))

const resolveCountyWarningHasOutage = (item, outageCount) => {
  if (!item || typeof item !== 'object') {
    return outageCount > 0
  }

  const explicitFlagKeys = ['hasOutage', 'hasWarning', 'warning', 'isWarning', 'alert']
  for (const key of explicitFlagKeys) {
    if (item[key] !== undefined && item[key] !== null && String(item[key]).trim() !== '') {
      return toBooleanFlag(item[key])
    }
  }

  const statusText = String(item.status || item.warningLevel || item.level || '')
    .trim()
    .toLowerCase()
  if (statusText) {
    if (['warning', 'danger', 'alert', 'outage', 'abnormal', 'fault', 'red', '1', 'true'].includes(statusText)) {
      return true
    }
    if (['safe', 'normal', 'green', '0', 'false'].includes(statusText)) {
      return false
    }
  }

  return outageCount > 0
}

const mapOverviewCountyWarningLights = (rawList) => {
  if (!Array.isArray(rawList)) {
    return []
  }

  const warningMap = new Map()
  rawList.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return
    }

    const countyName = normalizeCountyName(
      toCountyDisplayName(item.countyName || item.name || item.county || item.countyLabel || ''),
    )
    if (!countyName) {
      return
    }

    const outageCount = Math.max(
      safeNumber(
        item.outageCount ??
          item.outageEventCount ??
          item.warningCount ??
          item.eventCount ??
          item.count ??
          item.totalOutages,
      ),
      0,
    )
    const hasOutage = resolveCountyWarningHasOutage(item, outageCount)
    const existing = warningMap.get(countyName)
    if (existing) {
      existing.outageCount += outageCount
      existing.hasOutage = existing.hasOutage || hasOutage || existing.outageCount > 0
      return
    }

    warningMap.set(countyName, {
      countyName,
      outageCount,
      hasOutage: hasOutage || outageCount > 0,
    })
  })

  return Array.from(warningMap.values()).sort((a, b) => a.countyName.localeCompare(b.countyName, 'zh-Hans-CN'))
}

const countyWarningLights = computed(() => {
  return countyWarningLightsData.value
})

const isTargetCityRecord = (item) => {
  const record = normalizeUserRecord(item)
  const cityName = String(
    readFieldValue(record, ['rdtCityName', 'rdt_city_name', 'cityName', 'city_name']) || '',
  ).trim()
  if (!cityName) {
    return true
  }
  return cityName === tagAndKeyUserTargetCityName
}

const filteredFaultOutageEvents = computed(() =>
  filteredOutageEvents.value.filter((item) => isTargetCityRecord(item)),
)

const faultLocationSummary = computed(() => {
  const remote = faultSummaryData.value
  if (remote && typeof remote === 'object') {
    const normalizeBarKey = (value) => {
      const rawKey = String(value || '').trim().toLowerCase()
      if (['danger', 'red', 'high', 'highimpact'].includes(rawKey)) {
        return 'danger'
      }
      if (['warning', 'yellow', 'medium', 'mediumimpact'].includes(rawKey)) {
        return 'warning'
      }
      if (['safe', 'green', 'low', 'lowimpact'].includes(rawKey)) {
        return 'safe'
      }
      return ''
    }

    const buildBarsFromUnknownSource = (...sources) => {
      const counters = {
        danger: 0,
        warning: 0,
        safe: 0,
      }

      sources.forEach((source) => {
        if (!source) {
          return
        }

        if (Array.isArray(source)) {
          source.forEach((item) => {
            if (!item || typeof item !== 'object') {
              return
            }
            const barKey = normalizeBarKey(item.key || item.color || item.name || item.label)
            if (!barKey) {
              return
            }
            counters[barKey] += Math.max(safeNumber(item.count ?? item.value ?? item.total), 0)
          })
          return
        }

        if (typeof source === 'object') {
          Object.entries(source).forEach(([rawKey, rawValue]) => {
            const barKey = normalizeBarKey(rawKey)
            if (!barKey) {
              return
            }
            counters[barKey] += Math.max(safeNumber(rawValue), 0)
          })
        }
      })

      return [
        { key: 'danger', colorLabel: '红色', count: counters.danger },
        { key: 'warning', colorLabel: '黄色', count: counters.warning },
        { key: 'safe', colorLabel: '绿色', count: counters.safe },
      ]
    }

    const buildModeSummary = (modeKey, modeLabel, modeData) => {
      const bars = buildBarsFromUnknownSource(modeData?.bars, modeData?.colorBars)
      const barsTotal = bars.reduce((sum, item) => sum + item.count, 0)
      const total = Math.max(
        safeNumber(modeData?.total ?? modeData?.matchedEvents ?? modeData?.count ?? barsTotal),
        barsTotal,
      )
      const matchedEvents = Math.max(safeNumber(modeData?.matchedEvents), 0)

      return {
        key: modeKey,
        label: modeLabel,
        total,
        matchedEvents,
        bars,
      }
    }

    const remoteModes = remote?.modes && typeof remote.modes === 'object' ? remote.modes : null
    if (remoteModes) {
      const feederMode = buildModeSummary('feeder', '线路', remoteModes.feeder ?? remoteModes.line ?? {})
      const substationMode = buildModeSummary('substation', '变电站', remoteModes.substation ?? {})
      const equipmentMode = buildModeSummary('equipment', '设备', remoteModes.equipment ?? {})

      return {
        feederTotal: feederMode.total,
        equipmentTotal: equipmentMode.total,
        modes: {
          feeder: feederMode,
          substation: substationMode,
          equipment: equipmentMode,
        },
      }
    }

    const highCount = Math.max(safeNumber(remote?.highImpact?.count ?? remote?.highImpact), 0)
    const mediumCount = Math.max(safeNumber(remote?.mediumImpact?.count ?? remote?.mediumImpact), 0)
    const lowCount = Math.max(safeNumber(remote?.lowImpact?.count ?? remote?.lowImpact), 0)
    const total = highCount + mediumCount + lowCount
    const bars = [
      { key: 'danger', colorLabel: '红色', count: highCount },
      { key: 'warning', colorLabel: '黄色', count: mediumCount },
      { key: 'safe', colorLabel: '绿色', count: lowCount },
    ]

    return {
      feederTotal: total,
      equipmentTotal: total,
      modes: {
        feeder: {
          key: 'feeder',
          label: '线路',
          total,
          bars,
        },
        substation: {
          key: 'substation',
          label: '变电站',
          total,
          bars,
        },
        equipment: {
          key: 'equipment',
          label: '设备',
          total,
          bars,
        },
      },
    }
  }

  const resolveAffectedUserCount = (item) => safeNumber(
    readFieldValue(item, [
      'affectedConsCnt',
      'affected_cons_cnt',
      'powerUserCnt',
      'power_user_cnt',
      'affectedUsers',
      'affected_users',
    ]),
  )

  const resolveBucketKey = (count) => {
    if (count > 5000) {
      return 'danger'
    }
    if (count >= 1000) {
      return 'warning'
    }
    return 'safe'
  }

  const buildModeStats = (getEntityName) => {
    const maxUserCountByEntity = new Map()

    filteredFaultOutageEvents.value.forEach((item) => {
      const entityName = String(getEntityName(item) || '').trim()
      if (!entityName || entityName === '-') {
        return
      }

      const affectedUsers = resolveAffectedUserCount(item)
      const prevMax = maxUserCountByEntity.get(entityName) || 0
      if (affectedUsers > prevMax) {
        maxUserCountByEntity.set(entityName, affectedUsers)
      }
    })

    const counters = {
      danger: 0,
      warning: 0,
      safe: 0,
    }

    maxUserCountByEntity.forEach((count) => {
      const bucket = resolveBucketKey(count)
      counters[bucket] += 1
    })

    return {
      total: maxUserCountByEntity.size,
      bars: [
        { key: 'danger', colorLabel: '红色', count: counters.danger },
        { key: 'warning', colorLabel: '黄色', count: counters.warning },
        { key: 'safe', colorLabel: '绿色', count: counters.safe },
      ],
    }
  }

  const feederStats = buildModeStats((item) => readFieldValue(item, ['rdtFeederName', 'rdt_feeder_name', 'feederName', 'feeder_name']))
  const substationStats = buildModeStats((item) => readFieldValue(item, ['rdtSubsName', 'rdt_subs_name', 'subsName', 'subs_name', 'substationName', 'substation_name']))
  const equipmentStats = buildModeStats((item) => readFieldValue(item, ['faultEquipName', 'fault_equip_name', 'equipmentName', 'equipment_name']))

  return {
    feederTotal: feederStats.total,
    equipmentTotal: equipmentStats.total,
    modes: {
        feeder: {
          key: 'feeder',
          label: '线路',
          total: feederStats.total,
          matchedEvents: Math.max(safeNumber(filteredFaultOutageEvents.value.length), 0),
          bars: feederStats.bars,
        },
        substation: {
          key: 'substation',
          label: '变电站',
          total: substationStats.total,
          matchedEvents: Math.max(safeNumber(filteredFaultOutageEvents.value.length), 0),
          bars: substationStats.bars,
        },
        equipment: {
          key: 'equipment',
          label: '设备',
          total: equipmentStats.total,
          matchedEvents: Math.max(safeNumber(filteredFaultOutageEvents.value.length), 0),
          bars: equipmentStats.bars,
        },
      },
    }
})

const outageNatureOverviewCards = computed(() => {
  const summary = outageEventsSummaryData.value
  const total = Math.max(safeNumber(summary?.totalEvents), 0)
  const baseMap = new Map([
    ['planned', { key: 'planned', label: '计划停电', count: 0, rate: 0, rateText: '0.0%' }],
    ['fault', { key: 'fault', label: '故障停电', count: 0, rate: 0, rateText: '0.0%' }],
    ['other', { key: 'other', label: '其他', count: 0, rate: 0, rateText: '0.0%' }],
  ])

  const ratioList = Array.isArray(summary?.natureRatio) ? summary.natureRatio : []
  ratioList.forEach((item) => {
    const key = normalizeOutageNatureCode(item?.code || item?.name || item?.outageNature)
    if (!key) {
      return
    }

    const count = Math.max(safeNumber(item?.value), 0)
    const rate = Number.isFinite(Number(item?.percent))
      ? Number(Number(item.percent).toFixed(1))
      : total > 0
        ? Number(((count / total) * 100).toFixed(1))
        : 0
    const current = baseMap.get(key)
    if (!current) {
      return
    }

    baseMap.set(key, {
      ...current,
      count,
      rate,
      rateText: `${rate.toFixed(1)}%`,
    })
  })

  return ['planned', 'fault', 'other'].map((key) => baseMap.get(key))
})

const outageNatureOverview = computed(() => {
  const planned = outageNatureOverviewCards.value.find((item) => item.key === 'planned') || {
    count: 0,
    rate: 0,
    rateText: '0.0%',
  }
  const fault = outageNatureOverviewCards.value.find((item) => item.key === 'fault') || {
    count: 0,
    rate: 0,
    rateText: '0.0%',
  }
  const other = outageNatureOverviewCards.value.find((item) => item.key === 'other') || {
    count: 0,
    rate: 0,
    rateText: '0.0%',
  }
  const firstEnd = Math.max(0, Math.min(100, planned.rate))
  const secondEnd = Math.max(firstEnd, Math.min(100, Number((planned.rate + fault.rate).toFixed(1))))
  const thirdEnd = Math.max(secondEnd, Math.min(100, Number((planned.rate + fault.rate + other.rate).toFixed(1))))

  return {
    planned,
    fault,
    other,
    total: Math.max(safeNumber(outageEventsSummaryData.value?.totalEvents), 0),
    pieBackground: `conic-gradient(#4bfbac 0% ${firstEnd}%, #ff5e63 ${firstEnd}% ${secondEnd}%, #3a8dff ${secondEnd}% ${thirdEnd}%, rgba(90, 128, 168, 0.34) ${thirdEnd}% 100%)`,
  }
})

const outageRestoreOverview = computed(() => {
  const summary = outageEventsSummaryData.value
  const total = Math.max(safeNumber(summary?.totalEvents), safeNumber(summary?.restoredEvents) + safeNumber(summary?.unrestoredEvents))
  const restoredCount = Math.max(safeNumber(summary?.restoredEvents), 0)
  const unrestoredCount = Math.max(safeNumber(summary?.unrestoredEvents), Math.max(total - restoredCount, 0))
  const restoredRate = Number.isFinite(Number(summary?.restoredRate))
    ? Number(Number(summary.restoredRate).toFixed(1))
    : total > 0
      ? Number(((restoredCount / total) * 100).toFixed(1))
      : 0

  return {
    total,
    restored: {
      count: restoredCount,
      rate: restoredRate,
      rateText: `${restoredRate.toFixed(1)}%`,
    },
    unrestored: {
      count: unrestoredCount,
    },
  }
})

const outageDetailTotalPages = computed(() =>
  Math.max(
    Math.ceil(Math.max(safeNumber(outageDetailTotal.value), 0) / Math.max(safeNumber(outageDetailRowsPerPage.value), OUTAGE_DETAIL_MIN_PAGE_SIZE)),
    1,
  ),
)

const pagedOutageDetailRows = computed(() => outageDetailRows.value)

const recalcOutageDetailRowsPerPage = () => {
  if (!showOutageDetailPage.value || outageDetailLoading.value) {
    return
  }

  const bodyEl = outageDetailGridBodyRef.value
  if (!bodyEl) {
    return
  }

  const headEl = bodyEl.querySelector('.outage-detail-grid-head')
  const rowEl = bodyEl.querySelector('.outage-detail-grid-row')
  const headHeight = headEl?.getBoundingClientRect().height || OUTAGE_DETAIL_FALLBACK_HEAD_HEIGHT
  const rowHeight = rowEl?.getBoundingClientRect().height || OUTAGE_DETAIL_FALLBACK_ROW_HEIGHT
  const availableHeight = bodyEl.clientHeight - headHeight
  const estimatedSize = Math.floor(availableHeight / rowHeight) - OUTAGE_DETAIL_PAGE_SIZE_BUFFER
  const nextSize = Math.max(
    OUTAGE_DETAIL_MIN_PAGE_SIZE,
    Math.min(OUTAGE_DETAIL_MAX_PAGE_SIZE, Number.isFinite(estimatedSize) ? estimatedSize : OUTAGE_DETAIL_MIN_PAGE_SIZE),
  )

  if (nextSize !== outageDetailRowsPerPage.value) {
    outageDetailRowsPerPage.value = nextSize
    outageDetailCurrentPage.value = OUTAGE_DETAIL_DEFAULT_PAGE
    if (showOutageDetailPage.value && !suppressOutageDetailAutoReload) {
      void loadRightPanelOutageEvents({
        beginTime: toBackendDateTime(queryStartTime.value),
        endTime: toBackendDateTime(queryEndTime.value),
        page: OUTAGE_DETAIL_DEFAULT_PAGE,
        perPage: nextSize,
      })
    }
  }
}

const syncOutageDetailLayout = () => {
  recalcOutageDetailRowsPerPage()
}

const observeOutageDetailLayout = () => {
  if (typeof window === 'undefined' || typeof window.ResizeObserver !== 'function') {
    return
  }

  if (outageDetailLayoutObserver) {
    outageDetailLayoutObserver.disconnect()
  }

  outageDetailLayoutObserver = new window.ResizeObserver(() => {
    syncOutageDetailLayout()
  })

  if (outageDetailGridBodyRef.value) {
    outageDetailLayoutObserver.observe(outageDetailGridBodyRef.value)
  }
  if (outageDetailPaginationRef.value) {
    outageDetailLayoutObserver.observe(outageDetailPaginationRef.value)
  }
  if (outageDetailPageJumpRef.value) {
    outageDetailLayoutObserver.observe(outageDetailPageJumpRef.value)
  }
}

const outageDetailPageButtons = computed(() => {
  const total = outageDetailTotalPages.value
  const maxButtons = OUTAGE_DETAIL_MAX_PAGE_BUTTONS

  if (total <= maxButtons) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const half = Math.floor(maxButtons / 2)
  let start = outageDetailCurrentPage.value - half
  let end = outageDetailCurrentPage.value + half

  if (start < 1) {
    start = 1
    end = maxButtons
  }

  if (end > total) {
    end = total
    start = total - maxButtons + 1
  }

  const pages = []
  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }
  return pages
})

const displayOutageEvents = computed(() =>
  filteredOutageEvents.value.filter((item) => Boolean(normalizeCountyName(item.countyName))),
)

const visibleOutageEvents = computed(() => displayOutageEvents.value.slice(0, 8))

const outageSummary = computed(() => {
  const remote = outageScopeSummaryData.value
  if (remote && typeof remote === 'object') {
    const restoredEvents = Math.max(safeNumber(remote.restoredEvents), 0)
    const unrestoredEvents = Math.max(safeNumber(remote.unrestoredEvents ?? remote.activeEvents), 0)
    const totalEvents = Math.max(safeNumber(remote.totalEvents), restoredEvents + unrestoredEvents)
    return {
      totalEvents,
      totalUsers: Math.max(safeNumber(remote.affectedUsers), 0),
      totalEquipments: Math.max(safeNumber(remote.affectedEquipment), 0),
      activeEvents: unrestoredEvents,
    }
  }

  const totalEvents = filteredFaultOutageEvents.value.length
  const totalUsers = filteredFaultOutageEvents.value.reduce(
    (sum, item) => sum + safeNumber(item.affectedConsCnt || item.powerUserCnt),
    0,
  )
  const totalEquipments = filteredFaultOutageEvents.value.reduce(
    (sum, item) => sum + safeNumber(item.powerEquipCnt || item.affectedEquipmentCnt),
    0,
  )
  const activeEvents = filteredFaultOutageEvents.value.filter((item) => String(item.outageFlag) === '0').length

  return {
    totalEvents,
    totalUsers,
    totalEquipments,
    activeEvents,
  }
})

const countyImpacts = computed(() => {
  const impactMap = new Map()

  filteredOutageEvents.value.forEach((item) => {
    const name = normalizeCountyName(item.countyName)
    if (!name) {
      return
    }
    const users = safeNumber(item.powerUserCnt || item.affectedConsCnt)
    impactMap.set(name, (impactMap.get(name) || 0) + users)
  })

  return Array.from(impactMap.entries())
    .map(([name, users]) => ({ name, users }))
    .sort((a, b) => b.users - a.users)
    .slice(0, 6)
})

const countyImpactMax = computed(() => {
  if (countyImpacts.value.length === 0) {
    return 1
  }
  return Math.max(...countyImpacts.value.map((item) => item.users), 1)
})

const KEY_INDUSTRY_KEYWORDS = ['工业', '通信', '卫星', '铁塔', '医院', '政府', '供水', '燃气', '应急']
const KEY_UNIT_KEYWORDS = [
  '医院',
  '政府',
  '供水',
  '燃气',
  '应急',
  '消防',
  '公安',
  '学校',
  '车站',
  '机场',
  '通信',
  '移动',
  '联通',
  '电信',
  '铁塔',
  '卫星',
]

const toPlainText = (value) => String(value || '').replaceAll(/\s+/g, '')

const hasKeyword = (text, keywords) => keywords.some((keyword) => text.includes(keyword))

const KEYWORD_MOJIBAKE_ALIASES = {
  工业: ['宸ヤ笟'],
  通信: ['閫氫俊'],
  卫星: ['鍗槦'],
  铁塔: ['閾佸'],
  医院: ['鍖婚櫌'],
  政府: ['鏀垮簻'],
  供水: ['渚涙按'],
  燃气: ['鐕冩皵'],
  应急: ['搴旀€', '搴旀'],
  消防: ['娑堥槻'],
  公安: ['鍏畨'],
  学校: ['瀛︽牎'],
  车站: ['杞︾珯'],
  机场: ['鏈哄満'],
  移动: ['绉诲姩'],
  联通: ['鑱旈€', '鑱旈'],
  电信: ['鐢典俊'],
  发电: ['鍙戠數'],
  电厂: ['鐢靛巶'],
  中压: ['涓帇'],
  低压非居民: ['浣庡帇闈炲眳姘'],
}

const withMojibakeAliases = (keywords) =>
  Array.from(new Set(keywords.flatMap((keyword) => [keyword, ...(KEYWORD_MOJIBAKE_ALIASES[keyword] || [])])))

const KEY_INDUSTRY_MATCHERS = withMojibakeAliases(KEY_INDUSTRY_KEYWORDS)
const KEY_UNIT_MATCHERS = withMojibakeAliases(KEY_UNIT_KEYWORDS)
const POWER_PLANT_MATCHERS = withMojibakeAliases(['发电', '电厂'])
const MID_VOLT_MATCHERS = withMojibakeAliases(['中压'])
const LOW_NON_RESIDENTIAL_MATCHERS = withMojibakeAliases(['低压非居民'])

const pickFirst = (obj, keys) => {
  for (const key of keys) {
    const value = obj?.[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value
    }
  }
  return ''
}

const readFieldValue = (record, keys = []) => {
  if (!record || typeof record !== 'object') {
    return ''
  }

  const direct = pickFirst(record, keys)
  if (String(direct || '').trim() !== '') {
    return direct
  }

  const loweredKeyMap = new Map(
    Object.keys(record).map((key) => [key.toLowerCase().replaceAll('_', ''), key]),
  )

  for (const key of keys) {
    const normalizedKey = String(key).toLowerCase().replaceAll('_', '')
    const matchedKey = loweredKeyMap.get(normalizedKey)
    if (!matchedKey) {
      continue
    }

    const value = record?.[matchedKey]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value
    }
  }

  return ''
}

const normalizeUserRecord = (item) => {
  let record = item

  if (typeof record === 'string') {
    try {
      record = JSON.parse(record)
    } catch {
      return {}
    }
  }

  if (!record || typeof record !== 'object') {
    return {}
  }

  const wrappedKeys = ['record', 'data', 'result', 'detail', 'outageUser', 'outageUserDetail']
  for (const key of wrappedKeys) {
    const wrapped = record?.[key]
    if (wrapped && typeof wrapped === 'object' && !Array.isArray(wrapped)) {
      return wrapped
    }
  }

  const entries = Object.entries(record)
  if (entries.length === 1) {
    const [onlyValue] = entries[0].slice(1)
    if (onlyValue && typeof onlyValue === 'object' && !Array.isArray(onlyValue)) {
      return onlyValue
    }
  }

  return record
}

const normalizeOutageEventRecord = (item, index = 0) => {
  const record = normalizeUserRecord(item)
  const outageNumberRaw = extractOutageNumberParam(record)
  const outageNumber = String(outageNumberRaw || '').trim()
  const eventId = String(
    readFieldValue(record, ['id', 'eventId', 'event_id', 'outageId', 'outage_id']) ||
      outageNumber ||
      `event-${index}`,
  )

  return {
    ...record,
    id: eventId,
    outageNumber,
    outageNumberRaw,
    countyName: normalizeCountyName(
      readFieldValue(record, ['countyName', 'county_name', 'rdtCountyName', 'rdt_county_name']),
    ),
    affectedConsCnt: readFieldValue(record, [
      'affectedConsCnt',
      'affected_cons_cnt',
      'affectedUsers',
      'affected_users',
      'totalUsers',
      'total_users',
    ]),
    powerUserCnt: readFieldValue(record, ['powerUserCnt', 'power_user_cnt', 'affectedUsers', 'affected_users']),
    outageNature: readFieldValue(record, ['outageNature', 'outage_nature', 'outageTypeName', 'outage_type_name']),
    beginTime: readFieldValue(record, ['beginTime', 'begin_time']),
    endTime: readFieldValue(record, ['endTime', 'end_time']),
    maintGroupName: readFieldValue(record, ['maintGroupName', 'maint_group_name']),
    rdtFeederId: readFieldValue(record, ['rdtFeederId', 'rdt_feeder_id', 'feederId', 'feeder_id']),
    rdtFeederName: readFieldValue(record, ['rdtFeederName', 'rdt_feeder_name']),
    rdtFeederDevType: readFieldValue(record, [
      'rdtFeederDevType',
      'rdt_feeder_dev_type',
      'rdtFeederType',
      'rdt_feeder_type',
      'devType',
      'dev_type',
    ]),
    rdtSubsName: readFieldValue(record, ['rdtSubsName', 'rdt_subs_name']),
    faultEquipName: readFieldValue(record, ['faultEquipName', 'fault_equip_name', 'equipmentName', 'equipment_name']),
    powerEquipCnt: readFieldValue(record, ['powerEquipCnt', 'power_equip_cnt', 'affectedEquipment', 'affected_equipment']),
    affectedEquipmentCnt: readFieldValue(record, [
      'affectedEquipmentCnt',
      'affected_equipment_cnt',
      'affectedEquipment',
      'affected_equipment',
    ]),
    outageFlag: readFieldValue(record, ['outageFlag', 'outage_flag', 'restored']),
  }
}

const classifyUserByScore = (user) => {
  const record = normalizeUserRecord(user)
  const tradeName = toPlainText(
    readFieldValue(record, ['tradeName', 'trade_name', 'trade', 'tradeTypeName', 'trade_type_name', 'industryName']),
  )
  const consName = toPlainText(readFieldValue(record, ['consName', 'cons_name', 'name', 'userName', 'orgName']))
  const consTypeName = toPlainText(
    readFieldValue(record, ['consTypeName', 'cons_type_name', 'consVoltTypeName', 'cons_volt_type_name']),
  )
  const consVoltType = toPlainText(readFieldValue(record, ['consVoltType', 'cons_volt_type', 'voltType', 'volt_type']))

  const tradeMatched = hasKeyword(tradeName, KEY_INDUSTRY_MATCHERS)
  const hasPowerPlantKeyword = hasKeyword(tradeName, POWER_PLANT_MATCHERS)
  const consMatched = hasKeyword(consName, KEY_UNIT_MATCHERS)
  const isMidVoltage = consVoltType === '01'
  const isLowNonResidential =
    consVoltType === '02' && (consTypeName.includes('低压非居民') || hasKeyword(consTypeName, LOW_NON_RESIDENTIAL_MATCHERS))

  let score = 0
  if (tradeMatched) score += 40
  if (hasPowerPlantKeyword) score += 25
  if (consMatched) score += 30
  if (isMidVoltage) score += 20
  if (isLowNonResidential) score += 10

  const isSensitive = score >= 60
  const isImportant = score >= 50

  return {
    sensitiveScore: score,
    importantScore: score,
    isSensitive,
    isImportant,
    isLivelihood: !isSensitive && !isImportant,
  }
}

const isInSelectedCounty = (countyName) => {
  if (selectedRegion.value === '全部') {
    return true
  }
  if (!String(countyName || '').trim()) {
    return true
  }
  return normalizeCountyName(countyName) === normalizeCountyName(selectedRegion.value)
}

const outageUsersBySelectedCounty = computed(() =>
  outageUsers.value.filter((item) => {
    const record = normalizeUserRecord(item)
    const countyName = readFieldValue(record, ['rdtCountyName', 'rdt_county_name', 'countyName', 'county_name'])
    return isInSelectedCounty(countyName)
  }),
)

const tagAndKeyUserSourceUsers = computed(() =>
  outageUsersBySelectedCounty.value.filter((item) => {
    const record = normalizeUserRecord(item)
    const cityName = String(
      readFieldValue(record, ['rdtCityName', 'rdt_city_name', 'cityName', 'city_name']) || '',
    ).trim()
    return !cityName || cityName === tagAndKeyUserTargetCityName
  }),
)

const localTagStats = computed(() => {
  const users = tagAndKeyUserSourceUsers.value
  let sensitive = 0
  let important = 0
  let livelihood = 0

  users.forEach((item) => {
    const classified = classifyUserByScore(item)
    if (classified.isSensitive) {
      sensitive += 1
    }
    if (classified.isImportant) {
      important += 1
    }
    if (!classified.isSensitive && !classified.isImportant) {
      livelihood += 1
    }
  })

  return {
    total: users.length,
    important,
    sensitive,
    livelihood,
  }
})

const tagStats = computed(() => {
  const remote = tagStatsOverview.value
  if (!remote) {
    return localTagStats.value
  }

  return {
    total: Math.max(safeNumber(remote.totalUsers), 0),
    important: Math.max(safeNumber(remote.keyUsers), 0),
    sensitive: Math.max(safeNumber(remote.sensitiveUsers), 0),
    livelihood: Math.max(safeNumber(remote.normalUsers), 0),
  }
})

const toPercent = (count, total) => {
  if (!total) {
    return 0
  }
  return Math.round((count / total) * 1000) / 10
}

const userTagPieData = computed(() => {
  const total = tagStats.value.total
  const important = tagStats.value.important
  const sensitive = tagStats.value.sensitive

  const importantRatio = toPercent(important, total)
  const sensitiveRatio = toPercent(sensitive, total)

  return [
    {
      key: 'important',
      title: '重要用户占比',
      count: important,
      total,
      ratio: importantRatio,
      ratioText: `${importantRatio}%`,
      color: '#f4a825',
    },
    {
      key: 'sensitive',
      title: '敏感用户占比',
      count: sensitive,
      total,
      ratio: sensitiveRatio,
      ratioText: `${sensitiveRatio}%`,
      color: '#ff4d4f',
    },
  ]
})

const keyUsers = computed(() => {
  const list = tagAndKeyUserSourceUsers.value
    .map((item) => {
      const classified = classifyUserByScore(item)
      return {
        userId: item.consNo || item.userId || '-',
        name: item.consName || item.name || '未知用户',
        countyName: normalizeCountyName(item.rdtCountyName || item.countyName || ''),
        isImportant: classified.isImportant,
        isSensitive: classified.isSensitive,
        keyScore: Math.max(classified.sensitiveScore, classified.importantScore),
        outageNumber: item.outageNumber || '',
      }
    })
    .filter((item) => item.isImportant || item.isSensitive)
    .sort((a, b) => b.keyScore - a.keyScore)

  return list.slice(0, 8)
})

const outageRangeChains = computed(() => {
  return outageRangeChainsData.value
})

const outageNatureText = (value) => {
  const plain = String(value || '').trim()
  if (plain === '01' || plain === '1') {
    return '计划停电'
  }
  if (plain === '02' || plain === '2') {
    return '故障停电'
  }
  if (plain.includes('计划')) {
    return '计划停电'
  }
  if (plain.includes('故障')) {
    return '故障停电'
  }
  return '其他'
}

const KEY_USER_PIE_COLOR_SET = [
  '#3ed6ff',
  '#66f7c8',
  '#f6c35f',
  '#ff8f7d',
  '#8aa2ff',
  '#f490ff',
  '#7be28f',
  '#f7a26a',
]

const buildPieBackground = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return 'conic-gradient(rgba(124, 166, 201, 0.24) 0% 100%)'
  }

  let cursor = 0
  const segments = items.map((item) => {
    const start = cursor
    const step = Math.max(0, Number(item.rate) || 0)
    cursor = Math.min(100, cursor + step)
    return `${item.color} ${start}% ${cursor}%`
  })

  if (cursor < 100) {
    segments.push(`rgba(124, 166, 201, 0.24) ${cursor}% 100%`)
  }

  return `conic-gradient(${segments.join(', ')})`
}

const keyUserCountyStats = computed(() => {
  const totalUsers = Math.max(tagStats.value.total, 0)
  return countyStatsRows.value.map((item) => {
    const countyName = normalizeCountyName(item?.name || '')
    const keyUserCount = safeNumber(item?.importantCount)
    const ratio = toPercent(keyUserCount, totalUsers)
    return {
      countyName,
      keyUserCount,
      ratio,
      ratioText: `${ratio}%`,
    }
  })
})

const buildKeyUserDetailBasePayload = () => {
  const beginTime = toBackendDateTime(queryStartTime.value)
  const endTime = toBackendDateTime(queryEndTime.value)
  if (!beginTime || !endTime) {
    return null
  }

  const payload = {
    beginTime,
    endTime,
  }
  appendCountyOrCityScope(payload)

  if (countyUserListSnapshotDate) {
    payload.snapshotDate = countyUserListSnapshotDate
  } else {
    if (countyUserListSnapshotStartDate) {
      payload.snapshotStartDate = countyUserListSnapshotStartDate
    }
    if (countyUserListSnapshotEndDate) {
      payload.snapshotEndDate = countyUserListSnapshotEndDate
    }
  }

  if (countyUserListOutageCounts.has(countyUserListOutageCount)) {
    payload.outageCount = countyUserListOutageCount
  }

  return payload
}

const mapKeyUserDetailStats = (response) => {
  const data = response?.data || {}
  const summary = data?.summary && typeof data.summary === 'object' && !Array.isArray(data.summary) ? data.summary : null
  return {
    summary,
    keyUserByTrade: Array.isArray(data?.keyUserByTrade) ? data.keyUserByTrade : [],
    sensitiveUserByTrade: Array.isArray(data?.sensitiveUserByTrade) ? data.sensitiveUserByTrade : [],
    outageNatureDistribution: Array.isArray(data?.outageNatureDistribution) ? data.outageNatureDistribution : [],
  }
}

const mapCountyUserListResult = (response) => {
  const data = response?.data && typeof response.data === 'object' && !Array.isArray(response.data)
    ? response.data
    : {}
  const list = Array.isArray(data?.list) ? data.list : []
  return {
    list,
    total: Math.max(safeNumber(data?.total), 0),
    page: Math.max(safeNumber(data?.page), 1),
    perPage: Math.max(safeNumber(data?.perPage), 0),
  }
}

const loadKeyUserDetailStats = async () => {
  const payload = buildKeyUserDetailBasePayload()
  if (!payload) {
    keyUserDetailStatsData.value = {
      summary: null,
      keyUserByTrade: [],
      sensitiveUserByTrade: [],
      outageNatureDistribution: [],
    }
    return
  }

  try {
    const response = await queryCountyDetailStats(payload)
    keyUserDetailStatsData.value = mapKeyUserDetailStats(response)
  } catch {
    keyUserDetailStatsData.value = {
      summary: null,
      keyUserByTrade: [],
      sensitiveUserByTrade: [],
      outageNatureDistribution: [],
    }
  }
}

const mapKeyUserDetailRow = (item, index) => {
  const isSensitive = toBooleanFlag(
    readFieldValue(item, ['isSensitiveUser', 'is_sensitive_user', 'sensitiveUser', 'sensitive_user']),
  )
  const isKey = toBooleanFlag(
    readFieldValue(item, ['isKeyUser', 'is_key_user', 'keyUser', 'key_user']),
  )
  const consNo = String(readFieldValue(item, ['consNo', 'cons_no', 'userNo', 'user_no']) || '').trim() || '-'
  const consName = String(readFieldValue(item, ['consName', 'cons_name', 'userName', 'user_name']) || '').trim() || '-'
  const countyName = toCountyDisplayName(
    readFieldValue(item, ['countyName', 'county_name', 'rdtCountyName', 'rdt_county_name']) || '-',
  ) || '-'
  const tradeName = String(readFieldValue(item, ['tradeName', 'trade_name', 'industryName', 'industry_name']) || '').trim()
  const outageNumber = String(extractOutageNumberParam(item) || '').trim()
  const outageNature = readFieldValue(item, ['outageNature', 'outage_nature', 'outageType', 'outage_type'])
  const keyUserLevel = isSensitive && isKey ? '重点+敏感' : (isSensitive ? '敏感' : (isKey ? '重点' : '-'))
  return {
    id: `${consNo}-${index}`,
    consNo,
    consName,
    countyName,
    tradeName: tradeName || '未知行业',
    keyUserLevel,
    isSensitive,
    consAddr: '-',
    outageNature: outageNatureText(outageNature),
    equipmentName: '-',
    tgName: '-',
    meterId: '-',
    outageNumber,
  }
}

const resolveCountyUserOutageNumber = (record) => {
  const outageNumber = String(
    readFieldValue(record, [
      'outageNumber',
      'outage_number',
      'outageNo',
      'outage_no',
      'outageNum',
      'outage_num',
      'eventNo',
      'event_no',
      'eventNumber',
      'event_number',
      'outageId',
      'outage_id',
    ]) || '',
  ).trim()

  if (outageNumber) {
    return outageNumber
  }

  return String(extractOutageNumberParam(record) || '').trim()
}

const matchKeyUserRowOutageNumber = (item) => {
  const directOutageNumber = resolveCountyUserOutageNumber(item)
  if (directOutageNumber) {
    return directOutageNumber
  }

  const consNo = String(item?.consNo || '').trim()
  if (!consNo) {
    return ''
  }

  const targetCounty = normalizeCountyName(item?.countyName || '')
  const targetTradeName = String(item?.tradeName || '').trim()
  const targetNatureText = outageNatureText(item?.outageNature || '')
  let fallbackOutageNumber = ''

  const sourceCandidates = [
    ...outageUsersBySelectedCounty.value,
    ...tagAndKeyUserSourceUsers.value,
    ...outageUsers.value,
  ]

  for (const sourceUser of sourceCandidates) {
    const record = normalizeUserRecord(sourceUser)
    const recordConsNo = String(readFieldValue(record, ['consNo', 'cons_no', 'userNo', 'userId']) || '').trim()
    if (recordConsNo !== consNo) {
      continue
    }

    const recordOutageNumber = resolveCountyUserOutageNumber(record)
    if (!recordOutageNumber) {
      continue
    }
    if (!fallbackOutageNumber) {
      fallbackOutageNumber = recordOutageNumber
    }

    const recordCounty = normalizeCountyName(
      readFieldValue(record, ['rdtCountyName', 'rdt_county_name', 'countyName', 'county_name']),
    )
    const recordTradeName = String(readFieldValue(record, ['tradeName', 'trade_name', 'industryName']) || '').trim()
    const recordNatureText = outageNatureText(
      readFieldValue(record, ['outageNature', 'outage_nature', 'outageTypeName', 'outage_type_name']),
    )

    const countyMatched = !targetCounty || !recordCounty || recordCounty === targetCounty
    const tradeMatched = !targetTradeName || !recordTradeName || recordTradeName === targetTradeName
    const natureMatched = targetNatureText === '其他' || recordNatureText === '其他' || recordNatureText === targetNatureText

    if (countyMatched && tradeMatched && natureMatched) {
      return recordOutageNumber
    }
  }

  return fallbackOutageNumber
}

const loadKeyUserDetailRows = async () => {
  const payload = buildKeyUserDetailBasePayload()
  if (!payload) {
    keyUserDetailRows.value = []
    keyUserDetailTotal.value = 0
    keyUserDetailLoading.value = false
    return
  }

  payload.page = keyUserDetailCurrentPage.value
  payload.perPage = KEY_USER_DETAIL_ROWS_PER_PAGE
  const keyword = keyUserDetailSearchKeyword.value.trim()
  if (keyword) {
    payload.keyword = keyword
  }
  const selectedFilterValue = String(keyUserDetailSelectedFilterValue.value || '').trim()
  if (selectedFilterValue === 'important') {
    payload.userLevel = 'key'
  } else if (countyUserListLevels.has(selectedFilterValue)) {
    payload.userLevel = selectedFilterValue
  } else if (countyUserListOutageCounts.has(selectedFilterValue)) {
    payload.outageCount = selectedFilterValue
  }

  const requestId = keyUserDetailListRequestId + 1
  keyUserDetailListRequestId = requestId
  keyUserDetailLoading.value = true

  try {
    const response = await queryCountyUserList(payload)
    if (requestId !== keyUserDetailListRequestId) {
      return
    }

    const result = mapCountyUserListResult(response)
    keyUserDetailRows.value = result.list.map((item, index) => mapKeyUserDetailRow(item, index))
    keyUserDetailTotal.value = result.total

    const perPage = result.perPage > 0 ? result.perPage : KEY_USER_DETAIL_ROWS_PER_PAGE
    const totalPages = Math.max(Math.ceil(keyUserDetailTotal.value / perPage), 1)
    if (keyUserDetailCurrentPage.value > totalPages) {
      keyUserDetailCurrentPage.value = totalPages
    }
  } catch {
    if (requestId !== keyUserDetailListRequestId) {
      return
    }
    keyUserDetailRows.value = []
    keyUserDetailTotal.value = 0
  } finally {
    if (requestId === keyUserDetailListRequestId) {
      keyUserDetailLoading.value = false
    }
  }
}

const keyUserNaturePieData = computed(() => {
  const natureList = keyUserDetailStatsData.value.outageNatureDistribution
  const summaryTotal = safeNumber(keyUserDetailStatsData.value?.summary?.total)
  const totalFromItems = natureList.reduce((sum, item) => sum + Math.max(safeNumber(item?.userCount), 0), 0)
  const total = Math.max(summaryTotal, totalFromItems)

  return natureList.map((item) => {
    const label = String(item?.outageNature || '').trim() || '其他'
    const count = Math.max(safeNumber(item?.userCount), 0)
    const percentageRaw = item?.percentage
    const rate = percentageRaw !== undefined && percentageRaw !== null
      ? Math.max(safeNumber(percentageRaw), 0)
      : toPercent(count, total)
    const normalized = outageNatureText(label)
    const color = normalized === '故障停电' ? '#ff5a5f' : (normalized === '计划停电' ? '#4bfbac' : '#3a8dff')
    return {
      key: label,
      label: normalized,
      count,
      rate,
      color,
      rateText: `${rate}%`,
    }
  })
})

const keyUserNaturePieBackground = computed(() => buildPieBackground(keyUserNaturePieData.value))

const keyUserIndustryPieData = computed(() => {
  const list = keyUserDetailStatsData.value.keyUserByTrade
  const summaryTotal = safeNumber(keyUserDetailStatsData.value?.summary?.keyUsers)
  const totalFromItems = list.reduce((sum, item) => sum + Math.max(safeNumber(item?.userCount), 0), 0)
  const total = Math.max(summaryTotal, totalFromItems)
  if (total <= 0) {
    return []
  }

  return list
    .map((item) => ({
      key: String(item?.tradeType || item?.tradeName || ''),
      label: String(item?.tradeName || '').trim() || '未知行业',
      count: Math.max(safeNumber(item?.userCount), 0),
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((item, index) => {
      const rate = toPercent(item.count, total)
      return {
        ...item,
        rate,
        rateText: `${rate}%`,
        color: KEY_USER_PIE_COLOR_SET[index % KEY_USER_PIE_COLOR_SET.length],
      }
    })
})

const keyUserIndustryTotal = computed(() => {
  const summaryTotal = safeNumber(keyUserDetailStatsData.value?.summary?.keyUsers)
  if (summaryTotal > 0) {
    return summaryTotal
  }
  return keyUserIndustryPieData.value.reduce((sum, item) => sum + item.count, 0)
})

const keyUserIndustryPieBackground = computed(() => buildPieBackground(keyUserIndustryPieData.value))

const sensitiveUserIndustryPieData = computed(() => {
  const list = keyUserDetailStatsData.value.sensitiveUserByTrade
  const summaryTotal = safeNumber(keyUserDetailStatsData.value?.summary?.sensitiveUsers)
  const totalFromItems = list.reduce((sum, item) => sum + Math.max(safeNumber(item?.userCount), 0), 0)
  const total = Math.max(summaryTotal, totalFromItems)
  if (total <= 0) {
    return []
  }

  return list
    .map((item) => ({
      key: String(item?.tradeType || item?.tradeName || ''),
      label: String(item?.tradeName || '').trim() || '未知行业',
      count: Math.max(safeNumber(item?.userCount), 0),
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((item, index) => {
      const rate = toPercent(item.count, total)
      return {
        ...item,
        rate,
        rateText: `${rate}%`,
        color: KEY_USER_PIE_COLOR_SET[index % KEY_USER_PIE_COLOR_SET.length],
      }
    })
})

const sensitiveUserIndustryPieBackground = computed(() => buildPieBackground(sensitiveUserIndustryPieData.value))
const sensitiveUserIndustryTotal = computed(() => {
  const summaryTotal = safeNumber(keyUserDetailStatsData.value?.summary?.sensitiveUsers)
  if (summaryTotal > 0) {
    return summaryTotal
  }
  return sensitiveUserIndustryPieData.value.reduce((sum, item) => sum + item.count, 0)
})

const keyUserFilterCategoryOptions = computed(() => [
  { value: 'level', label: '重点|敏感' },
])

const keyUserFilterValueOptions = computed(() => [
  { value: 'key', label: '重点用户' },
  { value: 'sensitive', label: '敏感用户' },
])

const filteredKeyUserDetailRows = computed(() => keyUserDetailRows.value)

const keyUserDetailTotalPages = computed(() =>
  Math.max(Math.ceil(keyUserDetailTotal.value / KEY_USER_DETAIL_ROWS_PER_PAGE), 1),
)

const keyUserDetailPageButtons = computed(() => {
  const total = keyUserDetailTotalPages.value
  const maxButtons = KEY_USER_DETAIL_MAX_PAGE_BUTTONS

  if (total <= maxButtons) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const half = Math.floor(maxButtons / 2)
  let start = keyUserDetailCurrentPage.value - half
  let end = keyUserDetailCurrentPage.value + half

  if (start < 1) {
    start = 1
    end = maxButtons
  }

  if (end > total) {
    end = total
    start = total - maxButtons + 1
  }

  const pages = []
  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }
  return pages
})

const pagedKeyUserDetailRows = computed(() => {
  return keyUserDetailRows.value
})

const USER_CONS_TYPE_ORDER = ['低压居民', '低压非居民', '中压']
const USER_DETAIL_TYPE_OPTIONS = [...USER_CONS_TYPE_ORDER]
const LOW_RESIDENTIAL_MATCHERS = withMojibakeAliases(['低压居民'])

const resolveConsTypeCategory = (record) => {
  const consTypeName = toPlainText(readFieldValue(record, ['consTypeName', 'cons_type_name', 'consType', 'consVoltTypeName']))
  const consType = toPlainText(readFieldValue(record, ['consType']))
  const consVoltType = toPlainText(readFieldValue(record, ['consVoltType', 'voltType']))

  if (consVoltType === '01' || hasKeyword(consTypeName, MID_VOLT_MATCHERS)) {
    return '中压'
  }

  if (consType === '02' || hasKeyword(consTypeName, LOW_NON_RESIDENTIAL_MATCHERS)) {
    return '低压非居民'
  }

  if (consType === '03' || hasKeyword(consTypeName, LOW_RESIDENTIAL_MATCHERS)) {
    return '低压居民'
  }

  if (consTypeName.includes('中压')) {
    return '中压'
  }

  if (consTypeName.includes('低压') && consTypeName.includes('非')) {
    return '低压非居民'
  }

  if (consTypeName.includes('低压')) {
    return '低压居民'
  }

  return '低压居民'
}

const USER_TYPE_CHART_TICK_COUNT = 5

const buildUserTypeChart = (mode) => {
  const buckets = new Map(
    USER_CONS_TYPE_ORDER.map((label) => [
      label,
      {
        label,
        normalCount: 0,
        highlightCount: 0,
        total: 0,
      },
    ]),
  )

  tagAndKeyUserSourceUsers.value.forEach((item) => {
    const record = normalizeUserRecord(item)
    const category = resolveConsTypeCategory(record)
    const bucket = buckets.get(category)
    if (!bucket) {
      return
    }

    const classified = classifyUserByScore(record)
    const isHighlight = mode === 'important' ? classified.isImportant : classified.isSensitive
    if (isHighlight) {
      bucket.highlightCount += 1
    } else {
      bucket.normalCount += 1
    }
    bucket.total += 1
  })

  const rows = USER_CONS_TYPE_ORDER.map((label) => buckets.get(label))
  const maxTotal = Math.max(...rows.map((item) => item?.total || 0), 0)
  const tickStep = Math.max(Math.ceil(maxTotal / (USER_TYPE_CHART_TICK_COUNT - 1)), 1)
  const axisMax = tickStep * (USER_TYPE_CHART_TICK_COUNT - 1)
  const ticks = Array.from({ length: USER_TYPE_CHART_TICK_COUNT }, (_, index) => axisMax - index * tickStep)

  const bars = rows.map((item) => {
    const normalRatio = axisMax > 0 ? (item.normalCount / axisMax) * 100 : 0
    const highlightRatio = axisMax > 0 ? (item.highlightCount / axisMax) * 100 : 0

    return {
      ...item,
      normalRatio,
      highlightRatio,
      highlightBottom: normalRatio,
    }
  })

  return {
    ticks,
    bars,
  }
}

const importantUserTypeChart = computed(() => buildUserTypeChart('important'))
const sensitiveUserTypeChart = computed(() => buildUserTypeChart('sensitive'))

const keyUserTimeTrend = computed(() => {
  const beginTime = toBackendDateTime(queryStartTime.value)
  const endTime = toBackendDateTime(queryEndTime.value)
  const fallback = buildDefaultCountyTrendData(beginTime, endTime)
  const source = countyTrendData.value || {}
  const labels = Array.isArray(source.labels) && source.labels.length > 0 ? source.labels : fallback.labels
  const timeLabels = Array.isArray(source.timeLabels) && source.timeLabels.length > 0
    ? source.timeLabels
    : fallback.timeLabels
  const sensitiveSeries =
    Array.isArray(source.sensitiveSeries) && source.sensitiveSeries.length > 0
      ? source.sensitiveSeries
      : fallback.sensitiveSeries
  const importantSeries =
    Array.isArray(source.importantSeries) && source.importantSeries.length > 0
      ? source.importantSeries
      : fallback.importantSeries

  return { labels, timeLabels, sensitiveSeries, importantSeries }
})

const keyUserCountRows = computed(() => {
  return countyStatsRows.value
})

const spaceDistributionDeviceRows = computed(() => {
  const deviceMap = new Map()

  const toDisplayText = (value) => {
    const text = String(value ?? '').trim()
    return text || '-'
  }

  const buildUserDisplayText = (record) => {
    const consNo = toDisplayText(readFieldValue(record, ['consNo', 'cons_no', 'userNo', 'user_id', 'userId']))
    const consName = toDisplayText(readFieldValue(record, ['consName', 'cons_name', 'userName', 'name']))
    const countyName = toDisplayText(
      normalizeCountyName(readFieldValue(record, ['rdtCountyName', 'rdt_county_name', 'countyName', 'county_name'])),
    )
    const consAddr = toDisplayText(readFieldValue(record, ['consAddr', 'cons_addr', 'consAddress', 'address']))

    return `${consNo} / ${consName} / ${countyName} / ${consAddr}`
  }

  tagAndKeyUserSourceUsers.value.forEach((item) => {
    const record = normalizeUserRecord(item)
    const deviceNoRaw = readFieldValue(record, [
      'faultEquipNo',
      'fault_equip_no',
      'equipmentNo',
      'equipment_no',
      'equipNo',
      'equip_no',
      'faultEquipId',
      'fault_equip_id',
      'equipmentId',
      'equipment_id',
      'deviceNo',
      'device_no',
    ])
    const deviceNameRaw = readFieldValue(record, [
      'faultEquipName',
      'fault_equip_name',
      'equipmentName',
      'equipment_name',
      'equipName',
      'equip_name',
      'deviceName',
      'device_name',
    ])

    const deviceNo = toDisplayText(deviceNoRaw)
    const deviceName = toDisplayText(deviceNameRaw)
    const deviceKey = `${deviceNo}||${deviceName}`

    if (!deviceMap.has(deviceKey)) {
      deviceMap.set(deviceKey, {
        key: deviceKey,
        deviceNo,
        deviceName,
        importantUserSet: new Set(),
        sensitiveUserSet: new Set(),
      })
    }

    const classified = classifyUserByScore(record)
    const userText = buildUserDisplayText(record)
    const current = deviceMap.get(deviceKey)

    if (classified.isImportant) {
      current.importantUserSet.add(userText)
    }

    if (classified.isSensitive) {
      current.sensitiveUserSet.add(userText)
    }
  })

  return Array.from(deviceMap.values())
    .map((item) => {
      const importantUserList = Array.from(item.importantUserSet)
      const sensitiveUserList = Array.from(item.sensitiveUserSet)
      return {
        key: item.key,
        deviceNo: item.deviceNo,
        deviceName: item.deviceName,
        importantUserCount: importantUserList.length,
        sensitiveUserCount: sensitiveUserList.length,
        importantUserList,
        sensitiveUserList,
      }
    })
    .sort((a, b) => {
      if (a.importantUserCount !== b.importantUserCount) {
        return b.importantUserCount - a.importantUserCount
      }
      if (a.sensitiveUserCount !== b.sensitiveUserCount) {
        return b.sensitiveUserCount - a.sensitiveUserCount
      }
      return String(a.deviceName || '').localeCompare(String(b.deviceName || ''), 'zh-Hans-CN')
    })
})

const resolveUserDetailTypeFilter = (record, consTypeName) => {
  const normalizedTypeName = toPlainText(consTypeName)

  if (normalizedTypeName.includes('低压非居民') || hasKeyword(normalizedTypeName, LOW_NON_RESIDENTIAL_MATCHERS)) {
    return '低压非居民'
  }

  if (normalizedTypeName.includes('低压居民') || hasKeyword(normalizedTypeName, LOW_RESIDENTIAL_MATCHERS)) {
    return '低压居民'
  }

  if (
    normalizedTypeName.includes('中压') ||
    normalizedTypeName.includes('高压') ||
    hasKeyword(normalizedTypeName, MID_VOLT_MATCHERS)
  ) {
    return '中压'
  }

  return resolveConsTypeCategory(record)
}

const userDetailRows = computed(() =>
  tagAndKeyUserSourceUsers.value.map((item, index) => {
    const record = normalizeUserRecord(item)
    const consNo = readFieldValue(record, ['consNo', 'cons_no', 'userNo', 'userId', 'consumerNo'])
    const consName = readFieldValue(record, ['consName', 'cons_name', 'name', 'userName'])
    const consTypeName = readFieldValue(record, ['consTypeName', 'cons_type_name', 'consType'])
    const consAddr = readFieldValue(record, ['consAddr', 'cons_addr', 'consAddress', 'address'])
    const fallbackNo = readFieldValue(record, ['outageNumber', 'id'])
    const fallbackName = readFieldValue(record, ['rdtFeederName', 'faultEquipName'])
    const outageNature = readFieldValue(record, ['outageNature', 'outage_nature'])
    const tradeName = readFieldValue(record, ['tradeName', 'trade_name', 'industryName'])
    const ctime = readFieldValue(record, ['ctime', 'beginTime', 'begin_time'])
    const endTime = readFieldValue(record, ['endTime', 'end_time'])
    const equipmentName = readFieldValue(record, ['equipmentName', 'equipment_name', 'faultEquipName'])

    return {
      id: buildUserRecordKey(record) || String(index),
      consNo: consNo || fallbackNo || '-',
      consName: consName || fallbackName || '-',
      consTypeName: consTypeName || '-',
      consTypeFilterCategory: resolveUserDetailTypeFilter(record, consTypeName),
      consAddr: consAddr || '-',
      outageNature: outageNatureText(outageNature),
      tradeName: tradeName || '-',
      ctime: ctime || '-',
      endTime: endTime || '-',
      equipmentName: equipmentName || '-',
    }
  }),
)

const filteredUserDetailRows = computed(() => {
  const keyword = userDetailSearchKeyword.value.trim().toLowerCase()
  const selectedType = userDetailSelectedType.value

  return userDetailRows.value.filter((item) => {
    const consNo = String(item.consNo || '').toLowerCase()
    const consName = String(item.consName || '').toLowerCase()
    const matchedKeyword = !keyword || consNo.includes(keyword) || consName.includes(keyword)
    const matchedType = !selectedType || item.consTypeFilterCategory === selectedType
    return matchedKeyword && matchedType
  })
})
const userDetailTotalPages = computed(() =>
  Math.max(Math.ceil(filteredUserDetailRows.value.length / userDetailRowsPerPage.value), 1),
)

const pagedUserDetailRows = computed(() => {
  const start = (userDetailCurrentPage.value - 1) * userDetailRowsPerPage.value
  return filteredUserDetailRows.value.slice(start, start + userDetailRowsPerPage.value)
})

const recalcUserDetailRowsPerPage = () => {
  if (!showUserDetailPage.value) {
    return
  }

  const bodyEl = userDetailGridBodyRef.value
  if (!bodyEl) {
    return
  }

  const headEl = bodyEl.querySelector('.user-detail-grid-head')
  const rowEl = bodyEl.querySelector('.user-detail-grid-row')
  const headHeight = headEl?.getBoundingClientRect().height || USER_DETAIL_FALLBACK_HEAD_HEIGHT
  const rowHeight = rowEl?.getBoundingClientRect().height || USER_DETAIL_FALLBACK_ROW_HEIGHT
  const availableHeight = bodyEl.clientHeight - headHeight
  const estimatedSize = Math.floor(Math.max(availableHeight, 0) / Math.max(rowHeight, 1))
  const adjustedSize = estimatedSize + 1
  const nextSize = Math.max(
    USER_DETAIL_MIN_PAGE_SIZE,
    Math.min(USER_DETAIL_MAX_PAGE_SIZE, Number.isFinite(adjustedSize) ? adjustedSize : USER_DETAIL_MIN_PAGE_SIZE),
  )

  if (nextSize !== userDetailRowsPerPage.value) {
    userDetailRowsPerPage.value = nextSize
  }
}

const recalcUserDetailMaxPageButtons = () => {
  if (!showUserDetailPage.value) {
    return
  }

  const paginationEl = userDetailPaginationRef.value
  if (!paginationEl) {
    return
  }

  const style = window.getComputedStyle(paginationEl)
  const gap = Number.parseFloat(style.columnGap || style.gap || String(USER_DETAIL_PAGE_BUTTON_GAP)) || USER_DETAIL_PAGE_BUTTON_GAP
  const jumpWidth = userDetailPageJumpRef.value?.offsetWidth || 0
  const width = Math.max(paginationEl.clientWidth - jumpWidth - gap, 0)
  const estimatedButtons = Math.floor((width + gap) / (USER_DETAIL_PAGE_BUTTON_MIN_WIDTH + gap))

  let nextCount = Number.isFinite(estimatedButtons) ? estimatedButtons : USER_DETAIL_MIN_PAGE_BUTTONS
  nextCount = Math.max(USER_DETAIL_MIN_PAGE_BUTTONS, Math.min(USER_DETAIL_MAX_PAGE_BUTTONS, nextCount))
  if (nextCount % 2 === 0) {
    nextCount -= 1
  }
  nextCount = Math.max(USER_DETAIL_MIN_PAGE_BUTTONS, nextCount)

  if (nextCount !== userDetailMaxPageButtons.value) {
    userDetailMaxPageButtons.value = nextCount
  }
}

const syncUserDetailLayout = () => {
  recalcUserDetailRowsPerPage()
  recalcUserDetailMaxPageButtons()
}

const observeUserDetailLayout = () => {
  if (typeof window === 'undefined' || typeof window.ResizeObserver !== 'function') {
    return
  }

  if (userDetailLayoutObserver) {
    userDetailLayoutObserver.disconnect()
  }

  userDetailLayoutObserver = new window.ResizeObserver(() => {
    syncUserDetailLayout()
  })

  if (userDetailGridBodyRef.value) {
    userDetailLayoutObserver.observe(userDetailGridBodyRef.value)
  }
  if (userDetailPaginationRef.value) {
    userDetailLayoutObserver.observe(userDetailPaginationRef.value)
  }
  if (userDetailPageJumpRef.value) {
    userDetailLayoutObserver.observe(userDetailPageJumpRef.value)
  }
}

const userDetailPageButtons = computed(() => {
  const total = userDetailTotalPages.value
  const maxButtons = userDetailMaxPageButtons.value

  if (total <= maxButtons) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const half = Math.floor(maxButtons / 2)
  let start = userDetailCurrentPage.value - half
  let end = userDetailCurrentPage.value + half

  if (start < 1) {
    start = 1
    end = maxButtons
  }

  if (end > total) {
    end = total
    start = total - maxButtons + 1
  }

  const pages = []
  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }
  return pages
})

const openUserDetailPage = () => {
  showUserDetailPage.value = true
  userDetailSearchInput.value = ''
  userDetailSearchKeyword.value = ''
  userDetailSelectedType.value = ''
  userDetailJumpPageInput.value = ''
  userDetailCurrentPage.value = 1
  nextTick(() => {
    observeUserDetailLayout()
    syncUserDetailLayout()
  })
}

const openOutageRangeAssessmentPage = () => {
  showOutageRangeAssessmentPage.value = true
  outageRangeChainsCurrentPage.value = 1
  outageRangeChainsLoading.value = true
  void loadRightPanelOutageChains({
    beginTime: toBackendDateTime(queryStartTime.value),
    endTime: toBackendDateTime(queryEndTime.value),
    page: 1,
  })
}

const closeOutageRangeAssessmentPage = () => {
  showOutageRangeAssessmentPage.value = false
  outageRangeChainsRequestId += 1
  outageRangeChainsLoading.value = false
}

const goOutageRangeAssessmentPage = (page) => {
  const targetPage = Math.max(1, Math.round(safeNumber(page) || 1))
  if (!showOutageRangeAssessmentPage.value) {
    return
  }
  if (targetPage === outageRangeChainsCurrentPage.value) {
    return
  }
  outageRangeChainsCurrentPage.value = targetPage
  void loadRightPanelOutageChains({
    beginTime: toBackendDateTime(queryStartTime.value),
    endTime: toBackendDateTime(queryEndTime.value),
    page: targetPage,
  })
}

const reloadKeyUserDetailList = () => {
  void loadKeyUserDetailRows()
}

const openKeyUserDetailPage = async () => {
  showKeyUserDetailPage.value = true
  keyUserDetailSearchInput.value = ''
  keyUserDetailSearchKeyword.value = ''
  keyUserDetailSelectedFilterCategory.value = 'level'
  keyUserDetailSelectedFilterValue.value = 'key'
  keyUserDetailJumpPageInput.value = ''
  keyUserDetailCurrentPage.value = 1
  selectedKeyUserCounty.value = ''
  keyUserDetailLoading.value = true
  closeKeyUserDetailModal()
  await loadKeyUserDetailStats()
  await loadKeyUserDetailRows()
  nextTick(() => {
    syncMapMarkers()
  })
}

const closeKeyUserDetailModal = () => {
  keyUserDetailModalVisible.value = false
  selectedKeyUserDetail.value = null
}

const closeKeyUserDetailPage = () => {
  showKeyUserDetailPage.value = false
  selectedKeyUserCounty.value = ''
  closeKeyUserDetailModal()
  if (infoWindow) {
    infoWindow.close()
  }
  syncMapMarkers()
}

const openKeyUserDetailModal = async (item) => {
  selectedKeyUserDetail.value = item
  keyUserDetailModalVisible.value = true

  const consNo = String(item?.consNo || '').trim()
  const outageNumber = matchKeyUserRowOutageNumber(item)
  if (!consNo || !outageNumber) {
    console.warn('[county/user-detail] skip request: missing required params', {
      consNo,
      outageNumber,
      row: item,
    })
    return
  }

  const requestId = keyUserDetailModalRequestId + 1
  keyUserDetailModalRequestId = requestId

  try {
    const response = await queryCountyUserDetail({
      consNo,
      outageNumber,
    })

    if (requestId !== keyUserDetailModalRequestId) {
      return
    }
    if (!keyUserDetailModalVisible.value || !selectedKeyUserDetail.value) {
      return
    }

    const detail = response?.data || {}
    selectedKeyUserDetail.value = {
      ...selectedKeyUserDetail.value,
      consNo: String(detail?.consNo || selectedKeyUserDetail.value.consNo || '-').trim() || '-',
      consName: String(detail?.consName || selectedKeyUserDetail.value.consName || '-').trim() || '-',
      consAddr: String(detail?.consAddr || selectedKeyUserDetail.value.consAddr || '-').trim() || '-',
      outageNature: outageNatureText(detail?.outageNature || selectedKeyUserDetail.value.outageNature || ''),
      equipmentName: String(detail?.equipmentName || selectedKeyUserDetail.value.equipmentName || '-').trim() || '-',
      tgName: String(detail?.tgName || selectedKeyUserDetail.value.tgName || '-').trim() || '-',
      tradeName: String(detail?.tradeName || selectedKeyUserDetail.value.tradeName || '').trim(),
    }
  } catch {
    // Keep table row snapshot as fallback if detail api fails.
  }
}

const applyKeyUserDetailSearch = () => {
  keyUserDetailSearchKeyword.value = keyUserDetailSearchInput.value.trim()
  keyUserDetailCurrentPage.value = 1
  reloadKeyUserDetailList()
}

const goKeyUserDetailPage = (page) => {
  if (page < 1 || page > keyUserDetailTotalPages.value) {
    return
  }
  keyUserDetailCurrentPage.value = page
  reloadKeyUserDetailList()
}

const jumpToKeyUserDetailPage = () => {
  const input = String(keyUserDetailJumpPageInput.value ?? '').trim()
  if (!input) {
    return
  }

  const parsed = Number(input)
  if (!Number.isFinite(parsed)) {
    return
  }

  const target = Math.min(keyUserDetailTotalPages.value, Math.max(1, Math.round(parsed)))
  goKeyUserDetailPage(target)
  keyUserDetailJumpPageInput.value = String(target)
}

const closeUserDetailModal = () => {
  userDetailModalVisible.value = false
  selectedUserDetail.value = null
}

const closeUserDetailPage = () => {
  showUserDetailPage.value = false
  if (userDetailLayoutObserver) {
    userDetailLayoutObserver.disconnect()
    userDetailLayoutObserver = null
  }
  closeUserDetailModal()
}

const openUserDetailModal = (item) => {
  selectedUserDetail.value = item
  userDetailModalVisible.value = true
}

const applyUserDetailSearch = () => {
  userDetailSearchKeyword.value = userDetailSearchInput.value.trim()
  userDetailCurrentPage.value = 1
}

const goUserDetailPage = (page) => {
  if (page < 1 || page > userDetailTotalPages.value) {
    return
  }
  userDetailCurrentPage.value = page
}

const jumpToUserDetailPage = () => {
  const input = String(userDetailJumpPageInput.value ?? '').trim()
  if (!input) {
    return
  }

  const parsed = Number(input)
  if (!Number.isFinite(parsed)) {
    return
  }

  const target = Math.min(userDetailTotalPages.value, Math.max(1, Math.round(parsed)))
  goUserDetailPage(target)
  userDetailJumpPageInput.value = String(target)
}

const openOutageDetailPage = () => {
  suppressOutageDetailAutoReload = true
  showOutageDetailPage.value = true
  outageDetailSearchInput.value = ''
  outageDetailSearchKeyword.value = ''
  outageDetailSelectedNature.value = ''
  outageDetailJumpPageInput.value = ''
  outageDetailCurrentPage.value = OUTAGE_DETAIL_DEFAULT_PAGE
  outageEventsSummaryData.value = null
  outageDetailLoading.value = true
  closeOutageDetailModal()
  void loadRightPanelOutageEventsSummary({
    beginTime: toBackendDateTime(queryStartTime.value),
    endTime: toBackendDateTime(queryEndTime.value),
  })
  nextTick(async () => {
    syncOutageDetailLayout()
    try {
      await loadRightPanelOutageEvents({
        beginTime: toBackendDateTime(queryStartTime.value),
        endTime: toBackendDateTime(queryEndTime.value),
        page: OUTAGE_DETAIL_DEFAULT_PAGE,
        perPage: outageDetailRowsPerPage.value,
      })
    } finally {
      suppressOutageDetailAutoReload = false
      observeOutageDetailLayout()
    }
  })
}

const closeOutageDetailModal = () => {
  outageEventDetailRequestId += 1
  outageDetailModalVisible.value = false
  selectedOutageDetail.value = null
}

const closeOutageDetailPage = () => {
  suppressOutageDetailAutoReload = false
  showOutageDetailPage.value = false
  outageEventDetailRequestId += 1
  outageEventsSummaryRequestId += 1
  outageEventsSummaryData.value = null
  outageDetailListRequestId += 1
  outageDetailLoading.value = false
  if (outageDetailLayoutObserver) {
    outageDetailLayoutObserver.disconnect()
    outageDetailLayoutObserver = null
  }
  closeOutageDetailModal()
}

const openOutageDetailModal = async (item) => {
  selectedOutageDetail.value = mapOutageEventDetailForModal(item, item)
  outageDetailModalVisible.value = true
  locateOutageFeederOnMapFrame(item)
  const requestId = ++outageEventDetailRequestId
  const outageNumber = String(item?.outageNumber || '').trim()
  if (outageNumber) {
    try {
      const response = await queryRightPanelOutageEventDetail({ outageNumber })
      if (requestId === outageEventDetailRequestId && outageDetailModalVisible.value) {
        const remoteDetailData = resolveOutageEventDetailResponseData(response)
        if (remoteDetailData) {
          selectedOutageDetail.value = mapOutageEventDetailForModal(remoteDetailData, item)
        }
      }
    } catch (error) {
      console.error(error)
    }
  }

  const targetId = String(item?.id || '').trim()
  let matchedEvent = null

  if (targetId) {
    matchedEvent = outageEvents.value.find((event) => String(getEventId(event) || '').trim() === targetId) || null
  }

  if (!matchedEvent) {
    const targetOutageNumber = String(item?.outageNumber || '').trim()
    if (targetOutageNumber) {
      matchedEvent =
        outageEvents.value.find(
          (event) => String(extractOutageNumberParam(event) || '').trim() === targetOutageNumber,
        ) || null
    }
  }

  if (!matchedEvent) {
    const targetCounty = normalizeCountyName(item?.countyName || '')
    if (targetCounty) {
      matchedEvent =
        outageEvents.value.find((event) => normalizeCountyName(event.countyName) === targetCounty) || null
    }
  }

  if (matchedEvent) {
    activeMapEvent.value = matchedEvent
    syncMapMarkers()
    openEventInfo(matchedEvent)
    return
  }

  if (item) {
    activeMapEvent.value = item
    syncMapMarkers()
    openEventInfo(item)
  }
}

const applyOutageDetailSearch = () => {
  outageDetailSearchKeyword.value = outageDetailSearchInput.value.trim()
  outageDetailCurrentPage.value = OUTAGE_DETAIL_DEFAULT_PAGE
  void loadRightPanelOutageEventsSummary({
    beginTime: toBackendDateTime(queryStartTime.value),
    endTime: toBackendDateTime(queryEndTime.value),
  })
  void loadRightPanelOutageEvents({
    beginTime: toBackendDateTime(queryStartTime.value),
    endTime: toBackendDateTime(queryEndTime.value),
    page: OUTAGE_DETAIL_DEFAULT_PAGE,
    perPage: outageDetailRowsPerPage.value,
  })
}

const goOutageDetailPage = (page) => {
  if (page < 1 || page > outageDetailTotalPages.value) {
    return
  }
  outageDetailCurrentPage.value = page
  void loadRightPanelOutageEvents({
    beginTime: toBackendDateTime(queryStartTime.value),
    endTime: toBackendDateTime(queryEndTime.value),
    page,
    perPage: outageDetailRowsPerPage.value,
  })
}

const jumpToOutageDetailPage = () => {
  const input = String(outageDetailJumpPageInput.value ?? '').trim()
  if (!input) {
    return
  }

  const parsed = Number(input)
  if (!Number.isFinite(parsed)) {
    return
  }

  const target = Math.min(outageDetailTotalPages.value, Math.max(1, Math.round(parsed)))
  goOutageDetailPage(target)
  outageDetailJumpPageInput.value = String(target)
}

const eventNatureText = (event) => outageNatureText(event?.outageNature)

const eventNatureClass = (event) => {
  const nature = String(event?.outageNature || '').trim()
  if (nature === '01') {
    return 'planned'
  }
  if (nature === '02') {
    return 'fault'
  }
  return 'other'
}

const mapStatusText = computed(() => {
  if (loading.value) {
    return '数据加载中...'
  }
  if (dataError.value) {
    return dataError.value
  }
  if (dataNotice.value) {
    return dataNotice.value
  }
  if (mapError.value) {
    return mapError.value
  }
  return '已连接后端接口'
})

watch(
  regionOptions,
  (options) => {
    if (!options.includes(selectedRegion.value)) {
      selectedRegion.value = '全部'
    }
  },
  { immediate: true },
)

watch(
  displayOutageEvents,
  (list) => {
    if (list.length === 0) {
      selectedEventId.value = ''
      return
    }

    if (!list.some((item) => getEventId(item) === selectedEventId.value)) {
      selectedEventId.value = getEventId(list[0])
    }
  },
  { immediate: true },
)

watch(outageDetailRows, (rows) => {
  if (rows.length === 0) {
    outageDetailCurrentPage.value = OUTAGE_DETAIL_DEFAULT_PAGE
    closeOutageDetailModal()
    nextTick(() => {
      syncOutageDetailLayout()
    })
    return
  }

  if (outageDetailCurrentPage.value > outageDetailTotalPages.value) {
    outageDetailCurrentPage.value = outageDetailTotalPages.value
  }

  nextTick(() => {
    syncOutageDetailLayout()
  })
})

watch(selectedRegion, (regionName) => {
  outageDetailCurrentPage.value = 1
  closeOutageDetailModal()
  if (regionName === '全部') {
    selectedKeyUserCounty.value = ''
  } else {
    selectedKeyUserCounty.value = regionName
  }

  syncCountyFocusToMapFrame()
  nextTick(() => {
    syncMapMarkers()
    syncKeyUserCountyMarkersToMapFrame()
  })

  void loadTagStatsOverview({
    beginTime: toBackendDateTime(queryStartTime.value),
    endTime: toBackendDateTime(queryEndTime.value),
  })
  void loadCountyTrendData({
    beginTime: toBackendDateTime(queryStartTime.value),
    endTime: toBackendDateTime(queryEndTime.value),
  })
  faultSummaryData.value = null
  outageScopeSummaryData.value = null
  void loadRightPanelFaultLocationSummary({
    beginTime: toBackendDateTime(queryStartTime.value),
    endTime: toBackendDateTime(queryEndTime.value),
    dimension: 'feeder',
  })
  void loadRightPanelOutageScopeSummary({
    beginTime: toBackendDateTime(queryStartTime.value),
    endTime: toBackendDateTime(queryEndTime.value),
  })
  if (spaceDistributionDetailVisible.value) {
    void loadCountyEquipmentStatsSummary({
      beginTime: toBackendDateTime(queryStartTime.value),
      endTime: toBackendDateTime(queryEndTime.value),
    })
    void loadCountyEquipmentListRows({
      beginTime: toBackendDateTime(queryStartTime.value),
      endTime: toBackendDateTime(queryEndTime.value),
    })
    void loadCountyEquipmentPageRows({
      beginTime: toBackendDateTime(queryStartTime.value),
      endTime: toBackendDateTime(queryEndTime.value),
    })
  }

  if (showOutageDetailPage.value) {
    outageDetailCurrentPage.value = OUTAGE_DETAIL_DEFAULT_PAGE
    void loadRightPanelOutageEventsSummary({
      beginTime: toBackendDateTime(queryStartTime.value),
      endTime: toBackendDateTime(queryEndTime.value),
    })
    void loadRightPanelOutageEvents({
      beginTime: toBackendDateTime(queryStartTime.value),
      endTime: toBackendDateTime(queryEndTime.value),
      page: OUTAGE_DETAIL_DEFAULT_PAGE,
      perPage: outageDetailRowsPerPage.value,
    })
  }

  if (showOutageRangeAssessmentPage.value) {
    outageRangeChainsCurrentPage.value = 1
    void loadRightPanelOutageChains({
      beginTime: toBackendDateTime(queryStartTime.value),
      endTime: toBackendDateTime(queryEndTime.value),
      page: 1,
    })
  }

  if (showKeyUserDetailPage.value) {
    keyUserDetailCurrentPage.value = 1
    void loadKeyUserDetailStats()
    void loadKeyUserDetailRows()
  }
})

watch(outageDetailSelectedNature, () => {
  outageDetailCurrentPage.value = OUTAGE_DETAIL_DEFAULT_PAGE
  if (!showOutageDetailPage.value) {
    return
  }
  void loadRightPanelOutageEvents({
    beginTime: toBackendDateTime(queryStartTime.value),
    endTime: toBackendDateTime(queryEndTime.value),
    page: OUTAGE_DETAIL_DEFAULT_PAGE,
    perPage: outageDetailRowsPerPage.value,
  })
})

watch([showOutageDetailPage, outageDetailGridBodyRef, outageDetailPaginationRef, outageDetailPageJumpRef], ([visible]) => {
  if (!visible) {
    return
  }

  nextTick(() => {
    observeOutageDetailLayout()
    syncOutageDetailLayout()
  })
})

watch(filteredUserDetailRows, (rows) => {
  if (rows.length === 0) {
    userDetailCurrentPage.value = 1
    closeUserDetailModal()
    nextTick(() => {
      syncUserDetailLayout()
    })
    return
  }

  if (userDetailCurrentPage.value > userDetailTotalPages.value) {
    userDetailCurrentPage.value = userDetailTotalPages.value
  }

  nextTick(() => {
    syncUserDetailLayout()
  })
})

watch([showUserDetailPage, userDetailGridBodyRef, userDetailPaginationRef, userDetailPageJumpRef], ([visible]) => {
  if (!visible) {
    return
  }

  nextTick(() => {
    observeUserDetailLayout()
    syncUserDetailLayout()
  })
})

watch(filteredKeyUserDetailRows, (rows) => {
  if (rows.length === 0) {
    closeKeyUserDetailModal()
    return
  }

  if (keyUserDetailCurrentPage.value > keyUserDetailTotalPages.value) {
    keyUserDetailCurrentPage.value = keyUserDetailTotalPages.value
    reloadKeyUserDetailList()
  }
})

watch(keyUserDetailSelectedFilterValue, () => {
  keyUserDetailCurrentPage.value = 1
  reloadKeyUserDetailList()
})

watch(showKeyUserDetailPage, (visible) => {
  if (!visible) {
    selectedKeyUserCounty.value = ''
  }

  nextTick(() => {
    syncMapMarkers()
    syncKeyUserCountyMarkersToMapFrame()
  })
})

watch(
  keyUserCountyStats,
  () => {
    if (!showKeyUserDetailPage.value) {
      return
    }
    syncMapMarkers()
    syncKeyUserCountyMarkersToMapFrame()
  },
  { deep: true },
)

const applyTimeFilter = async () => {
  await loadDashboardData()
  activeMapEvent.value = null

  if (showOutageDetailPage.value) {
    outageDetailCurrentPage.value = OUTAGE_DETAIL_DEFAULT_PAGE
    const beginTime = toBackendDateTime(queryStartTime.value)
    const endTime = toBackendDateTime(queryEndTime.value)
    await Promise.all([
      loadRightPanelOutageEventsSummary({
        beginTime,
        endTime,
      }),
      loadRightPanelOutageEvents({
        beginTime,
        endTime,
        page: OUTAGE_DETAIL_DEFAULT_PAGE,
        perPage: outageDetailRowsPerPage.value,
      }),
    ])
  }

  if (showOutageRangeAssessmentPage.value) {
    outageRangeChainsCurrentPage.value = 1
    await loadRightPanelOutageChains({
      beginTime: toBackendDateTime(queryStartTime.value),
      endTime: toBackendDateTime(queryEndTime.value),
      page: 1,
    })
  }

  if (showKeyUserDetailPage.value) {
    keyUserDetailCurrentPage.value = 1
    await loadKeyUserDetailStats()
    await loadKeyUserDetailRows()
  }

  if (!mapInstance) {
    return
  }

  syncMapMarkers()
  if (infoWindow) {
    infoWindow.close()
  }
}

const handleOpenSpaceDistributionDetailPage = () => {
  spaceDistributionDetailVisible.value = true
  countyEquipmentListRows.value = []
  countyEquipmentPageRows.value = []
  countyEquipmentPageTotal.value = 0
  void loadCountyEquipmentStatsSummary({
    beginTime: toBackendDateTime(queryStartTime.value),
    endTime: toBackendDateTime(queryEndTime.value),
  })
  void loadCountyEquipmentListRows({
    beginTime: toBackendDateTime(queryStartTime.value),
    endTime: toBackendDateTime(queryEndTime.value),
  })
  void loadCountyEquipmentPageRows({
    beginTime: toBackendDateTime(queryStartTime.value),
    endTime: toBackendDateTime(queryEndTime.value),
    page: 1,
  })
}

const handleGoSpaceDistributionDetailPage = (page) => {
  void loadCountyEquipmentPageRows({
    beginTime: toBackendDateTime(queryStartTime.value),
    endTime: toBackendDateTime(queryEndTime.value),
    page,
  })
}

const handleCloseSpaceDistributionDetailPage = () => {
  spaceDistributionDetailVisible.value = false
  countyEquipmentListRows.value = []
  countyEquipmentPageRows.value = []
  countyEquipmentPageTotal.value = 0
}

const toggleLeftPanel = () => {
  isLeftCollapsed.value = !isLeftCollapsed.value
  if (isLeftCollapsed.value) {
    spaceDistributionDetailVisible.value = false
    countyEquipmentListRows.value = []
    countyEquipmentPageRows.value = []
    countyEquipmentPageTotal.value = 0
    closeOutageRangeAssessmentPage()
    closeOutageDetailPage()
    closeUserDetailPage()
    closeKeyUserDetailPage()
  }
}

const toggleRightPanel = () => {
  isRightCollapsed.value = !isRightCollapsed.value
  if (isRightCollapsed.value) {
    closeOutageRangeAssessmentPage()
    closeOutageDetailPage()
  }
}

const switchPageTab = (tab) => {
  activePageTab.value = tab === 'sensitiveDemand' ? 'sensitiveDemand' : 'outageUsers'
  if (activePageTab.value !== 'outageUsers') {
    spaceDistributionDetailVisible.value = false
    countyEquipmentListRows.value = []
    countyEquipmentPageRows.value = []
    countyEquipmentPageTotal.value = 0
  }
}

const resolveRegionOptionName = (regionName) => {
  const displayName = toCountyDisplayName(regionName)
  if (!displayName || displayName === '全部') {
    return '全部'
  }
  const normalizedName = normalizeCountyName(displayName)
  const matchedRegion = regionOptions.value.find(
    (item) => item !== '全部' && normalizeCountyName(item) === normalizedName,
  )
  return matchedRegion || displayName
}

const focusRegion = (regionName) => {
  selectedRegion.value = resolveRegionOptionName(regionName)
  const center = getCountyCenter(regionName)
  if (mapInstance && center) {
    mapInstance.setZoomAndCenter(9, center)
  }
}

const locateKeyUser = (user) => {
  if (!user) {
    return
  }

  const targetOutageNumber = String(user.outageNumber || '').trim()
  const matchedEvent = outageEvents.value.find(
    (item) => String(extractOutageNumberParam(item) || '').trim() === targetOutageNumber,
  )
  if (matchedEvent) {
    selectedEventId.value = getEventId(matchedEvent)
    openEventInfo(matchedEvent)
    return
  }

  if (user.countyName) {
    focusRegion(user.countyName)
  }
}

const loadAmapScript = (() => {
  let promise

  return () => {
    if (window.AMap) {
      return Promise.resolve(window.AMap)
    }

    if (promise) {
      return promise
    }

    if (!amapKey) {
      return Promise.reject(new Error('高德地图 Key 未配置'))
    }

    window._AMapSecurityConfig = {
      securityJsCode: amapSecurityJsCode,
    }

    promise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}`
      script.async = true
      script.onload = () => {
        if (window.AMap) {
          resolve(window.AMap)
          return
        }
        reject(new Error('AMap SDK loaded, but AMap is undefined'))
      }
      script.onerror = () => reject(new Error('Failed to load AMap SDK'))
      document.head.appendChild(script)
    })

    return promise
  }
})()

const clearDistrictOverlays = () => {
  if (!mapInstance || districtOverlays.length === 0) {
    return
  }
  mapInstance.remove(districtOverlays)
  districtOverlays = []
}

const clearEventMarkers = () => {
  if (!mapInstance || eventMarkers.length === 0) {
    return
  }
  mapInstance.remove(eventMarkers)
  eventMarkers = []
}

const clearKeyUserCountyMarkers = () => {
  if (!mapInstance || keyUserCountyMarkers.length === 0) {
    return
  }
  mapInstance.remove(keyUserCountyMarkers)
  keyUserCountyMarkers = []
}

const buildEventMarkerContent = (event, isActive) => {
  const markerNode = document.createElement('div')
  markerNode.className = `outage-event-marker ${eventNatureClass(event)} ${isActive ? 'active' : ''}`.trim()

  const inner = document.createElement('span')
  inner.className = 'outage-event-marker-label'
  inner.textContent = safeNumber(event.affectedConsCnt || event.powerUserCnt)

  markerNode.appendChild(inner)
  return markerNode
}

const buildKeyUserCountyMarkerContent = (countyStat, isActive) => {
  const markerNode = document.createElement('div')
  markerNode.className = `key-user-region-marker ${isActive ? 'active' : ''}`.trim()
  markerNode.title = `${countyStat.countyName}：${countyStat.keyUserCount}户`
  return markerNode
}

const escapeHtml = (value = '') =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const openEventInfo = (event) => {
  if (!mapInstance || !amapSdk || !event) {
    return
  }

  const position = getCountyCenter(event.countyName)
  selectedEventId.value = getEventId(event)

  const content = `
    <div class="map-info-window">
      <h4>${escapeHtml(event.rdtFeederName || event.faultEquipName || '停电事件')}</h4>
      <p>事件号：${escapeHtml(event.outageNumber || '-')}</p>
      <p>区域：${escapeHtml(normalizeCountyName(event.countyName) || '未知')}</p>
      <p>类型：${escapeHtml(eventNatureText(event))}</p>
      <p>时间：${escapeHtml(event.beginTime || '-')}</p>
      <p>影响用户：${safeNumber(event.affectedConsCnt || event.powerUserCnt)} 户</p>
      <p>影响设备：${safeNumber(event.affectedEquipmentCnt || event.powerEquipCnt)} 台</p>
    </div>
  `

  if (!infoWindow) {
    infoWindow = new amapSdk.InfoWindow({
      isCustom: false,
      offset: new amapSdk.Pixel(0, -20),
      autoMove: true,
    })
  }

  infoWindow.setContent(content)
  infoWindow.open(mapInstance, position)
  mapInstance.setZoomAndCenter(10, position)
}

const openKeyUserCountyInfo = (countyStat) => {
  if (!mapInstance || !amapSdk || !countyStat) {
    return
  }

  const position = getCountyCenter(countyStat.countyName)
  selectedKeyUserCounty.value = countyStat.countyName

  const content = `
    <div class="map-info-window">
      <h4>${escapeHtml(countyStat.countyName || '未知区域')}</h4>
      <p>重点用户户数：${safeNumber(countyStat.keyUserCount)} 户</p>
      <p>占比：${escapeHtml(countyStat.ratioText || '0%')}</p>
    </div>
  `

  if (!infoWindow) {
    infoWindow = new amapSdk.InfoWindow({
      isCustom: false,
      offset: new amapSdk.Pixel(0, -20),
      autoMove: true,
    })
  }

  infoWindow.setContent(content)
  infoWindow.open(mapInstance, position)
  syncMapMarkers()
}

const syncEventMarkers = () => {
  if (!mapInstance || !amapSdk) {
    return
  }

  clearEventMarkers()
  if (!activeMapEvent.value) {
    return
  }

  const event = activeMapEvent.value
  const marker = new amapSdk.Marker({
    position: getCountyCenter(event.countyName),
    content: buildEventMarkerContent(event, getEventId(event) === selectedEventId.value),
    offset: new amapSdk.Pixel(-14, -14),
    extData: event,
  })

  marker.on('click', () => {
    const markerData = marker.getExtData()
    if (markerData) {
      openEventInfo(markerData)
    }
  })

  eventMarkers = [marker]
  mapInstance.add(eventMarkers)
}

const syncKeyUserCountyMarkers = () => {
  if (!mapInstance || !amapSdk) {
    return
  }

  clearKeyUserCountyMarkers()
  if (!showKeyUserDetailPage.value) {
    return
  }

  const markerList = keyUserCountyStats.value.map((countyStat) => {
    const marker = new amapSdk.Marker({
      position: getCountyCenter(countyStat.countyName),
      content: buildKeyUserCountyMarkerContent(countyStat, countyStat.countyName === selectedKeyUserCounty.value),
      offset: new amapSdk.Pixel(-12, -12),
      extData: countyStat,
      zIndex: countyStat.countyName === selectedKeyUserCounty.value ? 130 : 120,
    })

    marker.on('click', () => {
      const markerData = marker.getExtData()
      if (markerData) {
        openKeyUserCountyInfo(markerData)
      }
    })

    return marker
  })

  keyUserCountyMarkers = markerList
  if (markerList.length > 0) {
    mapInstance.add(markerList)
  }
}

const syncMapMarkers = () => {
  if (showKeyUserDetailPage.value) {
    clearEventMarkers()
    syncKeyUserCountyMarkers()
    return
  }

  clearKeyUserCountyMarkers()
  syncEventMarkers()
}

const applyTangshanHighlight = (AMap) =>
  new Promise((resolve, reject) => {
    AMap.plugin('AMap.DistrictSearch', () => {
      const districtSearch = new AMap.DistrictSearch({
        level: 'city',
        subdistrict: 0,
        extensions: 'all',
      })

      districtSearch.search('唐山市', (status, result) => {
        const boundaries = result?.districtList?.[0]?.boundaries || []
        if (status !== 'complete' || boundaries.length === 0) {
          reject(new Error('Failed to load Tangshan district boundary'))
          return
        }

        clearDistrictOverlays()

        const worldRing = [
          [-360, 90],
          [360, 90],
          [360, -90],
          [-360, -90],
        ]

        const dimPolygon = new AMap.Polygon({
          path: [worldRing, ...boundaries],
          strokeOpacity: 0,
          fillColor: '#000A19',
          fillOpacity: 0.48,
          zIndex: 80,
        })

        const highlightPolygons = boundaries.map((path) => {
          return new AMap.Polygon({
            path,
            strokeColor: '#5BC6FF',
            strokeWeight: 3,
            strokeOpacity: 0.95,
            fillColor: '#1A79DD',
            fillOpacity: 0.22,
            zIndex: 89,
          })
        })

        districtOverlays = [dimPolygon, ...highlightPolygons]
        mapInstance.add(districtOverlays)
        resolve()
      })
    })
  })

watch([activeMapEvent, selectedEventId], () => {
  syncMapMarkers()
})

onMounted(async () => {
  window.addEventListener('message', handleMapFrameMessage)
  await loadCountyList()
  await loadDashboardData()

  if (!mapRef.value) {
    return
  }

  try {
    mapError.value = ''
    const AMap = await loadAmapScript()
    amapSdk = AMap

    mapInstance = new AMap.Map(mapRef.value, {
      viewMode: '3D',
      center: tangshanCenter,
      zoom: 8.2,
      pitch: 36,
      mapStyle: 'amap://styles/blue',
      features: ['bg', 'road', 'building', 'point'],
      showLabel: true,
      dragEnable: true,
      zoomEnable: true,
      doubleClickZoom: true,
      scrollWheel: true,
      touchZoom: true,
    })

    mapInstance.setStatus({
      dragEnable: true,
      zoomEnable: true,
      doubleClickZoom: true,
      scrollWheel: true,
      touchZoom: true,
    })

    await applyTangshanHighlight(AMap)
    syncMapMarkers()
  } catch (error) {
    console.error(error)
    mapError.value = '地图初始化失败，请检查高德 Key 与网络连接。'
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleMapFrameMessage)
  if (outageDetailLayoutObserver) {
    outageDetailLayoutObserver.disconnect()
    outageDetailLayoutObserver = null
  }

  if (userDetailLayoutObserver) {
    userDetailLayoutObserver.disconnect()
    userDetailLayoutObserver = null
  }

  clearEventMarkers()
  clearKeyUserCountyMarkers()
  clearDistrictOverlays()

  if (infoWindow) {
    infoWindow.close()
    infoWindow = null
  }

  if (mapInstance) {
    mapInstance.destroy()
    mapInstance = null
  }

  amapSdk = null
})
</script>

<template>
  <div class="screen">
    <section class="map-stage map-stage-background">
      <iframe
        ref="mapFrameRef"
        class="map-container"
        src="/singleLineMap_mapOnly.html"
        title="唐山地图"
        loading="eager"
        style="border: 0"
        @load="handleMapFrameLoad"
      ></iframe>
    </section>

    <header class="topbar">
      <h1>用户侧停电影响智能评估与诉求分析系统</h1>
    </header>

    <main class="dashboard">
      <aside class="panel panel-left" :class="{ collapsed: isLeftCollapsed }">
        <button class="panel-toggle left-toggle" @click="toggleLeftPanel">
          {{ isLeftCollapsed ? '>' : '<' }}
        </button>

        <div v-show="!isLeftCollapsed" class="panel-inner">
          <section class="card module-card">
            <template v-if="activePageTab === 'outageUsers'">
              <div class="module-title-row">
                <h2>停电用户分析</h2>
                <span class="data-tag">{{ dataError ? '接口异常' : '实时接口' }}</span>
              </div>

              <UserTagModuleCard
                :tag-stats="tagStats"
                :user-tag-pie-data="userTagPieData"
                :show-user-detail-page="showUserDetailPage"
                :important-user-type-chart="importantUserTypeChart"
                :sensitive-user-type-chart="sensitiveUserTypeChart"
                :user-detail-type-options="USER_DETAIL_TYPE_OPTIONS"
                :user-detail-search-input="userDetailSearchInput"
                :user-detail-selected-type="userDetailSelectedType"
                :paged-user-detail-rows="pagedUserDetailRows"
                :filtered-user-detail-rows-length="filteredUserDetailRows.length"
                :user-detail-page-buttons="userDetailPageButtons"
                :user-detail-current-page="userDetailCurrentPage"
                :user-detail-jump-page-input="userDetailJumpPageInput"
                :user-detail-total-pages="userDetailTotalPages"
                :user-detail-modal-visible="userDetailModalVisible"
                :selected-user-detail="selectedUserDetail"
                :user-detail-grid-body-ref-setter="setUserDetailGridBodyRef"
                :user-detail-pagination-ref-setter="setUserDetailPaginationRef"
                :user-detail-page-jump-ref-setter="setUserDetailPageJumpRef"
                :show-key-user-detail-page="showKeyUserDetailPage"
                :key-user-industry-pie-data="keyUserIndustryPieData"
                :key-user-industry-pie-background="keyUserIndustryPieBackground"
                :key-user-industry-total="keyUserIndustryTotal"
                :sensitive-user-industry-pie-data="sensitiveUserIndustryPieData"
                :sensitive-user-industry-pie-background="sensitiveUserIndustryPieBackground"
                :sensitive-user-industry-total="sensitiveUserIndustryTotal"
                :key-user-nature-pie-data="keyUserNaturePieData"
                :key-user-nature-pie-background="keyUserNaturePieBackground"
                :key-user-search-input="keyUserDetailSearchInput"
                :key-user-filter-category="keyUserDetailSelectedFilterCategory"
                :key-user-filter-value="keyUserDetailSelectedFilterValue"
                :key-user-filter-category-options="keyUserFilterCategoryOptions"
                :key-user-filter-value-options="keyUserFilterValueOptions"
                :paged-key-user-rows="pagedKeyUserDetailRows"
                :filtered-key-user-rows-length="keyUserDetailTotal"
                :key-user-page-buttons="keyUserDetailPageButtons"
                :key-user-current-page="keyUserDetailCurrentPage"
                :key-user-jump-page-input="keyUserDetailJumpPageInput"
                :key-user-total-pages="keyUserDetailTotalPages"
                :key-user-detail-loading="keyUserDetailLoading"
                :key-user-detail-modal-visible="keyUserDetailModalVisible"
                :selected-key-user-detail="selectedKeyUserDetail"
                @open-user-detail="openUserDetailPage"
                @close-user-detail="closeUserDetailPage"
                @update:user-detail-search-input="userDetailSearchInput = $event"
                @apply-user-detail-search="applyUserDetailSearch"
                @update:user-detail-selected-type="userDetailSelectedType = $event"
                @open-user-detail-modal="openUserDetailModal"
                @go-user-detail-page="goUserDetailPage"
                @update:user-detail-jump-page-input="userDetailJumpPageInput = $event"
                @jump-to-user-detail-page="jumpToUserDetailPage"
                @close-user-detail-modal="closeUserDetailModal"
                @open-key-user-detail="openKeyUserDetailPage"
                @close-key-user-detail="closeKeyUserDetailPage"
                @update:key-user-search-input="keyUserDetailSearchInput = $event"
                @apply-key-user-search="applyKeyUserDetailSearch"
                @update:key-user-filter-category="keyUserDetailSelectedFilterCategory = $event"
                @update:key-user-filter-value="keyUserDetailSelectedFilterValue = $event"
                @open-key-user-modal="openKeyUserDetailModal"
                @go-key-user-page="goKeyUserDetailPage"
                @update:key-user-jump-page-input="keyUserDetailJumpPageInput = $event"
                @jump-to-key-user-page="jumpToKeyUserDetailPage"
                @close-key-user-modal="closeKeyUserDetailModal"
              />

              <KeyUserTimeTrendCard
                :start-time="queryStartTime"
                :end-time="queryEndTime"
                :county-id="selectedRegionCountyId"
                :outage-freq-data="countyOutageFreqData"
                :users="tagAndKeyUserSourceUsers"
                :time-segments="keyUserTimeTrend.labels"
                :time-sub-segments="keyUserTimeTrend.timeLabels"
                :sensitive-series="keyUserTimeTrend.sensitiveSeries"
                :important-series="keyUserTimeTrend.importantSeries"
                @open-detail-page="handleOpenTimeTrendDetailPage"
              />

              <KeyUserCountBarCard
                :rows="keyUserCountRows"
                :selected-region="selectedRegion"
                :detail-rows="countyEquipmentListRows"
                :table-rows="countyEquipmentPageRows"
                :table-total="countyEquipmentPageTotal"
                :summary-stats="countyEquipmentStatsSummary"
                :loading="spaceDistributionDetailLoading"
                @open-detail-page="handleOpenSpaceDistributionDetailPage"
                @go-detail-page="handleGoSpaceDistributionDetailPage"
                @close-detail-page="handleCloseSpaceDistributionDetailPage"
              />
            </template>
          </section>
        </div>
      </aside>

      <aside class="panel panel-right" :class="{ collapsed: isRightCollapsed }">
        <button class="panel-toggle right-toggle" @click="toggleRightPanel">
          {{ isRightCollapsed ? '<' : '>' }}
        </button>

        <div v-show="!isRightCollapsed" class="panel-inner">
          <section class="card module-card">
            <template v-if="activePageTab === 'outageUsers'">
              <CountyWarningLightsCard :county-warning-lights="countyWarningLights" :loading="loading" />

              <FaultLocationModuleCard
                :selected-fault-county="selectedRegion"
                :county-region-options="countyRegionOptions"
                :fault-location-summary="faultLocationSummary"
                :filtered-fault-outage-events-length="filteredFaultOutageEvents.length"
                :show-outage-detail-page="showOutageDetailPage"
                :outage-nature-overview="outageNatureOverview"
                :outage-restore-overview="outageRestoreOverview"
                :outage-detail-search-input="outageDetailSearchInput"
                :outage-detail-selected-nature="outageDetailSelectedNature"
                :paged-outage-detail-rows="pagedOutageDetailRows"
                :filtered-outage-detail-rows-length="outageDetailTotal"
                :outage-detail-page-buttons="outageDetailPageButtons"
                :outage-detail-current-page="outageDetailCurrentPage"
                :outage-detail-jump-page-input="outageDetailJumpPageInput"
                :outage-detail-total-pages="outageDetailTotalPages"
                :outage-detail-loading="outageDetailLoading"
                :outage-detail-modal-visible="outageDetailModalVisible"
                :selected-outage-detail="selectedOutageDetail"
                :outage-detail-grid-body-ref-setter="setOutageDetailGridBodyRef"
                :outage-detail-pagination-ref-setter="setOutageDetailPaginationRef"
                :outage-detail-page-jump-ref-setter="setOutageDetailPageJumpRef"
                @update:selected-fault-county="selectedRegion = $event"
                @open-outage-detail="openOutageDetailPage"
                @fault-mode-change="handleFaultLocationModeChange"
                @close-outage-detail="closeOutageDetailPage"
                @update:outage-detail-search-input="outageDetailSearchInput = $event"
                @apply-outage-detail-search="applyOutageDetailSearch"
                @update:outage-detail-selected-nature="outageDetailSelectedNature = $event"
                @open-outage-detail-modal="openOutageDetailModal"
                @go-outage-detail-page="goOutageDetailPage"
                @update:outage-detail-jump-page-input="outageDetailJumpPageInput = $event"
                @jump-to-outage-detail-page="jumpToOutageDetailPage"
                @close-outage-detail-modal="closeOutageDetailModal"
              />

              <OutageRangeAssessmentCard
                :outage-summary="outageSummary"
                :outage-range-chains="outageRangeChains"
                :outage-range-total="outageRangeChainsTotal"
                :outage-range-current-page="outageRangeChainsCurrentPage"
                :outage-range-loading="outageRangeChainsLoading"
                :show-outage-range-assessment-page="showOutageRangeAssessmentPage"
                @open-outage-range-detail="openOutageRangeAssessmentPage"
                @go-outage-range-page="goOutageRangeAssessmentPage"
                @close-outage-range-detail="closeOutageRangeAssessmentPage"
              />
            </template>
          </section>
        </div>
      </aside>

      <section class="global-filter-bar">
        <div class="page-tab-switch">
          <button
            type="button"
            class="page-tab-btn"
            :class="{ active: activePageTab === 'outageUsers' }"
            @click="switchPageTab('outageUsers')"
          >
            停电用户
          </button>
          <button
            type="button"
            class="page-tab-btn"
            :class="{ active: activePageTab === 'sensitiveDemand' }"
            @click="switchPageTab('sensitiveDemand')"
          >
            敏感诉求
          </button>
        </div>

        <label class="global-county-field">
          <select v-model="selectedRegion" class="region-select global-county-select">
            <option v-for="item in regionOptions" :key="`global-county-${item}`" :value="item">{{ item }}</option>
          </select>
        </label>

        <div class="time-filter-bar global-time-filter">
          <label class="time-filter-field">
            <input v-model="queryStartTime" type="datetime-local" class="time-filter-input" />
          </label>
          <label class="time-filter-field">
            <input v-model="queryEndTime" type="datetime-local" class="time-filter-input" />
          </label>
          <button type="button" class="user-detail-query-btn" :disabled="loading" @click="applyTimeFilter">
            {{ loading ? '查询中...' : '查询' }}
          </button>
        </div>
      </section>

      <section class="dashboard-spacer"></section>
    </main>

  </div>
</template>

