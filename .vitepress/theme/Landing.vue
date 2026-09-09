<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { statLine } from './hero-data'
import type { TreeRow } from '../toolkit-tree'

const { theme } = useData()

const REPO = 'https://github.com/sokpichdev/mobile-engineering-agents'

const inventory = computed<Record<string, number>>(() => theme.value.inventory ?? {})

const tree = computed<TreeRow[]>(() => theme.value.tree ?? [])
const stats = computed(() => statLine(tree.value))

const INVENTORY_ROWS: Array<{ slug: string; label: string; blurb: string }> = [
  { slug: 'agents', label: 'Agents', blurb: 'Loadable expert roles' },
  { slug: 'skills', label: 'Skills', blurb: 'Deep, single-topic know-how' },
  { slug: 'workflows', label: 'Workflows', blurb: 'Step-by-step procedures' },
  { slug: 'checklists', label: 'Checklists', blurb: 'Objective review gates' },
  { slug: 'standards', label: 'Standards', blurb: 'Non-negotiable rules' },
  { slug: 'architecture', label: 'Architecture', blurb: 'Reference designs' },
  { slug: 'prompts', label: 'Prompts', blurb: 'Copy-paste prompts' },
  { slug: 'templates', label: 'Templates', blurb: 'Boilerplate scaffolding' },
  { slug: 'examples', label: 'Examples', blurb: 'Reference apps' }
]

const rows = computed(() => INVENTORY_ROWS.filter((r) => inventory.value[r.slug] > 0))

const TIERS = [
  {
    n: '01',
    name: 'Strategy',
    blurb: 'Sets the constraints every lower tier respects.',
    agents: [
      { text: 'System Design Expert', link: '/agents/system_design_expert' },
      { text: 'iOS Architect', link: '/agents/ios_architect' }
    ]
  },
  {
    n: '02',
    name: 'Implementation',
    blurb: 'Builds inside the boundaries Strategy drew.',
    agents: [
      { text: 'SwiftUI Expert', link: '/agents/swiftui_expert' },
      { text: 'UIKit Expert', link: '/agents/uikit_expert' },
      { text: 'Networking Expert', link: '/agents/networking_expert' },
      { text: 'WebSocket Expert', link: '/agents/websocket_expert' },
      { text: 'Backend Integrator', link: '/agents/backend_integrator' }
    ]
  },
  {
    n: '03',
    name: 'Quality & Hardening',
    blurb: 'Finds what Implementation missed.',
    agents: [
      { text: 'Security Expert', link: '/agents/security_expert' },
      { text: 'Testing Expert', link: '/agents/testing_expert' },
      { text: 'Performance Expert', link: '/agents/performance_expert' },
      { text: 'Accessibility Expert', link: '/agents/accessibility_expert' },
      { text: 'Refactoring Expert', link: '/agents/refactoring_expert' }
    ]
  },
  {
    n: '04',
    name: 'Gate & Delivery',
    blurb: 'Nothing merges or ships without this tier.',
    agents: [
      { text: 'Code Reviewer', link: '/agents/code_reviewer' },
      { text: 'Release Manager', link: '/agents/release_manager' },
      { text: 'DevOps Expert', link: '/agents/devops_expert' }
    ]
  }
]

/** The routing diagram reads its tiers from the same source as the tier list below it. */
const route = TIERS.map((t) => ({ n: t.n, name: t.name, count: t.agents.length }))

const INSTALL_STEPS = [
  {
    n: '01',
    title: 'Clone the toolkit into your project',
    code: `cd your-project\ngit clone ${REPO}.git .mobile-agents\necho ".mobile-agents/" >> .gitignore`
  },
  {
    n: '02',
    title: 'Wire up the entry file for your tool',
    code: 'echo "@.mobile-agents/CLAUDE.md" > CLAUDE.md\necho "@.mobile-agents/.cursorrules" > .cursorrules\necho "@.mobile-agents/.windsurfrules" > .windsurfrules'
  },
  {
    n: '03',
    title: 'Describe what you want',
    code: '> Build a Profile screen that loads /me and stores\n  the auth token securely.'
  }
]

const TOOLS = ['Claude Code', 'Codex', 'Cursor', 'Windsurf', 'Gemini CLI', 'Aider']

async function copy(text: string, event: MouseEvent) {
  const button = event.currentTarget as HTMLButtonElement
  try {
    await navigator.clipboard.writeText(text)
    button.dataset.copied = 'true'
    setTimeout(() => delete button.dataset.copied, 1400)
  } catch {
    button.dataset.copied = 'failed'
    setTimeout(() => delete button.dataset.copied, 1400)
  }
}
</script>

<template>
  <div class="landing">
    <!-- ── Hero ─────────────────────────────────────────── -->
    <section class="hero">
      <div class="hero__copy">
        <p class="eyebrow">01 — The problem</p>
        <h1>
          Turn your AI coding agent into a
          <em>Senior mobile engineer</em>
        </h1>
        <p class="lede">
          Architecture, security, testing and standards — so the code your agent generates is
          production-grade, not just plausible.
        </p>

        <div class="cta">
          <a class="btn btn--primary" href="#install">Get started</a>
          <a class="btn" href="/introduction">Read the docs</a>
        </div>

        <p v-if="stats" class="hero__stats">{{ stats }}</p>
      </div>

      <div class="hero__frame">
        <HeroFrame :tree="tree" />
      </div>
    </section>

    <!-- ── The team: routing diagram, then the roster ──── -->
    <section id="tiers" class="tiers">
      <p class="eyebrow">02 — The team</p>
      <h2>You don't get an assistant. You get a team.</h2>
      <p class="lede">
        Specialist roles organised into four tiers that hand off to each other. Higher tiers
        set constraints lower tiers must respect.
      </p>

      <TierRoute :tiers="route" />

      <ol class="tier-list">
        <li v-for="tier in TIERS" :key="tier.n" :id="`tier-${tier.n}`" class="tier">
          <div class="tier__head">
            <span class="tier__n">{{ tier.n }}</span>
            <div>
              <h3>{{ tier.name }}</h3>
              <p>{{ tier.blurb }}</p>
            </div>
          </div>
          <ul class="tier__agents">
            <li v-for="agent in tier.agents" :key="agent.link">
              <a :href="agent.link">{{ agent.text }}</a>
            </li>
          </ul>
        </li>
      </ol>
    </section>

    <!-- ── Install ──────────────────────────────────────── -->
    <section id="install" class="install">
      <p class="eyebrow">03 — Install</p>
      <h2>Running in three steps</h2>
      <p class="lede">The everyday workflow needs zero file paths.</p>

      <ol class="steps">
        <li v-for="step in INSTALL_STEPS" :key="step.n" class="step">
          <div class="step__head">
            <span class="step__n">{{ step.n }}</span>
            <h3>{{ step.title }}</h3>
          </div>
          <div class="step__code">
            <pre><code>{{ step.code }}</code></pre>
            <button class="copy" type="button" @click="copy(step.code, $event)">Copy</button>
          </div>
        </li>
      </ol>

      <p class="confirm">
        On its first reply of every session the agent confirms it loaded:
        <code>Mobile Engineering Agents — loaded ✓</code>
      </p>
    </section>

    <!-- ── Inventory ────────────────────────────────────── -->
    <section class="inventory">
      <p class="eyebrow">04 — What's inside</p>
      <h2>Everything your agent can load</h2>
      <ul class="inventory__grid">
        <li v-for="row in rows" :key="row.slug">
          <a :href="`/${row.slug}/`">
            <span class="inventory__count">{{ inventory[row.slug] }}</span>
            <span class="inventory__label">{{ row.label }}</span>
            <span class="inventory__blurb">{{ row.blurb }}</span>
          </a>
        </li>
      </ul>
    </section>

    <!-- ── Tools ────────────────────────────────────────── -->
    <section class="tools">
      <p class="eyebrow">05 — Compatibility</p>
      <h2>Works with the agent you already use</h2>
      <ul class="tools__list">
        <li v-for="tool in TOOLS" :key="tool">{{ tool }}</li>
      </ul>
      <p class="lede">
        <a :href="REPO">View the source on GitHub →</a>
      </p>
    </section>
  </div>
</template>

<style scoped>
/* ─────────────────────────────────────────────────────────────────────────────
   Landing page. Same system as the docs: hairlines, mono labels, serif headings,
   one accent used as ink. Nothing glows.
   ───────────────────────────────────────────────────────────────────────────── */

.landing {
  max-width: 68rem;
  margin: 0 auto;
  padding: var(--m-s-6) var(--m-s-4) var(--m-s-8);
  color: var(--m-text);
}

.landing section {
  margin-bottom: var(--m-s-section);
  position: relative;
}

/* ── Shared label / heading voice ───────────────────────────────────────── */
.eyebrow {
  display: flex;
  align-items: center;
  gap: var(--m-s-2);
  font-family: var(--m-font-mono);
  font-size: var(--m-t-label);
  font-weight: 500;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--m-accent);
  margin: 0 0 var(--m-s-4);
}

/* A rule runs out from every section label — the page reads as numbered chapters. */
.eyebrow::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--m-border);
}

.landing h1 {
  font-family: var(--m-font-serif);
  font-size: var(--m-t-display);
  font-weight: 500;
  line-height: 1.06;
  letter-spacing: -0.02em;
  margin: 0 0 var(--m-s-3);
  max-width: 20ch;
}

/* The one emphasised phrase: serif italic in ink. */
.landing h1 em {
  font-style: italic;
  font-weight: 500;
  color: var(--m-accent);
}

.landing h2 {
  font-family: var(--m-font-serif);
  font-size: var(--m-t-title);
  font-weight: 500;
  line-height: 1.15;
  letter-spacing: -0.015em;
  margin: 0 0 var(--m-s-2);
  max-width: 24ch;
}

.landing h3 {
  font-size: var(--m-t-sub);
  font-weight: 600;
  letter-spacing: -0.012em;
  margin: 0;
}

.lede {
  color: var(--m-text-2);
  font-size: var(--m-t-body);
  line-height: 1.68;
  max-width: 44rem;
  margin: 0 0 var(--m-s-5);
}

/* Grid and flex children default to min-width:auto and refuse to shrink below their
   content's intrinsic width — so a long line inside a <pre> widens its track instead of
   scrolling within it. min-width:0 lets the track shrink and hands overflow to the <pre>. */
.step,
.step__code,
.tier__agents,
.inventory__grid a {
  min-width: 0;
}

/* ── Hero ───────────────────────────────────────────────────────────────── */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--m-s-6);
  align-items: start;
}

.hero__stats {
  font-family: var(--m-font-mono);
  font-size: var(--m-t-micro);
  color: var(--m-text-3);
  border-top: 1px solid var(--m-border);
  padding-top: var(--m-s-3);
  margin: var(--m-s-5) 0 0;
}

@media (max-width: 1024px) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--m-s-5);
  }
}

/* ── Buttons ────────────────────────────────────────────────────────────── */
.cta {
  display: flex;
  gap: var(--m-s-1);
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  font-size: var(--m-t-small);
  font-weight: 500;
  letter-spacing: -0.01em;
  padding: var(--m-s-1) var(--m-s-3);
  border-radius: var(--m-radius-sm);
  border: 1px solid var(--m-border-strong);
  background: var(--m-surface);
  color: var(--m-text);
  text-decoration: none;
  transition: background-color 0.15s ease, border-color 0.15s ease, filter 0.15s ease;
}

.btn:hover {
  border-color: var(--m-text-3);
  background: var(--m-elevated);
}

.btn--primary {
  background: var(--m-accent);
  border-color: transparent;
  color: #fff;
}

.btn--primary:hover {
  background: var(--m-accent);
  filter: brightness(1.12);
}

/* ── Tiers ──────────────────────────────────────────────────────────────── */
.tier-list {
  list-style: none;
  padding: 0;
  margin: 0;
  margin-top: var(--m-s-6);
  display: grid;
  gap: var(--m-s-2);
}

.tier {
  border: 1px solid var(--m-border);
  border-radius: var(--m-radius);
  background: var(--m-surface);
  padding: var(--m-s-4) var(--m-s-4);
  display: grid;
  grid-template-columns: minmax(0, 17rem) 1fr;
  gap: var(--m-s-5);
  align-items: start;
  transition: border-color 0.15s ease;
}

.tier:hover {
  border-color: var(--m-border-strong);
}

.tier__head {
  display: flex;
  gap: var(--m-s-2);
}

.tier__head p {
  margin: var(--m-s-1) 0 0;
  font-size: var(--m-t-micro);
  color: var(--m-text-3);
  line-height: 1.5;
}

.tier__n {
  font-family: var(--m-font-mono);
  font-size: var(--m-t-label);
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--m-accent);
  padding-top: var(--m-s-1);
}

.tier__agents {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--m-s-1);
}

.tier__agents a {
  display: inline-block;
  font-size: var(--m-t-micro);
  font-weight: 400;
  padding: var(--m-s-1) var(--m-s-2);
  border: 1px solid var(--m-border);
  background: var(--m-bg);
  border-radius: var(--m-radius-sm);
  color: var(--m-text-2);
  text-decoration: none;
  transition: color 0.12s ease, border-color 0.12s ease;
}

.tier__agents a:hover {
  border-color: var(--m-accent-line);
  color: var(--m-accent);
}

/* ── Install ────────────────────────────────────────────────────────────── */
.steps {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--m-s-4);
  display: grid;
  gap: var(--m-s-4);
}

.step__head {
  display: flex;
  gap: var(--m-s-2);
  align-items: baseline;
  margin-bottom: var(--m-s-2);
}

.step__n {
  font-family: var(--m-font-mono);
  font-size: var(--m-t-label);
  font-weight: 500;
  color: var(--m-accent);
}

.step__code {
  position: relative;
}

.step__code pre {
  background: var(--m-surface);
  border: 1px solid var(--m-border);
  border-radius: var(--m-radius);
  padding: var(--m-s-3) var(--m-s-6) var(--m-s-3) var(--m-s-3);
  overflow-x: auto;
  margin: 0;
}

.step__code code {
  font-family: var(--m-font-mono);
  font-size: var(--m-t-micro);
  line-height: 1.7;
  color: var(--m-text-2);
  white-space: pre;
}

.copy {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  font-family: var(--m-font-mono);
  font-size: var(--m-t-label);
  letter-spacing: 0.09em;
  text-transform: uppercase;
  background: var(--m-elevated);
  color: var(--m-text-3);
  border: 1px solid var(--m-border);
  border-radius: var(--m-radius-sm);
  padding: var(--m-s-1) var(--m-s-1);
  cursor: pointer;
  transition: color 0.12s ease, border-color 0.12s ease;
}

.copy:hover {
  color: var(--m-accent);
  border-color: var(--m-accent-line);
}

.copy[data-copied='true']::after {
  content: ' ✓';
  color: var(--m-positive);
}

.copy[data-copied='failed']::after {
  content: ' ✗';
  color: var(--m-negative);
}

.confirm {
  font-size: var(--m-t-small);
  color: var(--m-text-3);
  line-height: 1.7;
}

.confirm code {
  font-family: var(--m-font-mono);
  font-size: var(--m-t-micro);
  color: var(--m-accent);
  border: 1px solid var(--m-accent-line);
  background: var(--m-accent-wash);
  border-radius: var(--m-radius-sm);
  padding: var(--m-s-1) var(--m-s-1);
  white-space: nowrap;
}

/* ── Inventory ──────────────────────────────────────────────────────────── */
.inventory__grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11.5rem, 1fr));
  gap: var(--m-s-2);
}

.inventory__grid a {
  display: block;
  border: 1px solid var(--m-border);
  border-radius: var(--m-radius);
  background: var(--m-surface);
  padding: var(--m-s-3);
  height: 100%;
  text-decoration: none;
  color: var(--m-text);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.inventory__grid a:hover {
  border-color: var(--m-accent-line);
  background: var(--m-elevated);
}

.inventory__count {
  display: block;
  font-size: var(--m-t-title);
  font-weight: 600;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--m-accent);
  font-variant-numeric: tabular-nums;
}

.inventory__label {
  display: block;
  font-weight: 500;
  font-size: var(--m-t-small);
  letter-spacing: -0.012em;
  margin-top: var(--m-s-1);
}

.inventory__blurb {
  display: block;
  font-size: var(--m-t-micro);
  color: var(--m-text-3);
  margin-top: var(--m-s-1);
  line-height: 1.45;
}

/* ── Tools ──────────────────────────────────────────────────────────────── */
.tools__list {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--m-s-4);
  display: flex;
  flex-wrap: wrap;
  gap: var(--m-s-1);
}

.tools__list li {
  font-family: var(--m-font-mono);
  font-size: var(--m-t-micro);
  padding: var(--m-s-1) var(--m-s-2);
  border: 1px solid var(--m-border);
  background: var(--m-surface);
  border-radius: var(--m-radius-sm);
  color: var(--m-text-2);
}

.tools .lede a {
  color: var(--m-accent);
  text-decoration: none;
}

.tools .lede a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (max-width: 720px) {
  .tier {
    grid-template-columns: 1fr;
    gap: var(--m-s-3);
  }
}
</style>
