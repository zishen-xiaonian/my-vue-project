<script setup>
import { computed, ref } from 'vue'

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
    default: '重要用户户数',
  },
  sensitiveLabel: {
    type: String,
    default: '敏感用户户数',
  },
  detailRows: {
    type: Array,
    default: () => [],
  },
})

const toCount = (value) => Math.max(0, Number(value) || 0)

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
    return {
      ...item,
      trackPercent: total > 0 ? (total / base) * 100 : 0,
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
    minWidth: '24px',
  }
}

const detailPageVisible = ref(false)
const detailModalVisible = ref(false)
const selectedDetailRow = ref(null)

const normalizedDetailRows = computed(() =>
  props.detailRows.map((item, index) => {
    const deviceNo = String(item?.deviceNo || '').trim() || '-'
    const deviceName = String(item?.deviceName || '').trim() || '-'
    const importantUserCount = toCount(item?.importantUserCount)
    const sensitiveUserCount = toCount(item?.sensitiveUserCount)
    const importantUserList = Array.isArray(item?.importantUserList) ? item.importantUserList : []
    const sensitiveUserList = Array.isArray(item?.sensitiveUserList) ? item.sensitiveUserList : []

    return {
      id: String(item?.key || `${deviceNo}-${deviceName}-${index}`),
      deviceNo,
      deviceName,
      importantUserCount,
      sensitiveUserCount,
      importantUserList,
      sensitiveUserList,
    }
  }),
)

const openDetailPage = () => {
  detailPageVisible.value = true
}

const closeDetailPage = () => {
  detailPageVisible.value = false
  detailModalVisible.value = false
  selectedDetailRow.value = null
}

const openDetailModal = (item) => {
  selectedDetailRow.value = item
  detailModalVisible.value = true
}

const closeDetailModal = () => {
  detailModalVisible.value = false
  selectedDetailRow.value = null
}
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

      <section class="key-user-table-module user-detail-table-module">
        <div class="key-user-grid-wrap user-detail-grid-wrap">
          <ul class="key-user-grid-body user-detail-grid-body">
            <li class="key-user-grid user-detail-grid user-detail-grid-head">
              <span>设备编号</span>
              <span>设备名称</span>
              <span>重点用户数</span>
              <span>敏感用户数</span>
              <span>详情</span>
            </li>
            <li v-for="item in normalizedDetailRows" :key="item.id" class="key-user-grid user-detail-grid user-detail-grid-row">
              <span class="user-detail-cell" :title="item.deviceNo">{{ item.deviceNo }}</span>
              <span class="user-detail-cell" :title="item.deviceName">{{ item.deviceName }}</span>
              <span class="user-detail-cell">{{ item.importantUserCount }}</span>
              <span class="user-detail-cell">{{ item.sensitiveUserCount }}</span>
              <button type="button" class="detail-btn" @click.stop="openDetailModal(item)">详情</button>
            </li>
          </ul>

          <p v-if="normalizedDetailRows.length === 0" class="empty-tip">当前区域暂无设备影响用户数据。</p>
        </div>
      </section>

      <div v-if="detailModalVisible && selectedDetailRow" class="user-detail-modal-mask" @click.self="closeDetailModal">
        <article class="user-detail-modal key-user-detail-modal">
          <button type="button" class="user-detail-modal-close" @click="closeDetailModal">×</button>
          <h4>设备影响用户详情</h4>
          <div class="user-detail-modal-content">
            <p><span>设备编号：</span>{{ selectedDetailRow.deviceNo }}</p>
            <p><span>设备名称：</span>{{ selectedDetailRow.deviceName }}</p>
            <p><span>重点用户数：</span>{{ selectedDetailRow.importantUserCount }}</p>
            <p><span>敏感用户数：</span>{{ selectedDetailRow.sensitiveUserCount }}</p>

            <div class="space-user-list-card">
              <p class="space-user-list-title">重点用户清单：</p>
              <ul v-if="selectedDetailRow.importantUserList.length > 0" class="space-user-list">
                <li v-for="item in selectedDetailRow.importantUserList" :key="`important-${item}`">{{ item }}</li>
              </ul>
              <p v-else class="space-user-list-empty">无</p>
            </div>

            <div class="space-user-list-card">
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

.space-user-list-card {
  border: 1px solid rgba(111, 138, 184, 0.28);
  border-radius: 8px;
  background: #0c1f39a3;
  padding: 8px;
  color: #e8f6ff;
}

.space-user-list-title {
  margin: 0 0 8px;
  color: #8fc0e5;
}

.space-user-list {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 6px;
}

.space-user-list li {
  line-height: 1.35;
  word-break: break-all;
}

.space-user-list-empty {
  margin: 0;
  color: #c4dff6;
}

.user-detail-grid-head span:nth-child(4) {
  margin-left: 0;
  text-overflow: clip;
}

.user-detail-grid-row .user-detail-cell:nth-child(4) {
  margin-left: 0;
}

.user-detail-grid-head span:nth-child(5),
.user-detail-grid-row .detail-btn {
  margin-left: 34px;
}
</style>
