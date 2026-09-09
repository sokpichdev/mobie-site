<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useData, useRoute, onContentUpdated } from 'vitepress'
import { railEnabled } from './code-rail'

const { theme } = useData()
const route = useRoute()

const rail = ref<HTMLElement | null>(null)
const moved: Array<{ node: Element; placeholder: Comment }> = []

const MIN_WIDTH = 1280

function restore() {
  for (const { node, placeholder } of moved.splice(0)) {
    placeholder.parentNode?.replaceChild(node, placeholder)
  }
}

/**
 * Move each fence out of the prose and into the rail, leaving a comment node behind so
 * the exact original position is recoverable on resize. Cloning instead of moving would
 * duplicate ids and break the copy buttons VitePress attaches to each fence.
 */
function collect() {
  if (typeof document === 'undefined') return
  const doc = document.querySelector('.vp-doc')
  if (!doc || !rail.value) return
  for (const node of doc.querySelectorAll("div[class*='language-']")) {
    const placeholder = document.createComment('code-rail')
    node.parentNode?.replaceChild(placeholder, node)
    rail.value.appendChild(node)
    moved.push({ node, placeholder })
  }
}

function sync() {
  restore()
  if (typeof window !== 'undefined' && window.innerWidth >= MIN_WIDTH) collect()
}

// VitePress swaps page content client-side without remounting the layout, so onMounted
// alone only ever sees the first page. route.path itself changes *before* the new page's
// component has actually mounted (VitePress sets route.path/component together only once
// the new page's chunk has loaded, then lets Vue's own scheduler patch the DOM — there is
// no guarantee a single nextTick spans that patch). onContentUpdated is VitePress's own
// hook for this: it fires from onVnodeMounted/onVnodeUpdated/onVnodeUnmounted on the page
// component itself, so the DOM is already settled whenever it runs.
//
// That hook fires more than once per navigation — e.g. once as the new page mounts and
// again as the outgoing page unmounts — and by the second call route.path already reads
// as the *new* page too, so it can't be used to tell "still the same navigation" from "a
// stale repeat". activePath tracks which page we last actually acted on, so a repeat call
// for that same page is a no-op instead of a blind restore() that would undo a collection
// that just succeeded.
let activePath: string | null = null
let generation = 0

async function activate() {
  if (route.path === activePath) return
  restore()
  activePath = route.path
  if (!railEnabled(route.path, theme.value.codeRail ?? [])) return
  // A second navigation may start before this one finishes waiting on nextTick; tag this
  // attempt so a stale resume can tell it's been superseded and bail out instead of
  // collecting fences for a page that has already been replaced in the DOM.
  const gen = ++generation
  await nextTick()
  if (gen !== generation) return
  sync()
}

function onResize() {
  generation++ // invalidate any activate() still waiting on nextTick
  sync()
}

onMounted(() => {
  activate()
  window.addEventListener('resize', onResize)
})

onContentUpdated(() => activate())

onUnmounted(() => {
  restore()
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <aside ref="rail" class="code-rail" aria-label="Code for this page" />
</template>

<style scoped>
/* Hidden until it holds something — an empty rail must not reserve a column. */
.code-rail:empty {
  display: none;
}

.code-rail {
  position: sticky;
  top: calc(var(--vp-nav-height) + var(--m-s-4));
  float: right;
  width: 26rem;
  margin-left: var(--m-s-5);
  margin-bottom: var(--m-s-5);
  max-height: calc(100vh - var(--vp-nav-height) - var(--m-s-6));
  overflow-y: auto;
  border: 1px solid var(--m-border);
  border-radius: var(--m-radius);
  background: var(--m-surface);
  padding: var(--m-s-2);
}

.code-rail :deep(div[class*='language-']) {
  margin: var(--m-s-2) 0;
}

@media (max-width: 1279px) {
  .code-rail {
    display: none;
  }
}
</style>

<style>
/* Unscoped: the rail floats as a sibling *before* <main> inside VitePress's own
   .content-container, so prose in <main> wraps around it (the standard "floated
   aside before the content it decorates" pattern). If the rail is taller than the
   remaining prose, the doc footer that follows <main> would otherwise render into
   the float's tail instead of below it — clear it explicitly.
*/
.VPDocFooter {
  clear: both;
}
</style>
