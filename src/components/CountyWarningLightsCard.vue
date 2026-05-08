<script setup>
const props = defineProps({
  countyWarningLights: {
    type: Array,
    required: true,
  },
})
</script>

<template>
  <article class="module-block county-warning-lights-block">
    <div class="county-warning-lights-head">
      <h3>区县警示灯</h3>
      <p>唐山全区县停电状态</p>
    </div>

    <ul class="county-warning-lights-grid">
      <li v-for="item in props.countyWarningLights" :key="item.countyName" class="county-warning-light-item">
        <span class="county-warning-light-dot" :class="item.hasOutage ? 'danger' : 'safe'"></span>
        <span class="county-warning-light-name">{{ item.countyName }}</span>
      </li>
    </ul>
  </article>
</template>

<style scoped>
.county-warning-lights-block {
  gap: 10px;
}

.county-warning-lights-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.county-warning-lights-head h3 {
  margin: 0;
}

.county-warning-lights-head p {
  margin: 0;
  font-size: 12px;
  color: var(--text-sub);
}

.county-warning-lights-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.county-warning-light-item {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(121, 200, 255, 0.28);
  border-radius: 8px;
  padding: 6px 8px;
  background: #04213cad;
}

.county-warning-light-dot {
  width: 10px;
  height: 10px;
  flex: 0 0 10px;
  border-radius: 50%;
}

.county-warning-light-dot.safe {
  background: radial-gradient(circle at 30% 30%, #b8ffd8 0%, #4bfbac 72%, #23c77d 100%);
  box-shadow: 0 0 8px rgba(75, 251, 172, 0.6);
}

.county-warning-light-dot.danger {
  background: radial-gradient(circle at 30% 30%, #ffc5c5 0%, #ff6464 72%, #d73838 100%);
  box-shadow: 0 0 8px rgba(255, 100, 100, 0.62);
}

.county-warning-light-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #e8f6ff;
}

@media (max-width: 760px) {
  .county-warning-lights-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
