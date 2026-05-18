<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  selectedFaultCounty: {
    type: String,
    default: '',
  },
  countyRegionOptions: {
    type: Array,
    required: true,
  },
  faultLocationSummary: {
    type: Object,
    required: true,
  },
  filteredFaultOutageEventsLength: {
    type: Number,
    default: 0,
  },
  showOutageDetailPage: {
    type: Boolean,
    default: false,
  },
  outageNatureOverview: {
    type: Object,
    required: true,
  },
  outageRestoreOverview: {
    type: Object,
    required: true,
  },
  outageDetailSearchInput: {
    type: String,
    default: '',
  },
  outageDetailSelectedNature: {
    type: String,
    default: '',
  },
  pagedOutageDetailRows: {
    type: Array,
    required: true,
  },
  filteredOutageDetailRowsLength: {
    type: Number,
    default: 0,
  },
  outageDetailPageButtons: {
    type: Array,
    required: true,
  },
  outageDetailCurrentPage: {
    type: Number,
    default: 1,
  },
  outageDetailJumpPageInput: {
    type: [String, Number],
    default: '',
  },
  outageDetailTotalPages: {
    type: Number,
    default: 1,
  },
  outageDetailLoading: {
    type: Boolean,
    default: false,
  },
  outageDetailModalVisible: {
    type: Boolean,
    default: false,
  },
  selectedOutageDetail: {
    type: Object,
    default: null,
  },
  outageDetailGridBodyRefSetter: {
    type: Function,
    default: null,
  },
  outageDetailPaginationRefSetter: {
    type: Function,
    default: null,
  },
  outageDetailPageJumpRefSetter: {
    type: Function,
    default: null,
  },
})

const emit = defineEmits([
  'update:selected-fault-county',
  'open-outage-detail',
  'fault-mode-change',
  'close-outage-detail',
  'update:outage-detail-search-input',
  'apply-outage-detail-search',
  'update:outage-detail-selected-nature',
  'open-outage-detail-modal',
  'go-outage-detail-page',
  'update:outage-detail-jump-page-input',
  'jump-to-outage-detail-page',
  'close-outage-detail-modal',
])

const onCountyChange = (event) => {
  emit('update:selected-fault-county', event?.target?.value || '')
}

const updateOutageDetailSearchInput = (event) => {
  emit('update:outage-detail-search-input', event?.target?.value || '')
}

const updateOutageDetailSelectedNature = (event) => {
  emit('update:outage-detail-selected-nature', event?.target?.value || '')
}

const updateOutageDetailJumpPageInput = (event) => {
  emit('update:outage-detail-jump-page-input', event?.target?.value || '')
}

const modeOptions = [
  { key: 'feeder', label: '线路' },
  { key: 'substation', label: '变电站' },
]
const legendItems = [
  { key: 'danger', label: '影响用户数：大于5000' },
  { key: 'warning', label: '影响用户数：1000-5000' },
  { key: 'safe', label: '影响用户数：小于1000' },
]

const activeFaultMode = ref('feeder')

const activeModeSummary = computed(() => {
  const fallback = {
    key: activeFaultMode.value,
    label: modeOptions.find((item) => item.key === activeFaultMode.value)?.label || '线路',
    total: 0,
    matchedEvents: 0,
    bars: [
      { key: 'danger', colorLabel: '红色', count: 0 },
      { key: 'warning', colorLabel: '黄色', count: 0 },
      { key: 'safe', colorLabel: '绿色', count: 0 },
    ],
  }
  return props.faultLocationSummary?.modes?.[activeFaultMode.value] || fallback
})

const activeModeBars = computed(() => {
  const bars = Array.isArray(activeModeSummary.value?.bars) ? activeModeSummary.value.bars : []
  const maxCount = Math.max(...bars.map((item) => Number(item?.count || 0)), 1)
  return bars.map((item) => {
    const count = Number(item?.count || 0)
    const basePercent = maxCount > 0 ? (count / maxCount) * 100 : 0
    const heightPercent = count > 0 ? Math.max(basePercent, 18) : 0
    return {
      ...item,
      count,
      heightPercent,
    }
  })
})

const setFaultMode = (modeKey) => {
  if (activeFaultMode.value === modeKey) {
    return
  }
  activeFaultMode.value = modeKey
  emit('fault-mode-change', modeKey)
}
</script>

<template>
  <article class="module-block module-clickable" @click="emit('open-outage-detail', activeFaultMode)">
    <div class="fault-location-top">
      <div class="block-head fault-location-head">
        <h3>电力故障定位</h3>
      </div>
      <ul class="fault-legend-list" @click.stop>
        <li v-for="item in legendItems" :key="item.key" class="fault-legend-item">
          <span class="fault-legend-dot" :class="item.key"></span>
          <span>{{ item.label }}</span>
        </li>
      </ul>
    </div>

    <div class="fault-mode-switch" @click.stop>
      <button
        v-for="mode in modeOptions"
        :key="mode.key"
        type="button"
        class="fault-mode-btn"
        :class="{ active: mode.key === activeFaultMode }"
        @click.stop="setFaultMode(mode.key)"
      >
        {{ mode.label }}
      </button>
    </div>

    <div class="fault-bar-chart-wrap">
      <span class="fault-axis-label">数量</span>
      <div class="fault-bar-chart">
        <div v-for="bar in activeModeBars" :key="`${activeModeSummary.key}-${bar.key}`" class="fault-bar-item">
          <div class="fault-bar-zone">
            <span class="fault-bar-count" :class="{ zero: bar.count === 0 }">{{ bar.count }}</span>
            <span v-if="bar.count > 0" class="fault-bar" :class="bar.key" :style="{ height: `${bar.heightPercent}%` }"></span>
          </div>
        </div>
      </div>
    </div>

    <p class="event-meta">
      当前{{ activeModeSummary.label }}数量：{{ activeModeSummary.total }}，当前区域：{{ props.selectedFaultCounty || '-' }}，停电事件 {{ activeModeSummary.matchedEvents ?? props.filteredFaultOutageEventsLength }} 条
    </p>
  </article>

  <section v-if="props.showOutageDetailPage" class="card outage-detail-layer">
    <header class="outage-detail-layer-head">
      <h3>停电事件详情（{{ props.selectedFaultCounty || '-' }}）</h3>
      <button type="button" class="outage-detail-close" @click="emit('close-outage-detail')">×</button>
    </header>

    <section class="outage-nature-overview-module">
      <article class="outage-nature-pie-card">
        <div class="outage-nature-pie-head">
          <h4>停电性质占比</h4>
          <div class="outage-nature-pie-metas">
            <span class="outage-nature-pie-meta planned">
              计划停电 {{ props.outageNatureOverview.planned.count }}条 / {{ props.outageNatureOverview.planned.rateText }}
            </span>
            <span class="outage-nature-pie-meta fault">
              故障停电 {{ props.outageNatureOverview.fault.count }}条 / {{ props.outageNatureOverview.fault.rateText }}
            </span>
            <span class="outage-nature-pie-meta other">
              其他 {{ props.outageNatureOverview.other.count }}条 / {{ props.outageNatureOverview.other.rateText }}
            </span>
          </div>
        </div>

        <div class="outage-nature-pie-wrap">
          <div class="outage-nature-pie" :style="{ background: props.outageNatureOverview.pieBackground }">
            <div class="outage-nature-pie-center">
              <strong>{{ props.outageNatureOverview.total }}</strong>
              <span>总停电事件</span>
            </div>
          </div>
        </div>

        <p class="outage-nature-card-note"></p>
      </article>

      <article class="outage-restore-card">
        <div class="outage-restore-head">
          <h4>复电情况</h4>
          <span class="outage-restore-meta">
            已复电 {{ props.outageRestoreOverview.restored.count }}条 / {{ props.outageRestoreOverview.restored.rateText }}
          </span>
        </div>

        <div class="outage-restore-progress">
          <div class="outage-restore-progress-track">
            <span class="outage-restore-progress-fill" :style="{ width: props.outageRestoreOverview.restored.rateText }"></span>
          </div>
          <div class="outage-restore-progress-foot">
            <span>待复电 {{ props.outageRestoreOverview.unrestored.count }}条</span>
            <span>总事件 {{ props.outageRestoreOverview.total }}条</span>
          </div>
        </div>
      </article>
    </section>

    <section class="outage-detail-table-module">
      <div class="outage-detail-query-bar">
        <input
          :value="props.outageDetailSearchInput"
          type="text"
          class="outage-detail-query-input"
          placeholder="请输入事件ID"
          @input="updateOutageDetailSearchInput"
          @keyup.enter="emit('apply-outage-detail-search')"
        />
        <button type="button" class="outage-detail-query-btn" @click="emit('apply-outage-detail-search')">查询</button>
        <select :value="props.outageDetailSelectedNature" class="outage-detail-nature-select" @change="updateOutageDetailSelectedNature">
          <option value="">全部</option>
          <option value="计划停电">计划停电</option>
          <option value="故障停电">故障停电</option>
          <option value="其他">其他</option>
        </select>
      </div>

      <div class="outage-detail-grid-wrap">
        <ul :ref="props.outageDetailGridBodyRefSetter" class="outage-detail-grid-body">
          <li class="outage-detail-grid outage-detail-grid-head">
            <span>事件ID</span>
            <span>区县单位</span>
            <span>影响户数</span>
            <span>停电性质</span>
            <span>详情</span>
          </li>
          <li
            v-for="item in props.outageDetailLoading ? [] : props.pagedOutageDetailRows"
            :key="item.id"
            class="outage-detail-grid outage-detail-grid-row"
          >
            <span class="outage-detail-cell" :title="item.outageNumber">{{ item.outageNumber }}</span>
            <span class="outage-detail-cell" :title="item.countyName">{{ item.countyName }}</span>
            <span class="outage-detail-cell" :title="String(item.affectedConsCnt)">{{ item.affectedConsCnt }}</span>
            <span class="outage-detail-cell" :title="item.outageNature">{{ item.outageNature }}</span>
            <button type="button" class="detail-btn" @click="emit('open-outage-detail-modal', item)">详情</button>
          </li>
        </ul>

        <p v-if="props.outageDetailLoading || props.pagedOutageDetailRows.length === 0" class="empty-tip">
          {{ props.outageDetailLoading ? '数据加载中...' : '当前区域暂无停电事件详情。' }}
        </p>
      </div>

      <footer :ref="props.outageDetailPaginationRefSetter" class="user-detail-pagination" v-if="props.filteredOutageDetailRowsLength > 0">
        <button
          v-for="page in props.outageDetailPageButtons"
          :key="`outage-page-${page}`"
          type="button"
          class="page-btn"
          :class="{ active: page === props.outageDetailCurrentPage }"
          @click="emit('go-outage-detail-page', page)"
        >
          {{ page }}
        </button>

        <div :ref="props.outageDetailPageJumpRefSetter" class="outage-detail-page-jump">
          <input
            :value="props.outageDetailJumpPageInput"
            type="number"
            min="1"
            :max="props.outageDetailTotalPages"
            class="outage-detail-page-input"
            placeholder="页码"
            @input="updateOutageDetailJumpPageInput"
            @keyup.enter="emit('jump-to-outage-detail-page')"
          />
          <button type="button" class="outage-detail-page-jump-btn" @click="emit('jump-to-outage-detail-page')">跳转</button>
        </div>
      </footer>
    </section>

    <div
      v-if="props.outageDetailModalVisible && props.selectedOutageDetail"
      class="user-detail-modal-mask"
      @click.self="emit('close-outage-detail-modal')"
    >
      <article class="user-detail-modal outage-detail-modal">
        <button type="button" class="user-detail-modal-close" @click="emit('close-outage-detail-modal')">×</button>
        <h4>停电事件详情</h4>
        <div class="user-detail-modal-content">
          <p><span>停电开始时间：</span>{{ props.selectedOutageDetail.beginTime }}</p>
          <p><span>状态：</span>{{ props.selectedOutageDetail.status }}</p>
          <p><span>停电结束时间：</span>{{ props.selectedOutageDetail.endTime }}</p>
          <p><span>区县单位：</span>{{ props.selectedOutageDetail.countyName }}</p>
          <p><span>影响户数：</span>{{ props.selectedOutageDetail.affectedConsCnt }}</p>
          <p><span>停电线路：</span>{{ props.selectedOutageDetail.rdtFeederName }}</p>
          <p><span>所属变电站：</span>{{ props.selectedOutageDetail.rdtSubsName }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.fault-location-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.fault-location-head {
  align-items: baseline;
  flex: 0 0 auto;
}

.fault-legend-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}

.fault-legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #cfdef4;
  line-height: 1.2;
}

.fault-legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex: 0 0 12px;
}

.fault-legend-dot.danger {
  background: #ff6363;
  box-shadow: 0 0 8px rgba(255, 99, 99, 0.62);
}

.fault-legend-dot.warning {
  background: #ffd35d;
  box-shadow: 0 0 8px rgba(255, 211, 93, 0.62);
}

.fault-legend-dot.safe {
  background: #65f0a8;
  box-shadow: 0 0 8px rgba(101, 240, 168, 0.62);
}

.fault-mode-switch {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  max-width: 246px;
}

.fault-mode-btn {
  height: 30px;
  border-radius: 7px;
  border: 1px solid rgba(112, 188, 247, 0.44);
  color: #d7ecff;
  background: rgba(8, 39, 72, 0.82);
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
}

.fault-mode-btn.active {
  border-color: rgba(121, 224, 255, 0.92);
  color: #072846;
  background: linear-gradient(135deg, #7de2f2, #74d4ef);
  box-shadow: 0 0 10px rgba(116, 212, 239, 0.3);
}

.fault-bar-chart-wrap {
  position: relative;
  border: 1px dashed rgba(102, 164, 220, 0.48);
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(8, 37, 68, 0.55), rgba(6, 28, 55, 0.68));
  padding: 18px 18px 8px 46px;
  min-height: 200px;
}

.fault-bar-chart {
  height: 170px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-items: end;
}

.fault-bar-item {
  min-width: 0;
  display: grid;
  justify-items: center;
  gap: 6px;
}

.fault-bar-zone {
  width: 40px;
  height: 132px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  position: relative;
}

.fault-bar-count {
  position: absolute;
  bottom: calc(100% + 8px);
  font-size: 15px;
  line-height: 1;
  font-weight: 700;
  color: #e4f3ff;
  white-space: nowrap;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
}

.fault-bar-count.zero {
  bottom: 6px;
}

.fault-bar {
  width: 100%;
  border-radius: 8px 8px 0 0;
}

.fault-bar.danger {
  background: linear-gradient(180deg, #ff9898 0%, #ff5f5f 65%, #e33d3d 100%);
  box-shadow: 0 0 10px rgba(255, 95, 95, 0.35);
}

.fault-bar.warning {
  background: linear-gradient(180deg, #ffe6a5 0%, #ffcb57 62%, #f2ac20 100%);
  box-shadow: 0 0 10px rgba(255, 200, 90, 0.35);
}

.fault-bar.safe {
  background: linear-gradient(180deg, #b9ffd9 0%, #58e7a2 62%, #20ba77 100%);
  box-shadow: 0 0 10px rgba(88, 231, 162, 0.35);
}

.fault-bar-label {
  font-size: 12px;
  line-height: 1;
  margin-top: 1px;
  color: #d5e7f8;
}

.fault-axis-label {
  position: absolute;
  left: 14px;
  top: 10px;
  font-size: 12px;
  line-height: 1;
  color: #bfd8ee;
}
</style>
