<script setup>
import { computed, ref, watch } from 'vue'
import { queryCountyEquipmentDetail } from '../api/outage'

const props = defineProps({
  rows: {
    type: Array,
    default: () => [],
  },
  selectedRegion: {
    type: String,
    default: '全部',
  },
  title: {
    type: String,
    default: '空间分布',
  },
  importantLabel: {
    type: String,
    default: '重点用户户数',
  },
  sensitiveLabel: {
    type: String,
    default: '敏感用户户数',
  },
  detailRows: {
    type: Array,
    default: () => [],
  },
  tableRows: {
    type: Array,
    default: () => [],
  },
  tableTotal: {
    type: Number,
    default: 0,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})
const emit = defineEmits(['open-detail-page', 'go-detail-page', 'close-detail-page'])

const toCount = (value) => Math.max(0, Number(value) || 0)
const TREND_MIN_TRACK_PERCENT = 16

const normalizedRows = computed(() =>
  props.rows.map((item, index) => {
    const name = String(item?.name || item?.label || '').trim() || `数据${index + 1}`
    const importantCount = toCount(item?.importantCount ?? item?.important)
    const sensitiveCount = toCount(item?.sensitiveCount ?? item?.sensitive)
    return {
      name,
      importantCount,
      sensitiveCount,
      totalCount: importantCount + sensitiveCount,
    }
  }),
)

const maxTotal = computed(() => normalizedRows.value.reduce((max, item) => Math.max(max, item.totalCount), 0))

const displayRows = computed(() => {
  const base = maxTotal.value || 1
  return normalizedRows.value.map((item) => {
    const total = item.totalCount
    const rawTrackPercent = total > 0 ? (total / base) * 100 : 0
    return {
      ...item,
      trackPercent: total > 0 ? Math.max(rawTrackPercent, TREND_MIN_TRACK_PERCENT) : 0,
      importantPercent: total > 0 ? (item.importantCount / total) * 100 : 0,
      sensitivePercent: total > 0 ? (item.sensitiveCount / total) * 100 : 0,
    }
  })
})

const emptyText = computed(() => '暂无区县数据')

const buildSegmentStyle = (percent, count) => {
  if (count <= 0 || percent <= 0) {
    return { width: '0%' }
  }

  return {
    width: `${percent}%`,
    minWidth: '28px',
  }
}

const detailPageVisible = ref(false)
const detailModalVisible = ref(false)
const selectedDetailRow = ref(null)
const detailModalLoading = ref(false)
const detailModalError = ref('')
const detailModalRequestId = ref(0)
const selectedTopDeviceId = ref('')
const DETAIL_PAGE_SIZE = 10
const DETAIL_PAGE_MAX_BUTTONS = 5
const detailCurrentPage = ref(1)
const detailJumpPageInput = ref('')

const normalizeEquipmentRows = (rows) =>
  rows.map((item, index) => {
    const equipmentId = String(item?.equipmentId || item?.deviceNo || '').trim() || '-'
    const deviceNo = String(item?.deviceNo || '').trim() || '-'
    const deviceName = String(item?.deviceName || '').trim() || '-'
    const importantUserCount = toCount(item?.importantUserCount)
    const sensitiveUserCount = toCount(item?.sensitiveUserCount)
    const outageEventCount = toCount(item?.outageEventCount)
    const importantUserList = Array.isArray(item?.importantUserList) ? item.importantUserList : []
    const sensitiveUserList = Array.isArray(item?.sensitiveUserList) ? item.sensitiveUserList : []

    return {
      id: String(item?.key || `${deviceNo}-${deviceName}-${index}`),
      equipmentId,
      deviceNo,
      deviceName,
      importantUserCount,
      sensitiveUserCount,
      outageEventCount,
      totalUserCount: importantUserCount + sensitiveUserCount,
      importantUserList,
      sensitiveUserList,
    }
  })

const normalizedDetailRows = computed(() => normalizeEquipmentRows(props.detailRows))
const normalizedTableRows = computed(() => normalizeEquipmentRows(props.tableRows))

const top5RankedRows = computed(() => normalizedDetailRows.value.slice(0, 5))
const deviceImpactEmptyText = computed(() =>
  props.loading ? '数据加载中...' : '当前区域暂无设备影响用户数据。',
)
const selectedDeviceEmptyText = computed(() =>
  props.loading ? '数据加载中...' : '暂无设备数据。',
)

const detailTotalPages = computed(() => Math.max(Math.ceil(props.tableTotal / DETAIL_PAGE_SIZE), 1))

const pagedDetailRows = computed(() => normalizedTableRows.value)

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

const topDeviceMaxImpact = computed(() =>
  top5RankedRows.value.reduce((max, item) => Math.max(max, item.importantUserCount), 0),
)

const selectedTopDevice = computed(() => {
  if (!selectedTopDeviceId.value) {
    return top5RankedRows.value[0] || null
  }

  return top5RankedRows.value.find((item) => item.id === selectedTopDeviceId.value) || top5RankedRows.value[0] || null
})

const summaryStats = computed(() => {
  const rows = normalizedDetailRows.value
  const affectedDeviceCount = rows.length
  const importantUserTotal = rows.reduce((sum, item) => sum + item.importantUserCount, 0)
  const sensitiveUserTotal = rows.reduce((sum, item) => sum + item.sensitiveUserCount, 0)
  const highRiskDeviceCount = rows.filter((item) => item.totalUserCount >= 20).length
  const highRiskRatio = affectedDeviceCount > 0 ? (highRiskDeviceCount / affectedDeviceCount) * 100 : 0

  return {
    affectedDeviceCount,
    importantUserTotal,
    sensitiveUserTotal,
    highRiskRatio,
  }
})

watch(
  top5RankedRows,
  (rows) => {
    if (rows.length === 0) {
      selectedTopDeviceId.value = ''
      return
    }

    const exists = rows.some((item) => item.id === selectedTopDeviceId.value)
    if (!exists) {
      selectedTopDeviceId.value = rows[0].id
    }
  },
  { immediate: true },
)

watch(
  detailTotalPages,
  (total) => {
    if (detailCurrentPage.value > total) {
      detailCurrentPage.value = total
    }
  },
  { immediate: true },
)

const openDetailPage = () => {
  detailPageVisible.value = true
  detailCurrentPage.value = 1
  detailJumpPageInput.value = ''
  emit('open-detail-page')
}

const closeDetailPage = () => {
  detailPageVisible.value = false
  detailModalVisible.value = false
  detailModalLoading.value = false
  detailModalError.value = ''
  selectedDetailRow.value = null
  detailModalRequestId.value += 1
  detailCurrentPage.value = 1
  detailJumpPageInput.value = ''
  emit('close-detail-page')
}

const buildUserDisplayText = (record) => {
  const consNo = String(record?.consNo || record?.cons_no || record?.userNo || record?.user_id || '').trim() || '-'
  const consName = String(record?.consName || record?.cons_name || record?.userName || record?.name || '').trim() || '-'
  const countyName = String(record?.countyName || record?.county_name || '').trim() || '-'
  const consAddr = String(record?.consAddr || record?.cons_addr || record?.consAddress || record?.address || '').trim() || '-'
  return `${consNo} / ${consName} / ${countyName} / ${consAddr}`
}

const mapDetailUsers = (users) =>
  (Array.isArray(users) ? users : []).map((item) => buildUserDisplayText(item))

const openDetailModal = async (item) => {
  const equipmentId = String(item?.equipmentId || item?.deviceNo || '').trim()
  selectedDetailRow.value = {
    ...(item || {}),
    equipmentId: equipmentId || '-',
    deviceNo: String(item?.deviceNo || equipmentId || '').trim() || '-',
    deviceName: String(item?.deviceName || '').trim() || '-',
    importantUserCount: toCount(item?.importantUserCount),
    sensitiveUserCount: toCount(item?.sensitiveUserCount),
    importantUserList: Array.isArray(item?.importantUserList) ? item.importantUserList : [],
    sensitiveUserList: Array.isArray(item?.sensitiveUserList) ? item.sensitiveUserList : [],
  }
  detailModalVisible.value = true
  detailModalLoading.value = true
  detailModalError.value = ''

  if (!equipmentId) {
    detailModalLoading.value = false
    detailModalError.value = 'Missing equipment ID. Unable to load details.'
    return
  }

  const requestId = detailModalRequestId.value + 1
  detailModalRequestId.value = requestId

  try {
    const response = await queryCountyEquipmentDetail({ equipmentId })
    if (requestId !== detailModalRequestId.value) {
      return
    }

    const data = response?.data || {}
    const importantUserList = mapDetailUsers(data?.keyUsers)
    const sensitiveUserList = mapDetailUsers(data?.sensitiveUsers)

    selectedDetailRow.value = {
      ...(selectedDetailRow.value || {}),
      equipmentId: String(data?.equipmentId || equipmentId).trim() || '-',
      deviceNo: String(data?.equipmentId || selectedDetailRow.value?.deviceNo || equipmentId).trim() || '-',
      deviceName: String(data?.equipmentName || selectedDetailRow.value?.deviceName || '').trim() || '-',
      importantUserCount: toCount(data?.keyUserCount ?? importantUserList.length),
      sensitiveUserCount: toCount(data?.sensitiveUserCount ?? sensitiveUserList.length),
      importantUserList,
      sensitiveUserList,
    }
  } catch {
    if (requestId !== detailModalRequestId.value) {
      return
    }
    detailModalError.value = 'Failed to load details. Please try again.'
  } finally {
    if (requestId === detailModalRequestId.value) {
      detailModalLoading.value = false
    }
  }
}

const closeDetailModal = () => {
  detailModalVisible.value = false
  detailModalLoading.value = false
  detailModalError.value = ''
  selectedDetailRow.value = null
  detailModalRequestId.value += 1
}

const selectTopDevice = (item) => {
  selectedTopDeviceId.value = item?.id || ''
}

const goDetailPage = (page) => {
  if (!Number.isFinite(page)) {
    return
  }
  const targetPage = Math.max(1, Math.min(detailTotalPages.value, Math.round(page)))
  detailCurrentPage.value = targetPage
  detailJumpPageInput.value = ''
  emit('go-detail-page', targetPage)
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
  goDetailPage(parsed)
}

const buildTopBarStyle = (totalCount) => {
  if (totalCount <= 0 || topDeviceMaxImpact.value <= 0) {
    return { width: '0%' }
  }

  return {
    width: `${(totalCount / topDeviceMaxImpact.value) * 100}%`,
  }
}

const formatPercent = (value) => `${value.toFixed(1)}%`
</script>

<template>
  <section
    class="key-user-time-trend-card module-clickable"
    role="button"
    tabindex="0"
    @click="!detailPageVisible && openDetailPage()"
    @keydown.enter.prevent="!detailPageVisible && openDetailPage()"
    @keydown.space.prevent="!detailPageVisible && openDetailPage()"
  >
    <header class="trend-head">
      <h4>{{ props.title }}</h4>
      <div class="trend-legend" aria-label="图例">
        <span class="trend-legend-item important">
          <i aria-hidden="true"></i>
          {{ props.importantLabel }}
        </span>
        <span class="trend-legend-item sensitive">
          <i aria-hidden="true"></i>
          {{ props.sensitiveLabel }}
        </span>
      </div>
    </header>

    <div class="trend-chart-wrap">
      <div v-if="displayRows.length > 0" class="trend-rows">
        <div v-for="row in displayRows" :key="row.name" class="trend-row">
          <div class="trend-row-name" :title="row.name">{{ row.name }}</div>

          <div class="trend-row-bars">
            <div class="trend-row-track">
              <div class="trend-row-stack" :style="{ width: `${row.trackPercent}%` }">
                <div class="trend-row-segment important" :style="buildSegmentStyle(row.importantPercent, row.importantCount)">
                  <span v-if="row.importantCount > 0" class="trend-row-value">{{ row.importantCount }}</span>
                </div>

                <div class="trend-row-segment sensitive" :style="buildSegmentStyle(row.sensitivePercent, row.sensitiveCount)">
                  <span v-if="row.sensitiveCount > 0" class="trend-row-value">{{ row.sensitiveCount }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="trend-empty">{{ emptyText }}</div>
    </div>

    <section v-if="detailPageVisible" class="card key-user-detail-layer" @click.stop>
      <header class="key-user-detail-layer-head">
        <h3>空间分布</h3>
        <button type="button" class="user-detail-close" @click.stop="closeDetailPage">×</button>
      </header>

      <div class="space-detail-layout">
        <section class="space-summary-panel">
          <h4>设备影响摘要</h4>
          <div class="space-summary-grid">
            <article class="space-summary-item">
              <p>影响设备数</p>
              <strong>{{ summaryStats.affectedDeviceCount }}</strong>
            </article>
            <article class="space-summary-item">
              <p>敏感用户总数</p>
              <strong>{{ summaryStats.sensitiveUserTotal }}</strong>
            </article>
            <article class="space-summary-item">
              <p>重点用户总数</p>
              <strong>{{ summaryStats.importantUserTotal }}</strong>
            </article>
            <article class="space-summary-item">
              <p>高风险设备占比</p>
              <strong>{{ formatPercent(summaryStats.highRiskRatio) }}</strong>
              <small>重点+敏感 >= 20</small>
            </article>
          </div>
        </section>

        <section class="space-rank-detail-row">
          <article class="space-rank-card">
            <h4>Top5 影响排行</h4>
            <ul v-if="top5RankedRows.length > 0" class="space-rank-list">
              <li v-for="(item, index) in top5RankedRows" :key="item.id">
                <button
                  type="button"
                  class="space-rank-item"
                  :class="{ active: selectedTopDevice && selectedTopDevice.id === item.id }"
                  @click.stop="selectTopDevice(item)"
                >
                  <div class="space-rank-item-head">
                    <span class="space-rank-no">{{ index + 1 }}</span>
                    <span class="space-rank-name" :title="item.deviceName">{{ item.deviceName }}</span>
                    <span class="space-rank-count">{{ item.importantUserCount }}</span>
                  </div>
                  <span class="space-rank-bar-bg">
                    <span class="space-rank-bar-fill" :style="buildTopBarStyle(item.importantUserCount)"></span>
                  </span>
                </button>
              </li>
            </ul>
            <p v-else class="empty-tip">{{ deviceImpactEmptyText }}</p>
          </article>

          <article class="space-selected-card">
            <h4>选中设备详情</h4>
            <div v-if="selectedTopDevice" class="space-selected-fields">
              <p><span>设备编号：</span>{{ selectedTopDevice.deviceNo }}</p>
              <p><span>设备名称：</span>{{ selectedTopDevice.deviceName }}</p>
              <p><span>重点用户数：</span>{{ selectedTopDevice.importantUserCount }}</p>
              <p><span>敏感用户数：</span>{{ selectedTopDevice.sensitiveUserCount }}</p>
              <p><span>停电事件数：</span>{{ selectedTopDevice.outageEventCount }}</p>
              <p><span>影响用户总数：</span>{{ selectedTopDevice.importantUserCount }}</p>
            </div>
            <p v-else class="empty-tip">{{ selectedDeviceEmptyText }}</p>
          </article>
        </section>

        <section class="space-detail-table-row key-user-table-module user-detail-table-module">
          <div class="space-detail-grid-wrap key-user-grid-wrap user-detail-grid-wrap">
            <ul class="key-user-grid-body user-detail-grid-body">
              <li class="key-user-grid user-detail-grid user-detail-grid-head">
                <span>设备编号</span>
                <span>设备名称</span>
                <span>重点用户数</span>
                <span>敏感用户数</span>
                <span>详情</span>
              </li>
              <li
                v-for="item in props.loading ? [] : pagedDetailRows"
                :key="item.id"
                class="key-user-grid user-detail-grid user-detail-grid-row"
              >
                <span class="user-detail-cell" :title="item.deviceNo">{{ item.deviceNo }}</span>
                <span class="user-detail-cell" :title="item.deviceName">{{ item.deviceName }}</span>
                <span class="user-detail-cell">{{ item.importantUserCount }}</span>
                <span class="user-detail-cell">{{ item.sensitiveUserCount }}</span>
                <button type="button" class="detail-btn" @click.stop="openDetailModal(item)">详情</button>
              </li>
            </ul>

            <p v-if="props.loading || normalizedTableRows.length === 0" class="empty-tip">{{ deviceImpactEmptyText }}</p>
          </div>

          <footer class="user-detail-pagination" v-if="props.tableTotal > 0">
            <button
              v-for="page in detailPageButtons"
              :key="`space-detail-page-${page}`"
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
                placeholder="&#39029;&#30721;"
                @keyup.enter="jumpToDetailPage"
              />
              <button type="button" class="user-detail-page-jump-btn" @click="jumpToDetailPage">&#36339;&#36716;</button>
            </div>
          </footer>
        </section>
      </div>

      <div v-if="detailModalVisible && selectedDetailRow" class="user-detail-modal-mask" @click.self="closeDetailModal">
        <article class="user-detail-modal key-user-detail-modal">
          <button type="button" class="user-detail-modal-close" @click="closeDetailModal">×</button>
          <h4>设备影响用户详情</h4>
          <div
            class="user-detail-modal-content"
            :class="{ 'sensitive-list-empty': selectedDetailRow.sensitiveUserList.length === 0 }"
          >
            <p><span>设备编号：</span>{{ selectedDetailRow.deviceNo }}</p>
            <p><span>设备名称：</span>{{ selectedDetailRow.deviceName }}</p>
            <p><span>重点用户数：</span>{{ selectedDetailRow.importantUserCount }}</p>
            <p><span>敏感用户数：</span>{{ selectedDetailRow.sensitiveUserCount }}</p>

            <div class="space-user-list-card important-list-card">
              <p class="space-user-list-title">重点用户清单：</p>
              <ul v-if="selectedDetailRow.importantUserList.length > 0" class="space-user-list important-user-list">
                <li v-for="item in selectedDetailRow.importantUserList" :key="`important-${item}`">{{ item }}</li>
              </ul>
              <p v-else class="space-user-list-empty">无</p>
            </div>

            <div
              class="space-user-list-card sensitive-list-card"
              :class="{ 'is-empty': selectedDetailRow.sensitiveUserList.length === 0 }"
            >
              <p class="space-user-list-title">敏感用户清单：</p>
              <ul v-if="selectedDetailRow.sensitiveUserList.length > 0" class="space-user-list">
                <li v-for="item in selectedDetailRow.sensitiveUserList" :key="`sensitive-${item}`">{{ item }}</li>
              </ul>
              <p v-else class="space-user-list-empty">无</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>

<style scoped>
.key-user-time-trend-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(82, 150, 216, 0.55);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(16, 46, 92, 0.36) 0%, rgba(2, 22, 53, 0.78) 100%);
  box-shadow: inset 0 0 28px rgba(49, 126, 211, 0.2);
  padding: 14px 14px 10px;
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

.trend-legend-item.important i {
  background: #f4a825;
  box-shadow: 0 0 6px rgba(244, 168, 37, 0.55);
}

.trend-legend-item.sensitive i {
  background: #ff4d4f;
  box-shadow: 0 0 6px rgba(255, 77, 79, 0.55);
}

.trend-chart-wrap {
  margin-top: 10px;
  width: 100%;
  height: auto;
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: #3ad7ff transparent;
}

.trend-chart-wrap::-webkit-scrollbar {
  width: 6px;
}

.trend-chart-wrap::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #3ad7ff, #2f5dff);
  border-radius: 999px;
}

.trend-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.trend-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 20px;
}

.trend-row-name {
  flex: 0 0 150px;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: #d8ebff;
}

.trend-row-bars {
  flex: 1;
  min-width: 0;
}

.trend-row-track {
  width: 100%;
  height: 16px;
  border-radius: 3px;
  background: rgba(103, 163, 225, 0.16);
  overflow: hidden;
}

.trend-row-stack {
  display: flex;
  align-items: stretch;
  height: 100%;
  border-radius: 3px;
  overflow: hidden;
}

.trend-row-segment {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.trend-row-segment.important {
  background: #f4c321;
}

.trend-row-segment.sensitive {
  background: #ff4d4f;
}

.trend-row-value {
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.trend-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(196, 231, 255, 0.7);
  font-size: 14px;
}

.space-detail-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(190px, 0.95fr) minmax(0, 0.72fr);
  gap: 10px;
}

.space-summary-panel,
.space-rank-card,
.space-selected-card {
  border: 1px solid rgba(104, 188, 247, 0.35);
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(12, 47, 84, 0.45) 0%, rgba(4, 25, 52, 0.82) 100%);
  padding: 10px;
}

.space-summary-panel h4,
.space-rank-card h4,
.space-selected-card h4 {
  margin: 0;
  font-size: 16px;
  color: #90dcff;
}

.space-summary-panel {
  padding: 8px;
}

.space-summary-panel h4 {
  font-size: 15px;
}

.space-summary-grid {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.space-summary-item {
  border: 1px solid rgba(108, 194, 250, 0.4);
  border-radius: 12px;
  background: rgba(8, 35, 67, 0.86);
  padding: 9px 10px;
}

.space-summary-item p {
  margin: 0;
  font-size: 11px;
  color: #b7d7f0;
  line-height: 1.2;
}

.space-summary-item strong {
  margin-top: 6px;
  display: block;
  font-size: 24px;
  color: #edf8ff;
  line-height: 1;
}

.space-summary-item small {
  margin-top: 6px;
  display: block;
  font-size: 10px;
  color: #8bc9ef;
  line-height: 1.2;
}

.space-rank-detail-row {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
}

.space-rank-card,
.space-selected-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.space-selected-card {
  overflow: hidden;
}

.space-rank-list {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  display: grid;
  flex: 1;
  grid-template-rows: repeat(5, minmax(0, 1fr));
  gap: 4px;
  overflow-y: hidden;
  min-height: 0;
}

.space-rank-card h4 {
  font-size: 15px;
}

.space-rank-item {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border: 1px solid rgba(112, 190, 248, 0.35);
  border-radius: 8px;
  background: rgba(11, 45, 79, 0.75);
  padding: 6px 8px;
  color: #e6f5ff;
  cursor: pointer;
}

.space-rank-item.active {
  border-color: rgba(122, 223, 255, 0.85);
  box-shadow: inset 0 0 0 1px rgba(122, 223, 255, 0.35);
}

.space-rank-item-head {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) auto;
  gap: 6px;
  align-items: center;
}

.space-rank-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid rgba(124, 202, 255, 0.55);
  color: #d7f0ff;
  font-size: 12px;
}

.space-rank-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  font-size: 14px;
}

.space-rank-count {
  font-size: 16px;
  font-weight: 700;
  color: #eaf8ff;
}

.space-rank-bar-bg {
  margin-top: 6px;
  display: block;
  width: 100%;
  height: 7px;
  border-radius: 999px;
  background: rgba(80, 123, 163, 0.65);
  overflow: hidden;
}

.space-rank-bar-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #52d9ff, #70ecff);
}

.space-selected-fields {
  margin-top: 10px;
  display: grid;
  flex: 1;
  min-width: 0;
  min-height: 0;
  gap: 8px;
  overflow-y: auto;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: #3ad7ff transparent;
}

.space-selected-fields::-webkit-scrollbar {
  width: 6px;
}

.space-selected-fields::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #3ad7ff, #2f5dff);
  border-radius: 999px;
}

.space-selected-fields p {
  margin: 0;
  min-width: 0;
  border: 1px solid rgba(108, 192, 250, 0.35);
  border-radius: 10px;
  background: rgba(8, 34, 66, 0.85);
  color: #edf8ff;
  font-size: 13px;
  line-height: 1.35;
  word-break: break-all;
  overflow-wrap: anywhere;
  padding: 8px 10px;
}

.space-selected-fields p span {
  color: #8ccbf0;
}

.space-rank-card .empty-tip,
.space-selected-card .empty-tip {
  font-size: 13px;
}

.space-detail-table-row {
  min-height: 0;
}

.space-detail-grid-wrap {
  --user-detail-grid-columns: minmax(0, 1.1fr) minmax(0, 1.4fr) minmax(0, 0.9fr) minmax(0, 0.9fr) 70px;
}

.key-user-detail-modal.user-detail-modal {
  max-height: min(92vh, 760px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.key-user-detail-modal .user-detail-modal-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: grid;
  grid-template-rows: repeat(4, auto) minmax(0, 1fr) minmax(0, 1fr);
}

.key-user-detail-modal .user-detail-modal-content.sensitive-list-empty {
  grid-template-rows: repeat(4, auto) minmax(0, 1fr) auto;
}

.space-user-list-card {
  border: 1px solid rgba(111, 138, 184, 0.28);
  border-radius: 8px;
  background: #0c1f39a3;
  padding: 8px;
  color: #e8f6ff;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}

.important-list-card {
  max-height: 220px;
}

.sensitive-list-card.is-empty {
  grid-template-rows: auto;
  align-content: start;
}

.space-user-list-title {
  margin: 0 0 8px;
  color: #8fc0e5;
  font-size: 12px;
  line-height: 1.35;
}

.space-user-list {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 6px;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #3ad7ff transparent;
}

.space-user-list::-webkit-scrollbar {
  width: 6px;
}

.space-user-list::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #3ad7ff, #2f5dff);
  border-radius: 999px;
}

.important-user-list {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.important-user-list::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.important-user-list::-webkit-scrollbar-thumb {
  background: transparent;
}

.space-user-list li {
  font-size: 12px;
  line-height: 1.35;
  word-break: break-all;
}

.space-user-list-empty {
  margin: 0;
  color: #c4dff6;
  font-size: 12px;
  line-height: 1.35;
  min-height: 0;
  overflow-y: auto;
}

.sensitive-list-card.is-empty .space-user-list-empty {
  overflow: visible;
}

@media (max-width: 1280px) {
  .space-summary-item strong {
    font-size: 20px;
  }

  .space-rank-name {
    font-size: 13px;
  }

  .space-rank-count {
    font-size: 15px;
  }
}

@media (max-width: 960px) {
  .space-summary-grid,
  .space-rank-detail-row {
    grid-template-columns: 1fr;
  }
}
</style>
