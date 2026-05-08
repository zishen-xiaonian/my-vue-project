<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  outageSummary: {
    type: Object,
    required: true,
  },
  outageRangeChains: {
    type: Array,
    required: true,
  },
  showOutageRangeAssessmentPage: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['open-outage-range-detail', 'close-outage-range-detail'])

const OUTAGE_RANGE_DEFAULT_PAGE_SIZE = 4
const OUTAGE_RANGE_MAX_PAGE_BUTTONS = 6
const OUTAGE_RANGE_MIN_CARD_HEIGHT = 136
const OUTAGE_RANGE_CARD_GAP = 8

const outageRangeChainListRef = ref(null)
const outageRangeCurrentPage = ref(1)
const outageRangeJumpPageInput = ref('')
const outageRangePageSize = ref(OUTAGE_RANGE_DEFAULT_PAGE_SIZE)

let outageRangeLayoutObserver = null

const openDetailPage = () => {
  emit('open-outage-range-detail')
}

const outageRangeTotalPages = computed(() => {
  const total = props.outageRangeChains.length
  if (total <= 0) {
    return 1
  }
  return Math.ceil(total / outageRangePageSize.value)
})

const outageRangePageStartIndex = computed(() => (outageRangeCurrentPage.value - 1) * outageRangePageSize.value)

const outageRangePagedChains = computed(() => {
  const start = outageRangePageStartIndex.value
  const end = start + outageRangePageSize.value
  return props.outageRangeChains.slice(start, end)
})

const outageRangeRenderedRows = computed(() => Math.max(1, outageRangePagedChains.value.length))

const outageRangePageButtons = computed(() => {
  const total = outageRangeTotalPages.value
  if (total <= OUTAGE_RANGE_MAX_PAGE_BUTTONS) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const half = Math.floor(OUTAGE_RANGE_MAX_PAGE_BUTTONS / 2)
  let start = outageRangeCurrentPage.value - half
  let end = outageRangeCurrentPage.value + half

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

const syncOutageRangePageSize = () => {
  const listEl = outageRangeChainListRef.value
  if (!listEl) {
    return
  }

  const usableHeight = listEl.clientHeight
  if (usableHeight <= 0) {
    return
  }

  const nextPageSize = Math.max(1, Math.floor((usableHeight + OUTAGE_RANGE_CARD_GAP) / (OUTAGE_RANGE_MIN_CARD_HEIGHT + OUTAGE_RANGE_CARD_GAP)))
  if (nextPageSize !== outageRangePageSize.value) {
    outageRangePageSize.value = nextPageSize
  }
}

const observeOutageRangeLayout = () => {
  if (typeof window === 'undefined' || !window.ResizeObserver) {
    return
  }

  const listEl = outageRangeChainListRef.value
  if (!listEl) {
    return
  }

  if (outageRangeLayoutObserver) {
    outageRangeLayoutObserver.disconnect()
  }

  outageRangeLayoutObserver = new window.ResizeObserver(() => {
    syncOutageRangePageSize()
  })

  outageRangeLayoutObserver.observe(listEl)
}

const stopObservingOutageRangeLayout = () => {
  if (outageRangeLayoutObserver) {
    outageRangeLayoutObserver.disconnect()
    outageRangeLayoutObserver = null
  }
}

const goOutageRangePage = (page) => {
  if (page < 1 || page > outageRangeTotalPages.value) {
    return
  }
  outageRangeCurrentPage.value = page
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

watch(
  () => outageRangeTotalPages.value,
  (total) => {
    if (outageRangeCurrentPage.value > total) {
      outageRangeCurrentPage.value = total
    }
  },
  { immediate: true },
)

watch(
  () => props.outageRangeChains,
  () => {
    outageRangeCurrentPage.value = 1
    outageRangeJumpPageInput.value = ''
    nextTick(() => {
      syncOutageRangePageSize()
    })
  },
  { deep: true },
)

watch(
  () => props.showOutageRangeAssessmentPage,
  (visible) => {
    if (visible) {
      outageRangeCurrentPage.value = 1
      outageRangeJumpPageInput.value = ''
      nextTick(() => {
        syncOutageRangePageSize()
        observeOutageRangeLayout()
      })
      return
    }

    stopObservingOutageRangeLayout()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopObservingOutageRangeLayout()
})
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

    <section v-if="props.outageRangeChains.length > 0" class="outage-range-chain-content">
      <section
        ref="outageRangeChainListRef"
        class="outage-range-chain-list"
        :style="{ '--outage-range-rows': String(outageRangeRenderedRows) }"
      >
        <article v-for="(item, index) in outageRangePagedChains" :key="item.key" class="outage-range-chain-card">
          <h4 class="outage-range-chain-title">
            【链路{{ outageRangePageStartIndex + index + 1 }}】停电事件编号（outageNumber）：{{ item.outageNumber }}
          </h4>
          <p class="outage-range-chain-link">
            馈线名称（{{ item.rdtFeederName }}） -> 变电站名称（{{ item.rdtSubsName }}） -> 所属供电所（{{ item.maintGroupName }}）
          </p>
          <p class="outage-range-chain-meta">重要用户（{{ item.importantUsers.length }}）：{{ item.importantUserText }}</p>
          <p class="outage-range-chain-meta">敏感用户（{{ item.sensitiveUsers.length }}）：{{ item.sensitiveUserText }}</p>
          <p class="outage-range-chain-meta">普通用户影响数量：{{ item.normalUserCount }}</p>
        </article>
      </section>

      <footer class="user-detail-pagination outage-range-pagination">
        <span class="outage-range-page-state">第 {{ outageRangeCurrentPage }} / {{ outageRangeTotalPages }} 页</span>
        <button
          v-for="page in outageRangePageButtons"
          :key="`outage-range-page-${page}`"
          type="button"
          class="page-btn"
          :class="{ active: page === outageRangeCurrentPage }"
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
  </section>
</template>
