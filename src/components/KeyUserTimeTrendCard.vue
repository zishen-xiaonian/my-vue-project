<script setup>
import { computed, ref, watch } from 'vue'
import { queryCountyUserOutageDetail, queryCountyUserOutageStats } from '../api/outage'

const props = defineProps({
  startTime: {
    type: [String, Date],
    default: '',
  },
  endTime: {
    type: [String, Date],
    default: '',
  },
  countyId: {
    type: String,
    default: '',
  },
  outageFreqData: {
    type: Object,
    default: null,
  },
  outageFreqLoading: {
    type: Boolean,
    default: false,
  },
  users: {
    type: Array,
    default: () => [],
  },
  timeSegments: {
    type: Array,
    default: () => [],
  },
  timeSubSegments: {
    type: Array,
    default: () => [],
  },
  sensitiveSeries: {
    type: Array,
    default: () => [],
  },
  importantSeries: {
    type: Array,
    default: () => [],
  },
  title: {
    type: String,
    default: '时间趋势',
  },
  sensitiveLabel: {
    type: String,
    default: '敏感用户',
  },
  importantLabel: {
    type: String,
    default: '重要用户',
  },
  loading: {
    type: Boolean,
    default: false,
  },
})
const emit = defineEmits(['open-detail-page'])

const DEFAULT_SEGMENT_COUNT = 5
const DEFAULT_POINT_COUNT = DEFAULT_SEGMENT_COUNT + 1
const SVG_WIDTH = 720
const SVG_HEIGHT = 260
const CHART_PADDING = {
  top: 18,
  right: 12,
  bottom: 88,
  left: 52,
}

const DETAIL_PAGE_SIZE = 7
const DETAIL_PAGE_MAX_BUTTONS = 7
const defaultTangshanCityId = '1100F3DE22316FADE050007F01006CBE'
const countyListCityId = import.meta.env.VITE_TANGSHAN_CITY_ID || defaultTangshanCityId

const detailPageVisible = ref(false)
const detailSearchInput = ref('')
const detailSearchKeyword = ref('')
const detailOutageCountFilter = ref('all')
const detailCurrentPage = ref(1)
const detailJumpPageInput = ref('')
const detailModalVisible = ref(false)
const detailModalViewportCentered = ref(false)
const selectedUserDetail = ref(null)
const detailModalLoading = ref(false)
const detailModalError = ref('')
const detailModalRequestId = ref(0)
const detailTableRows = ref([])
const detailTableTotal = ref(0)
const detailTablePerPage = ref(DETAIL_PAGE_SIZE)
const detailTableLoading = ref(false)
const detailTableError = ref('')
const detailTableRequestId = ref(0)
const timeDetailModalVisible = ref(false)
const timeDetailRangeFilter = ref('2')
const timeDetailOutageCountFilter = ref('all')
const timeDetailCurrentPage = ref(1)
const timeDetailJumpPageInput = ref('')
const timeDetailTableRows = ref([])
const timeDetailTableTotal = ref(0)
const timeDetailTablePerPage = ref(DETAIL_PAGE_SIZE)
const timeDetailTableLoading = ref(false)
const timeDetailTableError = ref('')
const timeDetailTableRequestId = ref(0)

const toDate = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const text = String(value ?? '').trim()
  if (!text) {
    return null
  }

  const normalized = text.replace(' ', 'T')
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

const toText = (value, fallback = '-') => {
  const text = String(value ?? '').trim()
  return text || fallback
}

const readFieldValue = (record, keys = []) => {
  if (!record || typeof record !== 'object') {
    return ''
  }

  for (const key of keys) {
    const direct = record?.[key]
    if (direct !== undefined && direct !== null && String(direct).trim() !== '') {
      return direct
    }
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

const formatTimeLabel = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '--:--'
  }
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}

const formatDateTimeLabel = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '-'
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

const toBackendDateTime = (value) => {
  if (value instanceof Date) {
    return formatDateTimeLabel(value)
  }

  const text = String(value ?? '').trim()
  if (!text) {
    return ''
  }

  const normalized = text.replace('T', ' ')
  return normalized.length === 16 ? `${normalized}:00` : normalized
}

const shiftDateByMonths = (value, monthOffset) => {
  const date = new Date(value.getTime())
  const day = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + monthOffset)
  const monthLastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, monthLastDay))
  return date
}

const resolveTimeDetailRange = () => {
  const start = toDate(props.startTime)
  const now = new Date()
  if (!start || Number.isNaN(now.getTime())) {
    return null
  }

  const fullRange = {
    beginTime: toBackendDateTime(props.startTime),
    endTime: formatDateTimeLabel(now),
  }
  if (!fullRange.beginTime || !fullRange.endTime || timeDetailRangeFilter.value === 'all') {
    return fullRange
  }

  const monthCount = Number(timeDetailRangeFilter.value)
  if (Number.isFinite(monthCount) && monthCount > 0) {
    return {
      beginTime: formatDateTimeLabel(shiftDateByMonths(now, -monthCount)),
      endTime: fullRange.endTime,
    }
  }

  const threeMonthCutoff = shiftDateByMonths(now, -3)
  if (threeMonthCutoff.getTime() <= start.getTime()) {
    return null
  }

  return {
    beginTime: fullRange.beginTime,
    endTime: formatDateTimeLabel(threeMonthCutoff),
  }
}

const toCountArray = (values, length) =>
  Array.from({ length }, (_, index) => Math.max(Number(values?.[index]) || 0, 0))

const isSensitiveUser = (record) => {
  if (record?.isSensitive === true) {
    return true
  }

  const levelText = String(record?.keyUserLevel || record?.userLevel || record?.label || '').trim()
  return levelText.includes('敏感')
}

const isImportantUser = (record) => {
  if (record?.isImportant === true) {
    return true
  }

  const levelText = String(record?.keyUserLevel || record?.userLevel || record?.label || '').trim()
  return levelText.includes('重点') || levelText.includes('重要')
}

const pickUserTime = (record) => {
  const keys = [
    'ctime',
    'beginTime',
    'begin_time',
    'outageBeginTime',
    'outage_begin_time',
    'eventTime',
    'event_time',
    'statTime',
    'stat_time',
  ]

  for (const key of keys) {
    const value = record?.[key]
    if (value === undefined || value === null || String(value).trim() === '') {
      continue
    }
    const date = toDate(value)
    if (date) {
      return date
    }
  }

  return null
}

const pickUserBeginTime = (record) =>
  readFieldValue(record, [
    'ctime',
    'beginTime',
    'begin_time',
    'outageBeginTime',
    'outage_begin_time',
    'eventTime',
    'event_time',
    'statTime',
    'stat_time',
  ])

const pickUserEndTime = (record) =>
  readFieldValue(record, [
    'endTime',
    'end_time',
    'outageEndTime',
    'outage_end_time',
    'restoreTime',
    'restore_time',
  ])

const resolvePointCount = computed(() => {
  const providedLength = Math.max(
    Number(props.timeSegments?.length) || 0,
    Number(props.sensitiveSeries?.length) || 0,
    Number(props.importantSeries?.length) || 0,
  )
  return providedLength >= 2 ? providedLength : DEFAULT_POINT_COUNT
})

const buildDefaultTimePoints = (start, end, pointCount) => {
  if (!start || !end || start.getTime() >= end.getTime()) {
    return Array.from({ length: pointCount }, (_, index) => `时间点${index + 1}`)
  }

  const totalSpan = end.getTime() - start.getTime()
  const step = totalSpan / (pointCount - 1)

  return Array.from({ length: pointCount }, (_, index) =>
    formatTimeLabel(new Date(start.getTime() + step * index)),
  )
}

const chartSourceData = computed(() => {
  const pointCount = resolvePointCount.value
  const start = toDate(props.startTime)
  const end = toDate(props.endTime)
  const labels =
    props.timeSegments.length === pointCount ? props.timeSegments : buildDefaultTimePoints(start, end, pointCount)
  const timeLabels =
    props.timeSubSegments.length === pointCount
      ? props.timeSubSegments
      : Array.from({ length: pointCount }, () => '--:--')

  if (props.sensitiveSeries.length > 0 || props.importantSeries.length > 0) {
    return {
      labels,
      timeLabels,
      sensitiveCounts: toCountArray(props.sensitiveSeries, pointCount),
      importantCounts: toCountArray(props.importantSeries, pointCount),
    }
  }

  if (!start || !end || start.getTime() >= end.getTime()) {
    return {
      labels,
      timeLabels,
      sensitiveCounts: toCountArray([], pointCount),
      importantCounts: toCountArray([], pointCount),
    }
  }

  const segmentCount = pointCount - 1
  const totalSpan = end.getTime() - start.getTime()
  const step = totalSpan / segmentCount
  const sensitiveCounts = toCountArray([], pointCount)
  const importantCounts = toCountArray([], pointCount)

  props.users.forEach((item) => {
    const record = item || {}
    const userTime = pickUserTime(record)
    if (!userTime) {
      return
    }

    const timestamp = userTime.getTime()
    const startMs = start.getTime()
    const endMs = end.getTime()
    if (timestamp < startMs || timestamp > endMs) {
      return
    }

    const rawIndex = timestamp === endMs ? segmentCount - 1 : Math.floor((timestamp - startMs) / step)
    const segmentIndex = Math.min(segmentCount - 1, Math.max(0, rawIndex))
    const pointIndex = segmentIndex + 1

    if (isSensitiveUser(record)) {
      sensitiveCounts[pointIndex] += 1
    }
    if (isImportantUser(record)) {
      importantCounts[pointIndex] += 1
    }
  })

  for (let i = 1; i < pointCount; i += 1) {
    sensitiveCounts[i] += sensitiveCounts[i - 1]
    importantCounts[i] += importantCounts[i - 1]
  }

  return {
    labels,
    timeLabels,
    sensitiveCounts,
    importantCounts,
  }
})

const yAxisMax = computed(() => {
  const allValues = [...chartSourceData.value.sensitiveCounts, ...chartSourceData.value.importantCounts]
  const maxValue = Math.max(...allValues, 0)
  if (maxValue <= 0) {
    return 4
  }
  const step = Math.max(1, Math.ceil(maxValue / 4))
  return step * 4
})

const yAxisStep = computed(() => Math.max(1, yAxisMax.value / 4))

const plotWidth = SVG_WIDTH - CHART_PADDING.left - CHART_PADDING.right
const plotHeight = SVG_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom

const calcX = (index, pointCount) => {
  if (pointCount <= 1) {
    return CHART_PADDING.left
  }
  return CHART_PADDING.left + (plotWidth * index) / (pointCount - 1)
}

const calcY = (value) => CHART_PADDING.top + plotHeight - (Math.max(value, 0) / yAxisMax.value) * plotHeight

const yTicks = computed(() =>
  Array.from({ length: 5 }, (_, index) => {
    const value = yAxisMax.value - yAxisStep.value * index
    return {
      value: Math.round(value),
      y: CHART_PADDING.top + (plotHeight * index) / 4,
    }
  }),
)

const sensitivePoints = computed(() => {
  const pointCount = chartSourceData.value.labels.length
  return chartSourceData.value.sensitiveCounts.map((value, index) => ({
    value,
    label: chartSourceData.value.labels[index] || `时间点${index + 1}`,
    timeLabel: chartSourceData.value.timeLabels[index] || '--:--',
    x: calcX(index, pointCount),
    y: calcY(value),
  }))
})

const importantPoints = computed(() => {
  const pointCount = chartSourceData.value.labels.length
  return chartSourceData.value.importantCounts.map((value, index) => ({
    value,
    label: chartSourceData.value.labels[index] || `时间点${index + 1}`,
    timeLabel: chartSourceData.value.timeLabels[index] || '--:--',
    x: calcX(index, pointCount),
    y: calcY(value),
  }))
})

const getXAxisLabelAnchor = (index, total) => {
  if (index === 0) {
    return 'start'
  }
  if (index === total - 1) {
    return 'end'
  }
  return 'middle'
}

const getXAxisLabelOffsetX = (index, total) => {
  if (total < 6) {
    return 0
  }
  if (index === 0) {
    return -8
  }
  if (index === 1) {
    return 8
  }
  if (index === total - 2) {
    return -8
  }
  if (index === total - 1) {
    return 8
  }
  return 0
}

const pointsToPath = (points) =>
  points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')

const sensitivePath = computed(() => pointsToPath(sensitivePoints.value))
const importantPath = computed(() => pointsToPath(importantPoints.value))

const inRange = (time, start, end) => {
  if (!(time instanceof Date) || Number.isNaN(time.getTime())) {
    return false
  }
  if (start && time.getTime() < start.getTime()) {
    return false
  }
  if (end && time.getTime() > end.getTime()) {
    return false
  }
  return true
}

const buildPeriodText = (beginRaw, endRaw) => {
  const beginDate = toDate(beginRaw)
  const endDate = toDate(endRaw)
  const beginText = beginDate ? formatDateTimeLabel(beginDate) : toText(beginRaw)
  const endText = endDate ? formatDateTimeLabel(endDate) : (toText(endRaw, '') || '未复电')
  return `${beginText} ~ ${endText}`
}

const buildUserOutageRows = (matchUser) => {
  const start = toDate(props.startTime)
  const end = toDate(props.endTime)
  const grouped = new Map()

  props.users.forEach((rawItem, index) => {
    const record = rawItem && typeof rawItem === 'object' ? rawItem : {}
    if (!matchUser(record)) {
      return
    }

    const beginRaw = pickUserBeginTime(record)
    const beginDate = toDate(beginRaw)
    if (start && end && start.getTime() < end.getTime() && !inRange(beginDate, start, end)) {
      return
    }

    const consNo = toText(readFieldValue(record, ['consNo', 'cons_no', 'userNo', 'userId', 'consumerNo']), '')
    const consName = toText(readFieldValue(record, ['consName', 'cons_name', 'name', 'userName', 'orgName']), '')
    const fallbackNo = toText(readFieldValue(record, ['outageNumber', 'id']), '')
    const fallbackName = toText(readFieldValue(record, ['rdtFeederName', 'faultEquipName']), '')
    const userId = consNo || fallbackNo || `用户${index + 1}`
    const userName = consName || fallbackName || userId
    const userKey = `${userId}|${userName}`

    if (!grouped.has(userKey)) {
      grouped.set(userKey, {
        id: userKey,
        consNo: consNo || '-',
        consName: userName || '-',
        userLevel: isSensitiveUser(record) ? '敏感' : '重点',
        countyName: toText(readFieldValue(record, ['countyName', 'county_name', 'rdtCountyName', 'rdt_county_name'])),
        tradeName: toText(readFieldValue(record, ['tradeName', 'trade_name', 'tradeTypeName', 'industryName'])),
        consAddr: toText(readFieldValue(record, ['consAddr', 'cons_addr', 'consAddress', 'address'])),
        consTypeName: toText(readFieldValue(record, ['consTypeName', 'cons_type_name', 'consType'])),
        outageEvents: [],
        outageEventKeys: new Set(),
      })
    }

    const row = grouped.get(userKey)
    row.userLevel = isSensitiveUser(record) ? '敏感' : row.userLevel

    const endRaw = pickUserEndTime(record)
    const outageNumber = toText(readFieldValue(record, ['outageNumber', 'outage_number', 'eventNo', 'event_id', 'id']), '-')
    const periodText = buildPeriodText(beginRaw, endRaw)
    const eventKey = `${outageNumber}|${periodText}`
    if (row.outageEventKeys.has(eventKey)) {
      return
    }
    row.outageEventKeys.add(eventKey)

    row.outageEvents.push({
      eventKey,
      outageNumber,
      periodText,
      beginTime: toDate(beginRaw) ? formatDateTimeLabel(toDate(beginRaw)) : toText(beginRaw),
      endTime: toDate(endRaw) ? formatDateTimeLabel(toDate(endRaw)) : (toText(endRaw, '') || '未复电'),
      outageNature: toText(readFieldValue(record, ['outageNature', 'outage_nature'])),
      equipmentName: toText(readFieldValue(record, ['equipmentName', 'equipment_name', 'faultEquipName'])),
      feederName: toText(readFieldValue(record, ['rdtFeederName', 'rdt_feeder_name', 'feederName'])),
      maintGroupName: toText(readFieldValue(record, ['maintGroupName', 'maint_group_name'])),
    })
  })

  return Array.from(grouped.values())
    .map((row) => {
      const sortedEvents = row.outageEvents.slice().sort((a, b) => String(b.beginTime).localeCompare(String(a.beginTime)))
      return {
        ...row,
        outageCount: sortedEvents.length,
        outagePeriodsText: sortedEvents.map((item) => item.periodText).join('；'),
        outageEvents: sortedEvents,
      }
    })
    .sort((a, b) => {
      if (b.outageCount !== a.outageCount) {
        return b.outageCount - a.outageCount
      }
      return String(a.consName).localeCompare(String(b.consName), 'zh-CN')
    })
}

const importantUserOutageRows = computed(() => buildUserOutageRows((record) => isImportantUser(record)))
const sensitiveUserOutageRows = computed(() => buildUserOutageRows((record) => isSensitiveUser(record)))

const DETAIL_OUTAGE_BUCKETS = [
  {
    key: '1',
    label: '1次',
    color: '#58e7a2',
    match: (count) => count === 1,
  },
  {
    key: '2',
    label: '2次',
    color: '#ffd35d',
    match: (count) => count === 2,
  },
  {
    key: '3+',
    label: '3次及以上',
    color: '#ff6363',
    match: (count) => count >= 3,
  },
]

const buildOutagePieSummary = (rows = []) => {
  const totalUsers = rows.length
  return DETAIL_OUTAGE_BUCKETS.map((bucket) => {
    const count = rows.filter((item) => bucket.match(item.outageCount)).length
    const rate = totalUsers > 0 ? Number(((count / totalUsers) * 100).toFixed(1)) : 0
    return {
      key: bucket.key,
      label: bucket.label,
      color: bucket.color,
      count,
      rate,
      rateText: `${rate.toFixed(1)}%`,
    }
  })
}

const toNonNegativeNumber = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null
  }
  return numeric
}

const resolveOutageBucketKey = (label, index) => {
  const text = String(label || '').trim()
  if (text.includes('3') || text.includes('+') || text.includes('以上')) {
    return '3+'
  }
  if (text.includes('2')) {
    return '2'
  }
  if (text.includes('1')) {
    return '1'
  }

  if (index === 0) {
    return '1'
  }
  if (index === 1) {
    return '2'
  }
  return '3+'
}

const buildOutagePieSummaryFromApi = (group) => {
  const distribution = Array.isArray(group?.distribution) ? group.distribution : null
  if (!distribution) {
    return null
  }

  const total = toNonNegativeNumber(group?.total) ?? 0
  const countMap = new Map(DETAIL_OUTAGE_BUCKETS.map((item) => [item.key, 0]))
  const rateMap = new Map()

  distribution.forEach((item, index) => {
    const key = resolveOutageBucketKey(item?.label, index)
    if (!countMap.has(key)) {
      return
    }
    const count = toNonNegativeNumber(item?.count) ?? 0
    countMap.set(key, count)
    const percentage = toNonNegativeNumber(item?.percentage)
    if (percentage !== null) {
      rateMap.set(key, percentage)
    }
  })

  return DETAIL_OUTAGE_BUCKETS.map((bucket) => {
    const count = countMap.get(bucket.key) ?? 0
    const rawRate = rateMap.has(bucket.key)
      ? rateMap.get(bucket.key)
      : (total > 0 ? (count / total) * 100 : 0)
    const rate = Number(rawRate.toFixed(1))
    return {
      key: bucket.key,
      label: bucket.label,
      color: bucket.color,
      count,
      rate,
      rateText: `${rate.toFixed(1)}%`,
    }
  })
}

const buildOutagePieBackground = (items = []) => {
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

const importantOutagePieSummary = computed(() => {
  const apiSummary = buildOutagePieSummaryFromApi(props.outageFreqData?.keyUsers)
  return apiSummary || buildOutagePieSummary(importantUserOutageRows.value)
})
const sensitiveOutagePieSummary = computed(() => {
  const apiSummary = buildOutagePieSummaryFromApi(props.outageFreqData?.sensitiveUsers)
  return apiSummary || buildOutagePieSummary(sensitiveUserOutageRows.value)
})
const importantOutagePieBackground = computed(() => buildOutagePieBackground(importantOutagePieSummary.value))
const sensitiveOutagePieBackground = computed(() => buildOutagePieBackground(sensitiveOutagePieSummary.value))
const importantOutageTotal = computed(() => {
  const apiTotal = toNonNegativeNumber(props.outageFreqData?.keyUsers?.total)
  if (apiTotal !== null) {
    return Math.round(apiTotal)
  }
  return importantUserOutageRows.value.length
})
const sensitiveOutageTotal = computed(() => {
  const apiTotal = toNonNegativeNumber(props.outageFreqData?.sensitiveUsers?.total)
  if (apiTotal !== null) {
    return Math.round(apiTotal)
  }
  return sensitiveUserOutageRows.value.length
})

const mapDetailTableRow = (record, index, page = detailCurrentPage.value) => {
  const consNo = toText(readFieldValue(record, ['consNo', 'cons_no', 'userNo', 'userId', 'consumerNo']))
  const consName = toText(readFieldValue(record, ['consName', 'cons_name', 'name', 'userName', 'orgName']))
  const outageCount = Math.max(Number(readFieldValue(record, ['outageCount', 'outage_count'])) || 0, 0)
  const outagePeriodsText = toText(
    readFieldValue(record, [
      'outagePeriodsText',
      'outagePeriodText',
      'outagePeriods',
      'outageTimePeriods',
      'outagePeriod',
      'periodText',
    ]),
    '-',
  )
  const outageEvents = Array.isArray(record?.outageEvents) ? record.outageEvents : []
  const id = `${consNo}-${consName}-${page}-${index + 1}`

  return {
    id,
    consNo,
    consName,
    userLevel: toText(readFieldValue(record, ['userLevel', 'keyUserLevel', 'label', 'level'])),
    countyName: toText(readFieldValue(record, ['countyName', 'county_name', 'rdtCountyName', 'rdt_county_name'])),
    tradeName: toText(readFieldValue(record, ['tradeName', 'trade_name', 'tradeTypeName', 'industryName'])),
    consAddr: toText(readFieldValue(record, ['consAddr', 'cons_addr', 'consAddress', 'address'])),
    consTypeName: toText(readFieldValue(record, ['consTypeName', 'cons_type_name', 'consType'])),
    outageCount,
    outagePeriodsText,
    outageEvents,
  }
}

const mapDetailOutageEvents = (outages) =>
  (Array.isArray(outages) ? outages : []).map((item, index) => {
    const outageNumber = toText(readFieldValue(item, ['outageNumber', 'outage_number', 'eventNo', 'event_id', 'id']), '-')
    const beginTime = toText(readFieldValue(item, ['beginTime', 'begin_time', 'outageBeginTime']), '-')
    const endTimeRaw = toText(readFieldValue(item, ['endTime', 'end_time', 'outageEndTime']), '')
    const endTime = endTimeRaw || '未复电'
    return {
      eventKey: `${outageNumber}|${beginTime}|${endTime}|${index + 1}`,
      outageNumber,
      periodText: `${beginTime} ~ ${endTime}`,
      beginTime,
      endTime,
    }
  })

const mapUserOutageDetailData = (detailData, fallbackRow = null) => {
  const outages = mapDetailOutageEvents(detailData?.outages)
  const fallbackOutageCount = Number(fallbackRow?.outageCount) || 0
  const resolvedOutageCount = Number(readFieldValue(detailData, ['outageCount', 'outage_count']))

  return {
    id: fallbackRow?.id || `user-detail-${Date.now()}`,
    consNo: toText(readFieldValue(detailData, ['consNo', 'cons_no']), fallbackRow?.consNo || '-'),
    consName: toText(readFieldValue(detailData, ['consName', 'cons_name']), fallbackRow?.consName || '-'),
    userLevel: toText(fallbackRow?.userLevel || ''),
    outageCount: Number.isFinite(resolvedOutageCount) && resolvedOutageCount >= 0
      ? resolvedOutageCount
      : Math.max(fallbackOutageCount, outages.length),
    countyName: toText(readFieldValue(detailData, ['countyName', 'county_name']), fallbackRow?.countyName || '-'),
    tradeName: toText(
      readFieldValue(detailData, ['tradeName', 'trade_name', 'tradeTypeName', 'industryName']),
      fallbackRow?.tradeName || '-',
    ),
    consAddr: toText(readFieldValue(detailData, ['consAddr', 'cons_addr', 'consAddress', 'address']), fallbackRow?.consAddr || '-'),
    consTypeName: toText(fallbackRow?.consTypeName || '-'),
    outageEvents: outages,
  }
}

const loadDetailTableRows = async (targetPage = detailCurrentPage.value) => {
  const beginTime = toBackendDateTime(props.startTime)
  const endTime = toBackendDateTime(props.endTime)
  if (!beginTime || !endTime) {
    detailTableRows.value = []
    detailTableTotal.value = 0
    detailTablePerPage.value = DETAIL_PAGE_SIZE
    detailTableLoading.value = false
    detailTableError.value = ''
    return
  }

  const payload = {
    beginTime,
    endTime,
    userLevel: 'key_sensitive',
    page: Math.max(1, Number(targetPage) || 1),
    perPage: DETAIL_PAGE_SIZE,
  }
  const countyId = String(props.countyId || '').trim()
  if (countyId) {
    payload.countyId = countyId
  } else if (countyListCityId) {
    payload.cityId = countyListCityId
  }

  const keyword = detailSearchKeyword.value.trim()
  if (keyword) {
    payload.keyword = keyword
  }

  if (detailOutageCountFilter.value === '1' || detailOutageCountFilter.value === '2' || detailOutageCountFilter.value === '3+') {
    payload.outageCount = detailOutageCountFilter.value
  }

  const requestId = detailTableRequestId.value + 1
  detailTableRequestId.value = requestId
  detailTableLoading.value = true
  detailTableError.value = ''
  detailTableRows.value = []

  try {
    const response = await queryCountyUserOutageStats(payload)
    if (requestId !== detailTableRequestId.value) {
      return
    }

    const data = response?.data || {}
    const list = Array.isArray(data?.list) ? data.list : []
    const total = Math.max(Number(data?.total) || 0, 0)
    const page = Math.max(Number(data?.page) || payload.page, 1)
    const perPage = Math.max(Number(data?.perPage) || payload.perPage, 1)

    detailCurrentPage.value = page
    detailTablePerPage.value = perPage
    detailTableTotal.value = total
    detailTableRows.value = list.map((item, index) => mapDetailTableRow(item, index))
  } catch {
    if (requestId !== detailTableRequestId.value) {
      return
    }
    detailTableRows.value = []
    detailTableTotal.value = 0
    detailTablePerPage.value = DETAIL_PAGE_SIZE
    detailTableError.value = '重点用户停电明细加载失败，请稍后重试。'
  } finally {
    if (requestId === detailTableRequestId.value) {
      detailTableLoading.value = false
    }
  }
}

const loadTimeDetailTableRows = async (targetPage = timeDetailCurrentPage.value) => {
  const queryRange = resolveTimeDetailRange()
  if (!queryRange?.beginTime || !queryRange?.endTime) {
    timeDetailTableRows.value = []
    timeDetailTableTotal.value = 0
    timeDetailTablePerPage.value = DETAIL_PAGE_SIZE
    timeDetailTableLoading.value = false
    timeDetailTableError.value = ''
    return
  }

  const payload = {
    ...queryRange,
    userLevel: 'key_sensitive',
    page: Math.max(1, Number(targetPage) || 1),
    perPage: DETAIL_PAGE_SIZE,
  }
  const countyId = String(props.countyId || '').trim()
  if (countyId) {
    payload.countyId = countyId
  } else if (countyListCityId) {
    payload.cityId = countyListCityId
  }

  if (
    timeDetailOutageCountFilter.value === '1' ||
    timeDetailOutageCountFilter.value === '2' ||
    timeDetailOutageCountFilter.value === '3+'
  ) {
    payload.outageCount = timeDetailOutageCountFilter.value
  }

  const requestId = timeDetailTableRequestId.value + 1
  timeDetailTableRequestId.value = requestId
  timeDetailTableLoading.value = true
  timeDetailTableError.value = ''
  timeDetailTableRows.value = []

  try {
    const response = await queryCountyUserOutageStats(payload)
    if (requestId !== timeDetailTableRequestId.value) {
      return
    }

    const data = response?.data || {}
    const list = Array.isArray(data?.list) ? data.list : []
    const total = Math.max(Number(data?.total) || 0, 0)
    const page = Math.max(Number(data?.page) || payload.page, 1)
    const perPage = Math.max(Number(data?.perPage) || payload.perPage, 1)

    timeDetailCurrentPage.value = page
    timeDetailTablePerPage.value = perPage
    timeDetailTableTotal.value = total
    timeDetailTableRows.value = list.map((item, index) => mapDetailTableRow(item, index, page))
  } catch {
    if (requestId !== timeDetailTableRequestId.value) {
      return
    }
    timeDetailTableRows.value = []
    timeDetailTableTotal.value = 0
    timeDetailTablePerPage.value = DETAIL_PAGE_SIZE
    timeDetailTableError.value = '时间详情加载失败，请稍后重试。'
  } finally {
    if (requestId === timeDetailTableRequestId.value) {
      timeDetailTableLoading.value = false
    }
  }
}

const detailTotalPages = computed(() => {
  if (detailTableTotal.value <= 0) {
    return 1
  }
  return Math.max(Math.ceil(detailTableTotal.value / detailTablePerPage.value), 1)
})

const pagedImportantUserOutageRows = computed(() => detailTableRows.value)
const pagedTimeDetailRows = computed(() => timeDetailTableRows.value)

const detailPageButtons = computed(() => {
  const total = detailTotalPages.value
  if (total <= DETAIL_PAGE_MAX_BUTTONS) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const half = Math.floor(DETAIL_PAGE_MAX_BUTTONS / 2)
  let start = detailCurrentPage.value - half
  let end = detailCurrentPage.value + half
  if (start < 1) {
    start = 1
    end = DETAIL_PAGE_MAX_BUTTONS
  }
  if (end > total) {
    end = total
    start = total - DETAIL_PAGE_MAX_BUTTONS + 1
  }

  const pages = []
  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }
  return pages
})

const timeDetailTotalPages = computed(() => {
  if (timeDetailTableTotal.value <= 0) {
    return 1
  }
  return Math.max(Math.ceil(timeDetailTableTotal.value / timeDetailTablePerPage.value), 1)
})

const timeDetailPageButtons = computed(() => {
  const total = timeDetailTotalPages.value
  if (total <= DETAIL_PAGE_MAX_BUTTONS) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const half = Math.floor(DETAIL_PAGE_MAX_BUTTONS / 2)
  let start = timeDetailCurrentPage.value - half
  let end = timeDetailCurrentPage.value + half
  if (start < 1) {
    start = 1
    end = DETAIL_PAGE_MAX_BUTTONS
  }
  if (end > total) {
    end = total
    start = total - DETAIL_PAGE_MAX_BUTTONS + 1
  }

  const pages = []
  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }
  return pages
})

const openDetailPage = () => {
  detailPageVisible.value = true
  emit('open-detail-page')
  void loadDetailTableRows(1)
}

const closeDetailPage = () => {
  detailPageVisible.value = false
  detailTableRequestId.value += 1
  detailTableLoading.value = false
  detailModalRequestId.value += 1
  detailModalLoading.value = false
  detailModalError.value = ''
  detailModalVisible.value = false
  detailModalViewportCentered.value = false
  selectedUserDetail.value = null
  timeDetailTableRequestId.value += 1
  timeDetailTableLoading.value = false
  timeDetailModalVisible.value = false
}

const applyDetailSearch = () => {
  detailSearchKeyword.value = detailSearchInput.value.trim()
  detailJumpPageInput.value = ''
  goDetailPage(1)
}

const goDetailPage = (page) => {
  if (!Number.isFinite(page)) {
    return
  }
  const target = Math.max(1, Math.min(detailTotalPages.value, page))
  detailCurrentPage.value = target
  detailJumpPageInput.value = ''
  if (detailPageVisible.value) {
    void loadDetailTableRows(target)
  }
}

const jumpToDetailPage = () => {
  const input = String(detailJumpPageInput.value ?? '').trim()
  if (!input) {
    return
  }
  const parsed = Number(input)
  if (!Number.isFinite(parsed)) {
    return
  }
  goDetailPage(Math.round(parsed))
}

const openTimeDetailModal = () => {
  timeDetailRangeFilter.value = '2'
  timeDetailOutageCountFilter.value = 'all'
  timeDetailCurrentPage.value = 1
  timeDetailJumpPageInput.value = ''
  timeDetailModalVisible.value = true
  void loadTimeDetailTableRows(1)
}

const closeTimeDetailModal = () => {
  timeDetailTableRequestId.value += 1
  timeDetailTableLoading.value = false
  timeDetailTableError.value = ''
  timeDetailModalVisible.value = false
}

const goTimeDetailPage = (page) => {
  if (!Number.isFinite(page)) {
    return
  }
  const target = Math.max(1, Math.min(timeDetailTotalPages.value, page))
  timeDetailCurrentPage.value = target
  timeDetailJumpPageInput.value = ''
  if (timeDetailModalVisible.value) {
    void loadTimeDetailTableRows(target)
  }
}

const jumpToTimeDetailPage = () => {
  const input = String(timeDetailJumpPageInput.value ?? '').trim()
  if (!input) {
    return
  }
  const parsed = Number(input)
  if (!Number.isFinite(parsed)) {
    return
  }
  goTimeDetailPage(Math.round(parsed))
}

const openUserDetailModal = async (item, queryRange = null, options = {}) => {
  detailModalViewportCentered.value = Boolean(options.viewportCentered)
  detailModalVisible.value = true
  detailModalLoading.value = true
  detailModalError.value = ''
  selectedUserDetail.value = mapUserOutageDetailData({}, item)

  const consNo = String(item?.consNo || '').trim()
  const beginTime = queryRange?.beginTime || toBackendDateTime(props.startTime)
  const endTime = queryRange?.endTime || toBackendDateTime(props.endTime)
  if (!consNo) {
    detailModalLoading.value = false
    detailModalError.value = '用户编号缺失，无法加载详情。'
    return
  }
  if (!beginTime || !endTime) {
    detailModalLoading.value = false
    detailModalError.value = '时间范围缺失，无法加载详情。'
    return
  }

  const payload = {
    beginTime,
    endTime,
    consNo,
  }
  const countyId = String(props.countyId || '').trim()
  if (countyId) {
    payload.countyId = countyId
  }

  const requestId = detailModalRequestId.value + 1
  detailModalRequestId.value = requestId

  try {
    const response = await queryCountyUserOutageDetail(payload)
    if (requestId !== detailModalRequestId.value) {
      return
    }

    selectedUserDetail.value = mapUserOutageDetailData(response?.data || {}, item)
  } catch {
    if (requestId !== detailModalRequestId.value) {
      return
    }
    detailModalError.value = '用户详情加载失败，请稍后重试。'
  } finally {
    if (requestId === detailModalRequestId.value) {
      detailModalLoading.value = false
    }
  }
}

const openTimeDetailUserModal = (item) => {
  void openUserDetailModal(item, resolveTimeDetailRange(), { viewportCentered: true })
}

const closeUserDetailModal = () => {
  detailModalRequestId.value += 1
  detailModalLoading.value = false
  detailModalError.value = ''
  detailModalVisible.value = false
  detailModalViewportCentered.value = false
  selectedUserDetail.value = null
}

watch(
  () => detailTotalPages.value,
  (total) => {
    if (detailCurrentPage.value > total) {
      detailCurrentPage.value = total
    }
  },
  { immediate: true },
)

watch(
  () => timeDetailTotalPages.value,
  (total) => {
    if (timeDetailCurrentPage.value > total) {
      timeDetailCurrentPage.value = total
    }
  },
  { immediate: true },
)

watch(detailOutageCountFilter, () => {
  goDetailPage(1)
})

watch(timeDetailRangeFilter, () => {
  goTimeDetailPage(1)
})

watch(timeDetailOutageCountFilter, () => {
  goTimeDetailPage(1)
})

watch(
  () => [props.startTime, props.endTime, props.countyId],
  () => {
    detailCurrentPage.value = 1
    detailJumpPageInput.value = ''
    if (detailPageVisible.value) {
      void loadDetailTableRows(1)
    }
    if (timeDetailModalVisible.value) {
      void loadTimeDetailTableRows(1)
    }
  },
)
</script>

<template>
  <section
    class="key-user-time-trend-card"
    :class="{ clickable: !detailPageVisible }"
    role="button"
    tabindex="0"
    @click="!detailPageVisible && openDetailPage()"
    @keydown.enter.prevent="!detailPageVisible && openDetailPage()"
    @keydown.space.prevent="!detailPageVisible && openDetailPage()"
  >
    <template v-if="!detailPageVisible">
      <header class="trend-head">
        <h4>{{ props.title }}</h4>
        <div class="trend-legend" aria-label="图例">
          <span class="trend-legend-item sensitive">
            <i aria-hidden="true"></i>
            {{ props.sensitiveLabel }}
          </span>
          <span class="trend-legend-item important">
            <i aria-hidden="true"></i>
            {{ props.importantLabel }}
          </span>
        </div>
      </header>

      <div class="trend-chart-wrap">
        <svg class="trend-chart" :viewBox="`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`" preserveAspectRatio="none">
          <g class="trend-grid">
            <line
              v-for="tick in yTicks"
              :key="`grid-${tick.value}-${tick.y}`"
              :x1="CHART_PADDING.left"
              :x2="SVG_WIDTH - CHART_PADDING.right"
              :y1="tick.y"
              :y2="tick.y"
            />
          </g>

          <g class="trend-y-axis-labels">
            <text
              v-for="tick in yTicks"
              :key="`y-label-${tick.value}-${tick.y}`"
              :x="CHART_PADDING.left - 8"
              :y="tick.y + 4"
              text-anchor="end"
            >
              {{ tick.value }}
            </text>
          </g>

          <line
            class="trend-x-axis"
            :x1="CHART_PADDING.left"
            :x2="SVG_WIDTH - CHART_PADDING.right"
            :y1="SVG_HEIGHT - CHART_PADDING.bottom"
            :y2="SVG_HEIGHT - CHART_PADDING.bottom"
          />

          <path class="trend-line sensitive" :d="sensitivePath"></path>
          <path class="trend-line important" :d="importantPath"></path>

          <g class="trend-point-group sensitive">
            <circle
              v-for="point in sensitivePoints"
              :key="`sensitive-point-${point.x}-${point.y}`"
              :cx="point.x"
              :cy="point.y"
              r="3.5"
            />
          </g>

          <g class="trend-point-group important">
            <circle
              v-for="point in importantPoints"
              :key="`important-point-${point.x}-${point.y}`"
              :cx="point.x"
              :cy="point.y"
              r="3.5"
            />
          </g>

          <g class="trend-x-labels">
            <text
              v-for="(point, index) in sensitivePoints"
              :key="`x-label-${point.x}-${point.label}-${point.timeLabel}`"
              :x="point.x + getXAxisLabelOffsetX(index, sensitivePoints.length)"
              :y="SVG_HEIGHT - CHART_PADDING.bottom + 22"
              :text-anchor="getXAxisLabelAnchor(index, sensitivePoints.length)"
            >
              <tspan :x="point.x + getXAxisLabelOffsetX(index, sensitivePoints.length)">{{ point.label }}</tspan>
              <tspan :x="point.x + getXAxisLabelOffsetX(index, sensitivePoints.length)" dy="14">{{ point.timeLabel }}</tspan>
            </text>
          </g>
        </svg>
        <div v-if="props.loading" class="trend-loading">
          <span class="trend-loading-spinner" aria-hidden="true"></span>
          <span>数据加载中...</span>
        </div>
      </div>
    </template>

    <section v-else class="trend-detail-layer" @click.stop>
      <header class="trend-detail-head">
        <h4>重点用户停电明细</h4>
        <button type="button" class="trend-detail-close" @click="closeDetailPage">×</button>
      </header>

      <section class="trend-detail-pie-grid">
        <article class="tag-pie-card trend-detail-pie-card">
          <p class="tag-pie-title">重点用户停电次数分布</p>
          <div class="trend-detail-pie-content">
            <div class="tag-pie trend-detail-tag-pie" :style="{ background: importantOutagePieBackground }">
              <div class="tag-pie-center">
                <template v-if="props.outageFreqLoading">
                  <strong class="trend-detail-pie-loading-text">数据加载中...</strong>
                </template>
                <template v-else>
                  <strong>{{ importantOutageTotal }}</strong>
                  <span>重点用户</span>
                </template>
              </div>
            </div>
            <ul class="trend-detail-pie-legend">
              <li v-for="item in importantOutagePieSummary" :key="`important-pie-${item.key}`">
                <i :style="{ background: item.color }"></i>
                <span>{{ item.label }}</span>
                <em>{{ item.count }}人 / {{ item.rateText }}</em>
              </li>
            </ul>
          </div>
        </article>

        <article class="tag-pie-card trend-detail-pie-card">
          <p class="tag-pie-title">敏感用户停电次数分布</p>
          <div class="trend-detail-pie-content">
            <div class="tag-pie trend-detail-tag-pie" :style="{ background: sensitiveOutagePieBackground }">
              <div class="tag-pie-center">
                <template v-if="props.outageFreqLoading">
                  <strong class="trend-detail-pie-loading-text">数据加载中...</strong>
                </template>
                <template v-else>
                  <strong>{{ sensitiveOutageTotal }}</strong>
                  <span>敏感用户</span>
                </template>
              </div>
            </div>
            <ul class="trend-detail-pie-legend">
              <li v-for="item in sensitiveOutagePieSummary" :key="`sensitive-pie-${item.key}`">
                <i :style="{ background: item.color }"></i>
                <span>{{ item.label }}</span>
                <em>{{ item.count }}人 / {{ item.rateText }}</em>
              </li>
            </ul>
          </div>
        </article>
      </section>

      <section class="trend-detail-table-module">
        <div class="trend-detail-query-bar">
          <input
            v-model="detailSearchInput"
            type="text"
            class="trend-detail-query-input"
            placeholder="请输入用户编号或用户名称"
            @keyup.enter="applyDetailSearch"
          />
          <button type="button" class="trend-detail-query-btn" :disabled="detailTableLoading" @click="applyDetailSearch">
            查询
          </button>
          <button type="button" class="trend-detail-query-btn" @click="openTimeDetailModal">
            时间详情
          </button>
          <div class="trend-detail-count-filter-wrap">
            <span class="trend-detail-count-filter-label">停电次数</span>
            <select v-model="detailOutageCountFilter" class="trend-detail-count-filter">
              <option value="all">全部</option>
              <option value="1">1次</option>
              <option value="2">2次</option>
              <option value="3+">3次及以上</option>
            </select>
          </div>
        </div>

        <div class="trend-detail-grid-wrap">
          <ul class="trend-detail-grid-body">
            <li class="trend-detail-grid trend-detail-grid-head">
              <span>用户编号</span>
              <span>用户名称</span>
              <span title="区县">区县</span>
              <span title="停电次数">停电次数</span>
              <span>所属行业</span>
              <span>详情</span>
            </li>
            <li v-for="item in pagedImportantUserOutageRows" :key="item.id" class="trend-detail-grid trend-detail-grid-row">
              <span class="trend-detail-cell hover-expand-cell" :data-full="item.consNo">
                <span class="trend-detail-cell-text">{{ item.consNo }}</span>
              </span>
              <span class="trend-detail-cell hover-expand-cell" :data-full="item.consName">
                <span class="trend-detail-cell-text">{{ item.consName }}</span>
              </span>
              <span class="trend-detail-cell hover-expand-cell" :data-full="item.countyName">
                <span class="trend-detail-cell-text">{{ item.countyName }}</span>
              </span>
              <span class="trend-detail-cell hover-expand-cell" :data-full="String(item.outageCount)">
                <span class="trend-detail-cell-text">{{ item.outageCount }}</span>
              </span>
              <span class="trend-detail-cell trend-detail-period-cell hover-expand-cell" :data-full="item.tradeName">
                <span class="trend-detail-cell-text">{{ item.tradeName }}</span>
              </span>
              <button type="button" class="detail-btn" @click="openUserDetailModal(item)">详情</button>
            </li>
          </ul>

          <p v-if="detailTableLoading" class="empty-tip">重点用户停电明细加载中...</p>
          <p v-else-if="detailTableError" class="empty-tip">{{ detailTableError }}</p>
          <p v-else-if="pagedImportantUserOutageRows.length === 0" class="empty-tip">当前时间段暂无重点用户停电明细。</p>
        </div>

        <footer class="user-detail-pagination" v-if="detailTableTotal > 0">
          <button
            v-for="page in detailPageButtons"
            :key="`key-user-time-detail-page-${page}`"
            type="button"
            class="page-btn"
            :class="{ active: page === detailCurrentPage }"
            @click="goDetailPage(page)"
          >
            {{ page }}
          </button>

          <div class="user-detail-page-jump">
            <input
              v-model="detailJumpPageInput"
              type="number"
              min="1"
              :max="detailTotalPages"
              class="user-detail-page-input"
              placeholder="页码"
              @keyup.enter="jumpToDetailPage"
            />
            <button type="button" class="user-detail-page-jump-btn" @click="jumpToDetailPage">跳转</button>
          </div>
        </footer>
      </section>

      <div v-if="timeDetailModalVisible" class="trend-time-detail-modal-mask" @click.self="closeTimeDetailModal">
        <article class="trend-time-detail-modal">
          <header class="trend-time-detail-modal-head">
            <h4>时间详情</h4>
            <button type="button" class="trend-detail-close" @click="closeTimeDetailModal">×</button>
          </header>

          <div class="trend-time-detail-filter-bar">
            <label class="trend-time-detail-filter">
              <span>时间</span>
              <select v-model="timeDetailRangeFilter" class="trend-detail-count-filter">
                <option value="1">近期1个月内</option>
                <option value="2">近期2个月内</option>
                <option value="3">近期3个月内</option>
                <option value="older">近期3个月以上</option>
              </select>
            </label>
            <label class="trend-time-detail-filter">
              <span>停电次数</span>
              <select v-model="timeDetailOutageCountFilter" class="trend-detail-count-filter">
                <option value="all">全部</option>
                <option value="1">1次</option>
                <option value="2">2次</option>
                <option value="3+">3次及以上</option>
              </select>
            </label>
          </div>

          <div class="trend-detail-grid-wrap trend-time-detail-grid-wrap">
            <ul class="trend-detail-grid-body">
              <li class="trend-detail-grid trend-detail-grid-head">
                <span>用户编号</span>
                <span>用户名称</span>
                <span title="区县">区县</span>
                <span title="停电次数">停电次数</span>
                <span>所属行业</span>
                <span>详情</span>
              </li>
              <li v-for="item in pagedTimeDetailRows" :key="`time-detail-${item.id}`" class="trend-detail-grid trend-detail-grid-row">
                <span class="trend-detail-cell hover-expand-cell" :data-full="item.consNo">
                  <span class="trend-detail-cell-text">{{ item.consNo }}</span>
                </span>
                <span class="trend-detail-cell hover-expand-cell" :data-full="item.consName">
                  <span class="trend-detail-cell-text">{{ item.consName }}</span>
                </span>
                <span class="trend-detail-cell hover-expand-cell" :data-full="item.countyName">
                  <span class="trend-detail-cell-text">{{ item.countyName }}</span>
                </span>
                <span class="trend-detail-cell hover-expand-cell" :data-full="String(item.outageCount)">
                  <span class="trend-detail-cell-text">{{ item.outageCount }}</span>
                </span>
                <span class="trend-detail-cell trend-detail-period-cell hover-expand-cell" :data-full="item.tradeName">
                  <span class="trend-detail-cell-text">{{ item.tradeName }}</span>
                </span>
                <button type="button" class="detail-btn" @click="openTimeDetailUserModal(item)">详情</button>
              </li>
            </ul>

            <p v-if="timeDetailTableLoading" class="empty-tip">时间详情加载中...</p>
            <p v-else-if="timeDetailTableError" class="empty-tip">{{ timeDetailTableError }}</p>
            <p v-else-if="pagedTimeDetailRows.length === 0" class="empty-tip">当前时间段暂无重点用户停电明细。</p>
          </div>

          <footer class="user-detail-pagination" v-if="timeDetailTableTotal > 0">
            <button
              v-for="page in timeDetailPageButtons"
              :key="`time-detail-page-${page}`"
              type="button"
              class="page-btn"
              :class="{ active: page === timeDetailCurrentPage }"
              @click="goTimeDetailPage(page)"
            >
              {{ page }}
            </button>

            <div class="user-detail-page-jump">
              <input
                v-model="timeDetailJumpPageInput"
                type="number"
                min="1"
                :max="timeDetailTotalPages"
                class="user-detail-page-input"
                placeholder="页码"
                @keyup.enter="jumpToTimeDetailPage"
              />
              <button type="button" class="user-detail-page-jump-btn" @click="jumpToTimeDetailPage">跳转</button>
            </div>
          </footer>
        </article>
      </div>

      <div
        v-if="detailModalVisible && selectedUserDetail"
        class="user-detail-modal-mask"
        :class="{ 'time-detail-user-modal-mask': detailModalViewportCentered }"
        @click.self="closeUserDetailModal"
      >
        <article class="user-detail-modal">
          <button type="button" class="user-detail-modal-close" @click="closeUserDetailModal">×</button>
          <h4>用户详情</h4>
          <div class="user-detail-modal-content">
            <p><span>用户编号：</span>{{ selectedUserDetail.consNo }}</p>
            <p><span>用户名称：</span>{{ selectedUserDetail.consName }}</p>
            <p><span>停电次数：</span>{{ selectedUserDetail.outageCount }}</p>
            <p><span>所属区县：</span>{{ selectedUserDetail.countyName }}</p>
            <p><span>所属行业：</span>{{ selectedUserDetail.tradeName }}</p>
            <p><span>用户地址：</span>{{ selectedUserDetail.consAddr }}</p>
            <div class="trend-detail-event-list">
              <h5>停电记录</h5>
              <p v-if="detailModalLoading" class="empty-tip">用户详情加载中...</p>
              <p v-else-if="detailModalError" class="empty-tip">{{ detailModalError }}</p>
              <p v-else-if="selectedUserDetail.outageEvents.length === 0" class="empty-tip">当前时间段暂无停电记录。</p>
              <ul v-else>
                <li v-for="event in selectedUserDetail.outageEvents" :key="event.eventKey">
                  <strong>{{ event.outageNumber }}</strong>
                  <span>停电开始时间：{{ event.beginTime }}</span>
                  <span>复电时间：{{ event.endTime }}</span>
                </li>
              </ul>
            </div>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>

<style scoped>
.key-user-time-trend-card {
  border: 1px solid rgba(82, 150, 216, 0.55);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(16, 46, 92, 0.36) 0%, rgba(2, 22, 53, 0.78) 100%);
  box-shadow: inset 0 0 28px rgba(49, 126, 211, 0.2);
  padding: 14px 14px 10px;
}

.key-user-time-trend-card.clickable {
  cursor: pointer;
}

.key-user-time-trend-card.clickable:hover {
  border-color: rgba(125, 201, 255, 0.86);
}

.trend-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.trend-head h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #dff0ff;
  line-height: 1.25;
}

.trend-legend {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding-top: 2px;
  font-size: 13px;
  color: #c4e7ff;
  white-space: nowrap;
}

.trend-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 1;
}

.trend-legend-item i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.trend-legend-item.sensitive i {
  background: #ff4d4f;
  box-shadow: 0 0 6px rgba(255, 77, 79, 0.55);
}

.trend-legend-item.important i {
  background: #f4a825;
  box-shadow: 0 0 6px rgba(244, 168, 37, 0.55);
}

.trend-chart-wrap {
  margin-top: 10px;
  width: 100%;
  height: 220px;
  position: relative;
}

.trend-chart {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.trend-loading {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transform: translateY(-26px);
  color: rgba(196, 231, 255, 0.82);
  font-size: 14px;
  pointer-events: none;
}

.trend-loading-spinner {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid rgba(126, 193, 245, 0.26);
  border-top-color: #7ed8ff;
  animation: trend-loading-spin 0.8s linear infinite;
}

@keyframes trend-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

.trend-grid line {
  stroke: rgba(137, 199, 255, 0.18);
  stroke-width: 1;
}

.trend-y-axis-labels text {
  fill: #9fc6e5;
  font-size: 14px;
  font-weight: 600;
}

.trend-x-axis {
  stroke: rgba(137, 199, 255, 0.35);
  stroke-width: 1.2;
}

.trend-line {
  fill: none;
  stroke-width: 2.5;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.trend-line.sensitive {
  stroke: #ff4d4f;
}

.trend-line.important {
  stroke: #f4a825;
}

.trend-point-group.sensitive circle {
  fill: #ff4d4f;
  stroke: rgba(255, 77, 79, 0.2);
  stroke-width: 3;
}

.trend-point-group.important circle {
  fill: #f4a825;
  stroke: rgba(244, 168, 37, 0.2);
  stroke-width: 3;
}

.trend-x-labels text {
  fill: #9fc6e5;
  font-size: 14px;
  font-weight: 600;
}

.trend-detail-layer {
  position: absolute;
  inset: 0;
  z-index: 40;
  padding: 12px;
  background: #03182df5;
  border: 1px solid rgba(114, 203, 255, 0.3);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow: hidden;
}

.trend-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.trend-detail-head h4 {
  margin: 0;
  font-size: 16px;
  color: #dff2ff;
}

.trend-detail-close {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(110, 194, 255, 0.45);
  background: #052744e6;
  color: #cce9ff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.trend-detail-pie-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.trend-detail-pie-card {
  justify-items: stretch;
}

.trend-detail-pie-loading-text {
  font-size: 13px;
  white-space: nowrap;
}

.trend-detail-pie-content {
  display: grid;
  grid-template-columns: 168px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  width: 100%;
}

.trend-detail-pie-legend {
  list-style: none;
  margin: 0;
  padding: 0 0 0 8px;
  display: grid;
  gap: 6px;
}

.trend-detail-pie-legend li {
  display: grid;
  grid-template-columns: 10px auto 1fr;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #d5ecff;
}

.trend-detail-pie-legend i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(157, 207, 250, 0.4);
}

.trend-detail-pie-legend em {
  text-align: right;
  color: #a9d6f7;
  font-style: normal;
}

.trend-detail-table-module {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.trend-detail-query-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto;
  gap: 8px;
  align-items: center;
}

.trend-detail-query-input {
  width: 100%;
  min-width: 0;
  height: 30px;
  border-radius: 6px;
  border: 1px solid rgba(110, 194, 255, 0.42);
  color: #e8f6ff;
  background: #042542f2;
  padding: 0 10px;
  font-size: 12px;
}

.trend-detail-query-btn {
  height: 30px;
  border-radius: 6px;
  border: 1px solid rgba(90, 214, 255, 0.46);
  background: #043053b8;
  color: #d5efff;
  padding: 0 12px;
  font-size: 12px;
  cursor: pointer;
}

.trend-detail-count-filter {
  min-width: 112px;
  height: 30px;
  border-radius: 6px;
  border: 1px solid rgba(110, 194, 255, 0.42);
  color: #e8f6ff;
  background: #042542f2;
  padding: 0 8px;
  font-size: 12px;
}

.trend-detail-count-filter-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.trend-detail-count-filter-label {
  font-size: 12px;
  color: #c4e7ff;
  white-space: nowrap;
}

.trend-time-detail-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 8, 20, 0.7);
}

.trend-time-detail-modal {
  width: min(960px, 100%);
  height: min(680px, calc(100vh - 48px));
  min-height: 420px;
  border: 1px solid rgba(118, 206, 255, 0.48);
  border-radius: 10px;
  background: #03182df7;
  box-shadow: 0 20px 60px rgba(0, 8, 20, 0.62), inset 0 0 28px rgba(49, 126, 211, 0.14);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.trend-time-detail-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.trend-time-detail-modal-head h4 {
  margin: 0;
  font-size: 18px;
  color: #dff2ff;
}

.trend-time-detail-filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.trend-time-detail-filter {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 13px;
  color: #c4e7ff;
}

.trend-time-detail-filter .trend-detail-count-filter {
  min-width: 160px;
}

.trend-time-detail-grid-wrap {
  min-height: 0;
}

.trend-detail-grid-wrap {
  --trend-detail-grid-columns: minmax(0, 0.96fr) minmax(0, 1.02fr) minmax(0, 0.74fr) minmax(0, 0.78fr) minmax(0, 1.72fr) 66px;
  --trend-detail-grid-col-gap: 6px;
  --trend-detail-grid-pad-y: 8px;
  --trend-detail-grid-pad-x: 10px;
  flex: 1;
  min-height: 220px;
  border: 1px dashed rgba(110, 194, 255, 0.48);
  border-radius: 12px;
  background: linear-gradient(180deg, #092542db, #061d35eb);
  box-shadow: inset 0 0 0 1px #2157815c;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.trend-detail-grid {
  width: 100%;
  display: grid;
  grid-template-columns: var(--trend-detail-grid-columns);
  column-gap: var(--trend-detail-grid-col-gap);
  align-items: center;
  padding: var(--trend-detail-grid-pad-y) var(--trend-detail-grid-pad-x);
}

.trend-detail-grid > * {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trend-detail-grid-head {
  border-bottom: 1px dashed rgba(116, 201, 251, 0.52);
  background: linear-gradient(180deg, #0a2d4df5, #08223cfa);
}

.trend-detail-grid-head span {
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  color: #7ed8ff;
}

.trend-detail-grid-body {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.trend-detail-grid-row {
  border-bottom: 1px dashed rgba(109, 168, 214, 0.34);
  font-size: 12px;
}

.trend-detail-cell {
  color: #eaf6ff;
}

.trend-detail-grid-head span:nth-child(4),
.trend-detail-grid-row span:nth-child(4) {
  text-align: center;
}

.trend-detail-grid-head span:nth-child(5),
.trend-detail-grid-row span:nth-child(5) {
  padding-left: 8px;
}

.trend-detail-grid > .hover-expand-cell {
  position: relative;
  overflow: visible;
}

.trend-detail-cell-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trend-detail-period-cell .trend-detail-cell-text {
  white-space: normal;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.hover-expand-cell::before {
  content: '';
  position: absolute;
  left: calc(100% + 4px);
  top: 50%;
  transform: translateY(-50%);
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-right: 5px solid rgba(18, 58, 102, 0.95);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
  z-index: 70;
}

.hover-expand-cell::after {
  content: attr(data-full);
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  min-width: 64px;
  max-width: 360px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(125, 201, 255, 0.58);
  background: rgba(18, 58, 102, 0.95);
  color: #e9f6ff;
  font-size: 12px;
  line-height: 1.4;
  white-space: normal;
  word-break: break-all;
  box-shadow: 0 8px 20px rgba(3, 20, 40, 0.52);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
  z-index: 70;
}

.hover-expand-cell:hover::before,
.hover-expand-cell:hover::after {
  opacity: 1;
}

.trend-detail-period-cell::before {
  left: auto;
  right: calc(100% + 4px);
  border-right: 0;
  border-left: 5px solid rgba(18, 58, 102, 0.95);
}

.trend-detail-period-cell::after {
  left: auto;
  right: calc(100% + 8px);
}

.trend-detail-event-list {
  border: 1px dashed rgba(121, 181, 226, 0.42);
  border-radius: 8px;
  padding: 8px;
  background: rgba(8, 33, 59, 0.6);
}

.trend-detail-event-list h5 {
  margin: 0 0 8px;
  font-size: 13px;
  color: #9fd9ff;
}

.trend-detail-event-list ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}

.trend-detail-event-list li {
  border: 1px solid rgba(107, 154, 196, 0.4);
  border-radius: 6px;
  padding: 8px;
  display: grid;
  gap: 4px;
  font-size: 12px;
  color: #e8f6ff;
  background: rgba(10, 34, 58, 0.7);
}

.trend-detail-event-list strong {
  color: #b7e7ff;
  font-weight: 700;
}

.time-detail-user-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  padding: 24px;
  background: rgba(0, 8, 20, 0.7);
}

.time-detail-user-modal-mask .user-detail-modal {
  width: min(560px, 100%);
  max-height: min(680px, calc(100vh - 48px));
}

@media (max-width: 760px) {
  .trend-detail-pie-content {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .trend-detail-pie-legend {
    width: 100%;
  }

  .trend-detail-grid-wrap {
    --trend-detail-grid-columns: minmax(0, 0.9fr) minmax(0, 0.95fr) minmax(0, 0.65fr) minmax(0, 0.72fr) minmax(0, 1.45fr) 56px;
  }
}
</style>
