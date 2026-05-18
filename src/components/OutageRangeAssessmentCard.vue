<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  outageSummary: {
    type: Object,
    required: true,
  },
  outageRangeChains: {
    type: Array,
    required: true,
  },
  outageRangeTotal: {
    type: Number,
    default: 0,
  },
  outageRangeCurrentPage: {
    type: Number,
    default: 1,
  },
  outageRangeLoading: {
    type: Boolean,
    default: false,
  },
  showOutageRangeAssessmentPage: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['open-outage-range-detail', 'go-outage-range-page', 'close-outage-range-detail'])

const OUTAGE_RANGE_DEFAULT_PAGE_SIZE = 4
const OUTAGE_RANGE_MAX_PAGE_BUTTONS = 6

const outageRangeJumpPageInput = ref('')
const outageRangeDetailVisible = ref(false)
const selectedOutageRangeChain = ref(null)

const openDetailPage = () => {
  emit('open-outage-range-detail')
}

const outageRangeTotalPages = computed(() => {
  const total = Math.max(Number(props.outageRangeTotal || 0), 0)
  if (total <= 0) {
    return 1
  }
  return Math.ceil(total / OUTAGE_RANGE_DEFAULT_PAGE_SIZE)
})

const outageRangePageStartIndex = computed(() => (props.outageRangeCurrentPage - 1) * OUTAGE_RANGE_DEFAULT_PAGE_SIZE)

const outageRangeRenderedRows = computed(() => OUTAGE_RANGE_DEFAULT_PAGE_SIZE)

const outageRangePageButtons = computed(() => {
  const total = outageRangeTotalPages.value
  if (total <= OUTAGE_RANGE_MAX_PAGE_BUTTONS) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const half = Math.floor(OUTAGE_RANGE_MAX_PAGE_BUTTONS / 2)
  let start = props.outageRangeCurrentPage - half
  let end = props.outageRangeCurrentPage + half

  if (start < 1) {
    start = 1
    end = OUTAGE_RANGE_MAX_PAGE_BUTTONS
  }

  if (end > total) {
    end = total
    start = total - OUTAGE_RANGE_MAX_PAGE_BUTTONS + 1
  }

  const pages = []
  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }
  return pages
})

const goOutageRangePage = (page) => {
  if (page < 1 || page > outageRangeTotalPages.value) {
    return
  }
  emit('go-outage-range-page', page)
}

const updateOutageRangeJumpPageInput = (event) => {
  outageRangeJumpPageInput.value = event?.target?.value || ''
}

const jumpToOutageRangePage = () => {
  const input = String(outageRangeJumpPageInput.value ?? '').trim()
  if (!input) {
    return
  }

  const parsed = Number(input)
  if (!Number.isFinite(parsed)) {
    return
  }

  const target = Math.min(outageRangeTotalPages.value, Math.max(1, Math.round(parsed)))
  goOutageRangePage(target)
  outageRangeJumpPageInput.value = String(target)
}

const openOutageRangeChainDetail = (item) => {
  selectedOutageRangeChain.value = item || null
  outageRangeDetailVisible.value = true
}

const closeOutageRangeChainDetail = () => {
  outageRangeDetailVisible.value = false
  selectedOutageRangeChain.value = null
}

watch(
  () => props.showOutageRangeAssessmentPage,
  (visible) => {
    if (visible) {
      outageRangeJumpPageInput.value = ''
    } else {
      closeOutageRangeChainDetail()
    }
  },
  { immediate: true },
)
</script>

<template>
  <article
    class="module-block module-clickable"
    role="button"
    tabindex="0"
    @click="openDetailPage"
    @keydown.enter.prevent="openDetailPage"
    @keydown.space.prevent="openDetailPage"
  >
    <h3>停电范围评估</h3>
    <div class="summary-grid">
      <div class="summary-card">
        <p>已复电事件数</p>
        <strong>{{ Math.max(Number(props.outageSummary.totalEvents || 0) - Number(props.outageSummary.activeEvents || 0), 0) }}</strong>
      </div>
      <div class="summary-card">
        <p>未复电事件数</p>
        <strong>{{ props.outageSummary.activeEvents }}</strong>
      </div>
      <div class="summary-card">
        <p>影响设备</p>
        <strong>{{ props.outageSummary.totalEquipments }}</strong>
      </div>
      <div class="summary-card">
        <p>影响用户</p>
        <strong>{{ props.outageSummary.totalUsers }}</strong>
      </div>
    </div>
  </article>

  <section v-if="props.showOutageRangeAssessmentPage" class="card outage-range-assessment-layer">
    <header class="outage-range-assessment-layer-head">
      <h3>停电范围评估</h3>
      <button type="button" class="outage-range-assessment-close" @click="emit('close-outage-range-detail')">×</button>
    </header>

    <p v-if="props.outageRangeLoading" class="empty-tip">数据加载中...</p>

    <section v-else-if="props.outageRangeChains.length > 0" class="outage-range-chain-content">
      <section
        class="outage-range-chain-list"
        :style="{ '--outage-range-rows': String(outageRangeRenderedRows) }"
      >
        <article
          v-for="(item, index) in props.outageRangeChains"
          :key="item.key"
          class="outage-range-chain-card"
          role="button"
          tabindex="0"
          @click="openOutageRangeChainDetail(item)"
          @keydown.enter.prevent="openOutageRangeChainDetail(item)"
          @keydown.space.prevent="openOutageRangeChainDetail(item)"
        >
          <h4 class="outage-range-chain-title">
            【链路{{ outageRangePageStartIndex + index + 1 }}】停电事件编号：{{ item.outageNumber }}
          </h4>
          <p class="outage-range-chain-meta">
            <span class="outage-range-meta-label">重要用户</span>
            <span class="outage-range-count-pill">{{ item.importantUsers.length }}</span>
            ：{{ item.importantUserText }}
          </p>
          <p class="outage-range-chain-meta">
            <span class="outage-range-meta-label">敏感用户</span>
            <span class="outage-range-count-pill">{{ item.sensitiveUsers.length }}</span>
            ：{{ item.sensitiveUserText }}
          </p>
          <p class="outage-range-chain-meta">
            <span class="outage-range-meta-label">普通用户影响数量</span>
            <span class="outage-range-count-pill">{{ item.normalUserCount }}</span>
          </p>
          <div class="outage-range-chain-actions">
            <button type="button" class="detail-btn" @click.stop="openOutageRangeChainDetail(item)">详情</button>
          </div>
        </article>
      </section>

      <footer class="user-detail-pagination outage-range-pagination">
        <span class="outage-range-page-state">第 {{ props.outageRangeCurrentPage }} / {{ outageRangeTotalPages }} 页</span>
        <button
          v-for="page in outageRangePageButtons"
          :key="`outage-range-page-${page}`"
          type="button"
          class="page-btn"
          :class="{ active: page === props.outageRangeCurrentPage }"
          @click="goOutageRangePage(page)"
        >
          {{ page }}
        </button>

        <div class="outage-detail-page-jump">
          <input
            :value="outageRangeJumpPageInput"
            type="number"
            min="1"
            :max="outageRangeTotalPages"
            class="outage-detail-page-input"
            placeholder="页码"
            @input="updateOutageRangeJumpPageInput"
            @keyup.enter="jumpToOutageRangePage"
          />
          <button type="button" class="outage-detail-page-jump-btn" @click="jumpToOutageRangePage">跳转</button>
        </div>
      </footer>
    </section>

    <p v-else class="empty-tip">当前暂无链路影响用户数据。</p>

    <section
      v-if="outageRangeDetailVisible && selectedOutageRangeChain"
      class="user-detail-modal-mask"
      @click.self="closeOutageRangeChainDetail"
    >
      <article class="user-detail-modal outage-range-detail-modal">
        <button type="button" class="user-detail-modal-close" @click="closeOutageRangeChainDetail">×</button>
        <h4>链路详情</h4>
        <div class="user-detail-modal-content">
          <p><span>停电事件编号：</span>{{ selectedOutageRangeChain.outageNumber || '-' }}</p>
          <p><span>重要用户（{{ selectedOutageRangeChain.importantUsers?.length || 0 }}）：</span>{{ selectedOutageRangeChain.importantUserText || '无' }}</p>
          <p><span>敏感用户（{{ selectedOutageRangeChain.sensitiveUsers?.length || 0 }}）：</span>{{ selectedOutageRangeChain.sensitiveUserText || '无' }}</p>
          <p><span>普通用户影响数量：</span>{{ selectedOutageRangeChain.normalUserCount ?? 0 }}</p>
        </div>
      </article>
    </section>
  </section>
</template>
