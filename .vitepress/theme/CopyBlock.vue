<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    /** What the reader sees. */
    code: string
    /** What actually reaches the clipboard, when the two differ — e.g. a prompt
        example whose displayed form carries a '> ' and a wrap indent. */
    copyText?: string
    /** Names what is being copied, for screen readers. */
    label: string
    /** Single-line variant used in the hero. */
    compact?: boolean
  }>(),
  { compact: false }
)

const state = ref<'copied' | 'failed' | ''>('')
const status = ref('')

function settle(next: 'copied' | 'failed', message: string) {
  state.value = next
  status.value = message
  setTimeout(() => {
    state.value = ''
    status.value = ''
  }, 1400)
}

async function copy() {
  try {
    await navigator.clipboard.writeText(props.copyText ?? props.code)
    settle('copied', 'Copied to clipboard')
  } catch {
    settle('failed', 'Copy failed')
  }
}
</script>

<template>
  <div class="copyblock" :class="{ 'copyblock--compact': compact }">
    <pre><code>{{ code }}</code></pre>
    <button
      class="copy"
      type="button"
      :data-copied="state || undefined"
      :aria-label="label"
      @click="copy"
    >
      Copy
    </button>
    <!-- The ✓/✗ on the button is a CSS pseudo-element, which screen readers do not
         announce; this carries the same result as text. -->
    <span class="sr-only" role="status" aria-live="polite">{{ status }}</span>
  </div>
</template>

<style scoped>
.copyblock {
  position: relative;
  /* Grid and flex parents default to min-width:auto, so a long command would widen the
     track instead of scrolling inside the <pre>. */
  min-width: 0;
}

.copyblock pre {
  background: var(--mobie-surface);
  border: 1px solid var(--mobie-rule);
  border-radius: 5px;
  box-shadow: var(--mobie-shadow);
  padding: 0.9rem 4.5rem 0.9rem 0.9rem;
  overflow-x: auto;
  margin: 0;
}

.copyblock code {
  font-family: var(--mobie-font-mono);
  font-size: 0.8rem;
  line-height: 1.7;
  color: var(--mobie-text);
  white-space: pre;
}

.copyblock--compact pre {
  padding: 0.6rem 4.5rem 0.6rem 0.8rem;
}

/* The compact block holds one long command. Wrapping (rather than the block variant's
   horizontal scroll) keeps every character clear of the copy button, since the <pre>'s
   right padding is already excluded from the wrapping width. It is copied, not typed,
   so breaking inside the URL on narrow screens costs nothing. */
.copyblock--compact code {
  font-size: 0.78rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.copy {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  font-family: var(--mobie-font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: var(--mobie-ground);
  color: var(--mobie-muted);
  border: 1px solid var(--mobie-rule);
  border-radius: 3px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
}

.copyblock--compact .copy {
  top: 0.35rem;
}

.copy:hover {
  color: var(--mobie-accent-text);
  border-color: var(--mobie-accent);
}

.copy:focus-visible {
  outline: 2px solid var(--mobie-accent);
  outline-offset: 2px;
}

.copy[data-copied='copied']::after {
  content: ' ✓';
  color: var(--mobie-positive);
}

.copy[data-copied='failed']::after {
  content: ' ✗';
  color: var(--mobie-negative);
}

/* Available to assistive tech, not to the eye. */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
