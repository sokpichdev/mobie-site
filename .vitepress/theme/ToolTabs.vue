<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ tabs: string[] }>()
const active = ref(0)
</script>

<template>
  <div class="tool-tabs">
    <div class="tool-tabs__bar" role="tablist">
      <button
        v-for="(tab, i) in props.tabs"
        :key="tab"
        type="button"
        role="tab"
        :aria-selected="active === i"
        :class="{ 'is-active': active === i }"
        @click="active = i"
      >
        {{ tab }}
      </button>
    </div>
    <div v-for="(tab, i) in props.tabs" v-show="active === i" :key="tab" class="tool-tabs__panel" role="tabpanel">
      <slot :name="`tab-${i}`" />
    </div>
  </div>
</template>

<style scoped>
.tool-tabs {
  border: 1px solid var(--m-border);
  border-radius: var(--m-radius);
  margin: 1.6rem 0;
  overflow: hidden;
}

.tool-tabs__bar {
  display: flex;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--m-border);
  background: var(--m-surface);
}

.tool-tabs__bar button {
  font-family: var(--m-font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--m-text-3);
  padding: 0.7rem 0.95rem;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: transparent;
  cursor: pointer;
  transition: color 0.12s ease, border-color 0.12s ease;
}

.tool-tabs__bar button:hover {
  color: var(--m-text);
}

.tool-tabs__bar button.is-active {
  color: var(--m-accent);
  border-bottom-color: var(--m-accent);
}

.tool-tabs__bar button:focus-visible {
  outline: 2px solid var(--m-accent);
  outline-offset: -2px;
}

.tool-tabs__panel {
  padding: 0.2rem 1.1rem;
}

.tool-tabs__panel :deep(div[class*='language-']) {
  margin: 1rem 0;
}
</style>
