<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'

const { theme } = useData()

const REPO = 'https://github.com/sokpichdev/mobile-engineering-agents'

const inventory = computed<Record<string, number>>(() => theme.value.inventory ?? {})

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

const INSTALL_STEPS: Array<{ n: string; title: string; code: string; copyText?: string }> = [
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
    // The displayed text carries prompt decoration ('> ' and the wrap indent) that is part
    // of the illustration, not the prompt. copyText is what actually reaches the clipboard.
    code: '> Build a Profile screen that loads /me and stores\n  the auth token securely.',
    copyText: 'Build a Profile screen that loads /me and stores the auth token securely.'
  }
]

const TOOLS = ['Claude Code', 'Codex', 'Cursor', 'Windsurf', 'Gemini CLI', 'Aider']

// The ✓/✗ on the button is a CSS ::after pseudo-element, which screen readers do not
// announce. This live region carries the same result as text.
const copyStatus = ref('')

async function copy(text: string, event: MouseEvent) {
  const button = event.currentTarget as HTMLButtonElement
  const settle = (state: string, message: string) => {
    button.dataset.copied = state
    copyStatus.value = message
    setTimeout(() => {
      delete button.dataset.copied
      copyStatus.value = ''
    }, 1400)
  }
  try {
    await navigator.clipboard.writeText(text)
    settle('true', 'Copied to clipboard')
  } catch {
    settle('failed', 'Copy failed')
  }
}
</script>

<template>
  <div class="landing">
    <p class="sr-only" role="status" aria-live="polite">{{ copyStatus }}</p>

    <!-- ── Hero ─────────────────────────────────────────── -->
    <section class="hero">
      <p class="eyebrow">01 — The problem</p>
      <h1>
        Turn your AI coding agent into a
        <em>Senior mobile engineer</em>
      </h1>
      <p class="lede">
        Architecture, security, testing and standards — so the code your agent generates is
        production-grade, not just plausible.
      </p>

      <div class="contrast">
        <div class="contrast__col contrast__col--bad">
          <p class="contrast__label">Without the toolkit</p>
          <pre><code>class LoginVC: UIViewController {
  UserDefaults.standard.set(
    token, forKey: "token")
  // 400 more lines
}</code></pre>
          <p class="contrast__note">
            Massive View Controller · token in plaintext · no tests
          </p>
        </div>
        <div class="contrast__col contrast__col--good">
          <p class="contrast__label">With the toolkit</p>
          <pre><code>final class LoginViewModel {
  let auth: AuthUseCase
  func submit() async throws {
    try await auth.login()
  }
}</code></pre>
          <p class="contrast__note">
            OAuth2 + PKCE · Keychain · MVVM · typed errors · tests
          </p>
        </div>
      </div>

      <div class="cta">
        <a class="btn btn--primary" href="#install">Get started</a>
        <a class="btn" href="/introduction">Read the docs</a>
      </div>
    </section>

    <!-- ── Tier map ─────────────────────────────────────── -->
    <section class="tiers">
      <p class="eyebrow">02 — The team</p>
      <h2>You don't get an assistant. You get a team.</h2>
      <p class="lede">
        Specialist roles organised into four tiers that hand off to each other. Higher tiers
        set constraints lower tiers must respect.
      </p>

      <ol class="tier-list">
        <li v-for="tier in TIERS" :key="tier.n" class="tier">
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
            <button
              class="copy"
              type="button"
              :aria-label="`Copy step ${step.n} commands`"
              @click="copy(step.copyText ?? step.code, $event)"
            >
              Copy
            </button>
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
.landing {
  max-width: 62rem;
  margin: 0 auto;
  padding: 3rem 1.5rem 6rem;
  color: var(--mobie-text);
}

.landing section {
  margin-bottom: 5.5rem;
  /* The VitePress navbar is sticky, so an in-page jump lands the section heading
     underneath it without this offset. */
  scroll-margin-top: calc(var(--vp-nav-height) + 1rem);
}

/* Visible to assistive tech, not to the eye — used for the copy live region. */
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

.eyebrow {
  font-family: var(--mobie-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--mobie-accent);
  margin-bottom: 0.9rem;
}

.landing h1 {
  font-family: var(--mobie-font-display);
  font-weight: 400;
  font-size: clamp(2.1rem, 5.5vw, 3.4rem);
  line-height: 1.1;
  letter-spacing: -0.015em;
  margin: 0 0 1rem;
}

.landing h1 em {
  color: var(--mobie-accent);
  font-style: italic;
}

.landing h2 {
  font-family: var(--mobie-font-display);
  font-weight: 400;
  font-size: clamp(1.5rem, 3.2vw, 2.1rem);
  line-height: 1.2;
  margin: 0 0 0.8rem;
}

.landing h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.lede {
  color: var(--mobie-muted);
  font-size: 1.02rem;
  line-height: 1.65;
  max-width: 40rem;
  margin: 0 0 2rem;
}

/* Grid and flex children default to min-width:auto and refuse to shrink below their
   content's intrinsic width — so a long line inside a <pre> widens its track instead of
   scrolling within it. min-width:0 lets the track shrink and hands overflow to the <pre>. */
.contrast__col,
.step,
.step__code,
.tier__agents,
.inventory__grid a {
  min-width: 0;
}

/* Hero contrast */
.contrast {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.contrast__col {
  border-top: 2px solid var(--mobie-rule);
  padding-top: 0.9rem;
}

.contrast__col--bad {
  border-top-color: var(--mobie-negative);
}

.contrast__col--good {
  border-top-color: var(--mobie-positive);
}

.contrast__label {
  font-family: var(--mobie-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0 0 0.7rem;
}

.contrast__col--bad .contrast__label {
  color: var(--mobie-negative);
}

.contrast__col--good .contrast__label {
  color: var(--mobie-positive);
}

.contrast pre {
  background: var(--mobie-surface);
  border: 1px solid var(--mobie-rule);
  border-radius: 5px;
  padding: 0.9rem;
  overflow-x: auto;
  margin: 0 0 0.7rem;
}

.contrast code {
  font-family: var(--mobie-font-mono);
  font-size: 0.78rem;
  line-height: 1.6;
  color: var(--mobie-muted);
}

.contrast__note {
  font-size: 0.85rem;
  color: var(--mobie-muted);
  margin: 0;
}

/* CTA */
.cta {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
}

.btn {
  display: inline-block;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.62rem 1.15rem;
  border-radius: 3px;
  border: 1.5px solid var(--mobie-text);
  color: var(--mobie-text);
  text-decoration: none;
  transition: opacity 0.15s ease;
}

.btn:hover {
  opacity: 0.72;
}

.btn--primary {
  background: var(--mobie-text);
  color: var(--mobie-ground);
}

/* Hover is the only affordance these carry otherwise; keyboard users need the ring.
   Outlines follow border-radius, so the pill and card shapes stay intact. */
.btn:focus-visible,
.copy:focus-visible,
.tier__agents a:focus-visible,
.inventory__grid a:focus-visible {
  outline: 2px solid var(--mobie-accent);
  outline-offset: 2px;
}

/* Tiers */
.tier-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 1px;
  background: var(--mobie-rule);
  border: 1px solid var(--mobie-rule);
}

.tier {
  background: var(--mobie-ground);
  padding: 1.4rem;
  display: grid;
  grid-template-columns: minmax(0, 18rem) 1fr;
  gap: 1.5rem;
  align-items: start;
}

.tier__head {
  display: flex;
  gap: 0.9rem;
}

.tier__head p {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: var(--mobie-muted);
  line-height: 1.5;
}

.tier__n {
  font-family: var(--mobie-font-mono);
  font-size: 0.78rem;
  color: var(--mobie-accent);
  padding-top: 0.15rem;
}

.tier__agents {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.tier__agents a {
  display: inline-block;
  font-size: 0.82rem;
  padding: 0.28rem 0.7rem;
  border: 1px solid var(--mobie-rule);
  border-radius: 99px;
  color: var(--mobie-text);
  text-decoration: none;
}

.tier__agents a:hover {
  border-color: var(--mobie-accent);
  color: var(--mobie-accent);
}

/* Install */
.steps {
  list-style: none;
  padding: 0;
  margin: 0 0 1.6rem;
  display: grid;
  gap: 1.6rem;
}

.step__head {
  display: flex;
  gap: 0.9rem;
  align-items: baseline;
  margin-bottom: 0.6rem;
}

.step__n {
  font-family: var(--mobie-font-mono);
  font-size: 0.78rem;
  color: var(--mobie-accent);
}

.step__code {
  position: relative;
}

.step__code pre {
  background: var(--mobie-surface);
  border: 1px solid var(--mobie-rule);
  border-radius: 5px;
  padding: 0.9rem 4.5rem 0.9rem 0.9rem;
  overflow-x: auto;
  margin: 0;
}

.step__code code {
  font-family: var(--mobie-font-mono);
  font-size: 0.8rem;
  line-height: 1.7;
  color: var(--mobie-muted);
  white-space: pre;
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

.copy:hover {
  color: var(--mobie-accent);
  border-color: var(--mobie-accent);
}

.copy[data-copied='true']::after {
  content: ' ✓';
  color: var(--mobie-positive);
}

.copy[data-copied='failed']::after {
  content: ' ✗';
  color: var(--mobie-negative);
}

.confirm {
  font-size: 0.9rem;
  color: var(--mobie-muted);
}

.confirm code {
  font-family: var(--mobie-font-mono);
  font-size: 0.82rem;
  color: var(--mobie-accent);
  border: 1px solid var(--mobie-accent);
  border-radius: 99px;
  padding: 0.12rem 0.6rem;
  white-space: nowrap;
}

/* Inventory */
.inventory__grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 1px;
  background: var(--mobie-rule);
  border: 1px solid var(--mobie-rule);
}

.inventory__grid a {
  display: block;
  background: var(--mobie-ground);
  padding: 1.1rem;
  height: 100%;
  text-decoration: none;
  color: var(--mobie-text);
}

.inventory__grid a:hover {
  background: var(--mobie-surface);
}

.inventory__count {
  display: block;
  font-family: var(--mobie-font-display);
  font-size: 2rem;
  line-height: 1;
  color: var(--mobie-accent);
}

.inventory__label {
  display: block;
  font-weight: 600;
  font-size: 0.92rem;
  margin-top: 0.35rem;
}

.inventory__blurb {
  display: block;
  font-size: 0.8rem;
  color: var(--mobie-muted);
  margin-top: 0.15rem;
  line-height: 1.45;
}

/* Tools */
.tools__list {
  list-style: none;
  padding: 0;
  margin: 0 0 1.6rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tools__list li {
  font-size: 0.85rem;
  padding: 0.35rem 0.85rem;
  border: 1px solid var(--mobie-rule);
  border-radius: 3px;
  color: var(--mobie-muted);
}

@media (max-width: 720px) {
  .contrast,
  .tier {
    grid-template-columns: 1fr;
  }
}
</style>
