<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { SECTIONS } from './sections'

const { theme } = useData()

const inventory = computed<Record<string, number>>(() => theme.value.inventory ?? {})
const sections = computed(() => SECTIONS.filter((s) => inventory.value[s.slug] > 0))
</script>

<template>
  <div class="notfound">
    <p class="eyebrow">404 — Not found</p>
    <h1>That page isn't in the toolkit.</h1>
    <p class="lede">
      The link may be old, or the page may have moved when the toolkit was reorganised.
      Press <kbd>/</kbd> to search, or start from one of these.
    </p>

    <p class="notfound__primary">
      <a href="/introduction">Read the introduction →</a>
    </p>

    <ul class="notfound__grid">
      <li v-for="section in sections" :key="section.slug">
        <a :href="`/${section.slug}/`">
          <span class="notfound__label">{{ section.label }}</span>
          <span class="notfound__blurb">{{ section.blurb }}</span>
        </a>
      </li>
    </ul>

    <p class="notfound__home"><a href="/">Back to the landing page</a></p>
  </div>
</template>

<style scoped>
.notfound {
  max-width: 46rem;
  margin: 0 auto;
  padding: 5rem 1.5rem 7rem;
  color: var(--m-text);
}

.eyebrow {
  font-family: var(--m-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--m-accent);
  margin: 0 0 0.9rem;
}

.notfound h1 {
  font-family: var(--m-font-serif);
  font-weight: 500;
  font-size: clamp(1.9rem, 4.5vw, 2.8rem);
  line-height: 1.15;
  letter-spacing: -0.015em;
  margin: 0 0 1rem;
}

.lede {
  color: var(--m-text-2);
  font-size: 1.02rem;
  line-height: 1.65;
  margin: 0 0 1.6rem;
}

kbd {
  font-family: var(--m-font-mono);
  font-size: 0.78rem;
  border: 1px solid var(--m-border);
  border-radius: 3px;
  padding: 0.05rem 0.35rem;
  color: var(--m-text);
}

.notfound__primary {
  margin: 0 0 2.5rem;
}

.notfound__primary a {
  font-weight: 500;
  color: var(--m-accent);
  text-decoration: none;
}

.notfound__primary a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* Cell-drawn separators rather than a background showing through gaps. */
.notfound__grid {
  list-style: none;
  padding: 0;
  margin: 0 0 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  background: var(--m-surface);
  border: 1px solid var(--m-border);
  border-radius: var(--m-radius);
  overflow: hidden;
}

.notfound__grid a {
  display: block;
  min-width: 0;
  height: 100%;
  padding: 0.9rem 1rem;
  text-decoration: none;
  color: var(--m-text);
  box-shadow: 1px 0 0 var(--m-border), 0 1px 0 var(--m-border);
  transition: background 0.15s ease;
}

.notfound__grid a:hover {
  background: var(--vp-c-bg-alt);
}

.notfound__grid a:focus-visible,
.notfound__primary a:focus-visible,
.notfound__home a:focus-visible {
  outline: 2px solid var(--m-accent);
  outline-offset: 2px;
}

.notfound__label {
  display: block;
  font-weight: 600;
  font-size: 0.92rem;
}

.notfound__blurb {
  display: block;
  font-size: 0.8rem;
  color: var(--m-text-2);
  margin-top: 0.15rem;
  line-height: 1.45;
}

.notfound__home {
  font-size: 0.9rem;
  margin: 0;
}

.notfound__home a {
  color: var(--m-text-2);
}
</style>
