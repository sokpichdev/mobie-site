<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { frontmatter } = useData()

const PLATFORM_LABELS: Record<string, string> = {
  ios: 'iOS',
  android: 'Android',
  flutter: 'Flutter',
  react_native: 'React Native'
}

const UI_LABELS: Record<string, string> = {
  swiftui: 'SwiftUI',
  uikit: 'UIKit',
  mixed: 'Mixed'
}

const parts = computed(() => {
  const out: string[] = []
  const platform = frontmatter.value.platform
  const ui = frontmatter.value.ui
  if (typeof platform === 'string' && PLATFORM_LABELS[platform]) out.push(PLATFORM_LABELS[platform])
  if (typeof ui === 'string' && UI_LABELS[ui]) out.push(UI_LABELS[ui])
  return out
})
</script>

<template>
  <div v-if="parts.length" class="mobie-badge">
    <span v-for="part in parts" :key="part" class="mobie-badge__chip">{{ part }}</span>
  </div>
</template>

<style scoped>
.mobie-badge {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 1.25rem;
}

.mobie-badge__chip {
  font-family: var(--mobie-font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  /* 0.7rem mono — small type takes the darker accent step. */
  color: var(--mobie-accent-text);
  border: 1px solid var(--mobie-accent);
  border-radius: 99px;
  padding: 0.15rem 0.6rem;
}
</style>
