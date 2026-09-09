<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { TreeRow } from '../toolkit-tree'
import { SESSION_TRANSCRIPT, CONTRAST } from './hero-data'

defineProps<{ tree: TreeRow[] }>()

const TABS = ['Tree', 'Session', 'Before/After'] as const

const active = ref(0)

/**
 * Until the component mounts, every panel renders — so a reader with JavaScript off, or
 * one who reaches the page before hydration, sees all three proofs stacked rather than a
 * single tab bar that does nothing. The tab UI is the enhancement, not the content.
 */
const interactive = ref(false)
onMounted(() => (interactive.value = true))

function shown(i: number): boolean {
  return !interactive.value || active.value === i
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
  event.preventDefault()
  const delta = event.key === 'ArrowRight' ? 1 : -1
  active.value = (active.value + delta + TABS.length) % TABS.length
  const bar = event.currentTarget as HTMLElement
  ;(bar.children[active.value] as HTMLButtonElement).focus()
}
</script>

<template>
  <div class="frame" :class="{ 'frame--static': !interactive }">
    <div v-show="interactive" class="frame__bar" role="tablist" aria-label="Proof" @keydown="onKeydown">
      <button
        v-for="(tab, i) in TABS"
        :id="`hero-tab-${i}`"
        :key="tab"
        type="button"
        role="tab"
        :aria-selected="active === i"
        :aria-controls="`hero-panel-${i}`"
        :tabindex="active === i ? 0 : -1"
        :class="{ 'is-active': active === i }"
        @click="active = i"
      >
        {{ tab }}
      </button>
    </div>

    <!-- TREE — the real toolkit shape, counted at build time. -->
    <div id="hero-panel-0" v-show="shown(0)" class="frame__panel" role="tabpanel" aria-labelledby="hero-tab-0">
      <p class="frame__static-label">The toolkit</p>
      <p class="tree__root">.mobile-agents/</p>
      <ul class="tree">
        <li v-for="(row, i) in tree" :key="row.slug">
          <a :href="row.link">
            <span class="tree__branch">{{ i === tree.length - 1 ? '└──' : '├──' }}</span>
            <span class="tree__name">{{ row.slug }}/</span>
            <span class="tree__dots" aria-hidden="true" />
            <span class="tree__count">{{ row.count }}</span>
          </a>
        </li>
      </ul>
    </div>

    <!-- SESSION — authored transcript, not a recording. See hero-data.ts. -->
    <div id="hero-panel-1" v-show="shown(1)" class="frame__panel" role="tabpanel" aria-labelledby="hero-tab-1">
      <p class="frame__static-label">A session</p>
      <ol class="session">
        <li v-for="line in SESSION_TRANSCRIPT" :key="line.text" :class="`session--${line.kind}`">
          {{ line.text }}
        </li>
      </ol>
    </div>

    <!-- BEFORE/AFTER — the code contrast, moved here from its own section. -->
    <div id="hero-panel-2" v-show="shown(2)" class="frame__panel" role="tabpanel" aria-labelledby="hero-tab-2">
      <p class="frame__static-label">The difference</p>
      <div v-for="col in CONTRAST" :key="col.tone" class="contrast" :class="`contrast--${col.tone}`">
        <p class="contrast__label">{{ col.label }}</p>
        <pre><code>{{ col.code }}</code></pre>
        <p class="contrast__note">{{ col.note }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.frame {
  border: 1px solid var(--m-border);
  border-radius: var(--m-radius);
  background: var(--m-surface);
  /* 26rem fit the panels at their old, smaller reading sizes. Raised to 28rem
     alongside those sizes so the tree/transcript/contrast panels still fit
     without reflowing against the taller text. */
  min-height: 28rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Pre-hydration and no-JS: panels stack, so nothing is hidden behind a script. */
.frame--static .frame__panel + .frame__panel {
  border-top: 1px solid var(--m-border);
}

.frame__static-label {
  display: none;
  font-family: var(--m-font-mono);
  font-size: var(--m-t-label);
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--m-text-3);
  margin: 0 0 var(--m-s-2);
}

.frame--static .frame__static-label {
  display: block;
}

.frame__bar {
  display: flex;
  border-bottom: 1px solid var(--m-border);
  background: var(--m-bg-alt);
}

.frame__bar button {
  font-family: var(--m-font-mono);
  font-size: var(--m-t-label);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--m-text-3);
  padding: var(--m-s-2) var(--m-s-3);
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: transparent;
  cursor: pointer;
  transition: color 0.12s ease, border-color 0.12s ease;
}

.frame__bar button:hover {
  color: var(--m-text);
}

.frame__bar button.is-active {
  color: var(--m-accent);
  border-bottom-color: var(--m-accent);
}

.frame__bar button:focus-visible {
  outline: 2px solid var(--m-accent);
  outline-offset: -2px;
}

.frame__panel {
  flex: 1;
  padding: var(--m-s-4);
  font-family: var(--m-font-mono);
  /* Was 0.8rem — the tree, transcript and contrast proofs are the hero's main
     evidence and were reading below the ramp's own small step. */
  font-size: 0.86rem;
  line-height: 1.75;
}

/* ── Tree ─────────────────────────────────────────────────────────────────── */
.tree__root {
  color: var(--m-text-2);
  margin: 0 0 var(--m-s-1);
}

.tree {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tree a {
  display: flex;
  align-items: baseline;
  gap: var(--m-s-1);
  color: var(--m-text-2);
  text-decoration: none;
  padding: 1px 0;
  transition: color 0.12s ease;
}

.tree a:hover {
  color: var(--m-accent);
}

.tree__branch {
  color: var(--m-text-3);
}

.tree__dots {
  flex: 1;
  border-bottom: 1px dotted var(--m-border-strong);
  transform: translateY(-3px);
}

.tree__count {
  color: var(--m-text);
  font-variant-numeric: tabular-nums;
}

/* ── Session ──────────────────────────────────────────────────────────────── */
.session {
  list-style: none;
  margin: 0;
  padding: 0;
  color: var(--m-text-2);
}

.session li {
  padding: 1px 0;
}

.session--prompt {
  color: var(--m-text);
}

.session--ok {
  color: var(--m-positive);
  margin-top: var(--m-s-2);
}

/* ── Contrast ─────────────────────────────────────────────────────────────── */
.contrast + .contrast {
  margin-top: var(--m-s-4);
}

.contrast__label {
  font-size: var(--m-t-label);
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--m-text-3);
  margin: 0 0 var(--m-s-1);
}

.contrast pre {
  margin: 0;
  padding: var(--m-s-2);
  border: 1px solid var(--m-border);
  border-radius: var(--m-radius-sm);
  background: var(--m-bg);
  overflow-x: auto;
}

.contrast code {
  font-size: 0.8rem;
}

.contrast__note {
  margin: var(--m-s-1) 0 0;
  /* Was a literal 0.72rem — exactly the old --m-t-fine value, duplicated
     instead of referencing the token it matched. */
  font-size: var(--m-t-fine);
}

.contrast--bad .contrast__note {
  color: var(--m-negative);
}

.contrast--good .contrast__note {
  color: var(--m-positive);
}

@media (max-width: 1024px) {
  .frame {
    min-height: 0;
  }
}
</style>
