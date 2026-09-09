<script setup lang="ts">
defineProps<{ tiers: { n: string; name: string; count: number }[] }>()
</script>

<template>
  <ol class="route" aria-label="How a request flows through the agent tiers">
    <li class="route__end">
      <span class="route__name">Your request</span>
    </li>
    <li v-for="tier in tiers" :key="tier.n" class="route__tier">
      <a :href="`#tier-${tier.n}`">
        <span class="route__n">{{ tier.n }}</span>
        <span class="route__name">{{ tier.name }}</span>
        <span class="route__count">{{ tier.count }} agents</span>
      </a>
    </li>
    <li class="route__end route__end--done">
      <span class="route__name">Merge-ready</span>
    </li>
  </ol>
</template>

<style scoped>
/* Full-bleed within the landing's measure: the diagram is the section, not an
   illustration beside it. Connectors are hairlines with a rotated square as the
   arrowhead — no SVG, no icon font. */
.route {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: stretch;
  border: 1px solid var(--m-border);
  border-radius: var(--m-radius);
  background: var(--m-surface);
}

.route > li {
  display: flex;
  align-items: center;
  flex: 1;
}

.route > li + li::before {
  content: '';
  flex: 0 0 var(--m-s-4);
  height: 1px;
  background: var(--m-border-strong);
}

/* Arrowhead: a hairline square clipped to its top-right corner and rotated
   45deg, sitting flush with the end of the connector it points along. */
.route > li + li {
  position: relative;
}

.route > li + li::after {
  content: '';
  position: absolute;
  top: 50%;
  left: calc(var(--m-s-4) - 5px);
  width: 5px;
  height: 5px;
  border-top: 1px solid var(--m-border-strong);
  border-right: 1px solid var(--m-border-strong);
  transform: translateY(-50%) rotate(45deg);
}

/* Specificity, not order: `.route > li` above is (0,1,1) and a bare `.route__end` is
   (0,1,0), so `flex: 1` won wherever the two met and both end caps stretched into full
   columns — six equal cells instead of narrow caps flanking four tiers. Only the flex
   declaration is raised; the rest of the cap's styling stays at (0,1,0) so the
   `.route__end--done` colour override below can still reach it. */
.route > li.route__end {
  flex: 0 0 auto;
}

.route__end {
  padding: var(--m-s-4);
  font-family: var(--m-font-mono);
  font-size: var(--m-t-label);
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--m-text-3);
}

.route__end--done {
  color: var(--m-positive);
}

.route__tier a {
  display: block;
  flex: 1;
  padding: var(--m-s-4) var(--m-s-3);
  text-decoration: none;
  color: inherit;
  border-left: 1px solid var(--m-border);
  transition: background-color 0.15s ease;
}

.route__tier:hover a,
.route__tier a:focus-visible {
  background: var(--m-accent-wash);
}

.route__tier a:focus-visible {
  outline: 2px solid var(--m-accent);
  outline-offset: -2px;
}

.route__n {
  display: block;
  font-family: var(--m-font-mono);
  font-size: var(--m-t-label);
  color: var(--m-accent);
  letter-spacing: 0.09em;
}

.route__name {
  display: block;
  font-family: var(--m-font-serif);
  font-size: var(--m-t-sub);
  color: var(--m-text);
  margin-top: var(--m-s-1);
}

.route__count {
  display: block;
  font-family: var(--m-font-mono);
  font-size: var(--m-t-fine);
  color: var(--m-text-3);
  margin-top: var(--m-s-1);
}

@media (max-width: 900px) {
  .route {
    flex-direction: column;
  }

  .route > li {
    flex-direction: column;
    align-items: stretch;
  }

  .route > li + li::before {
    flex: 0 0 var(--m-s-4);
    width: 1px;
    height: var(--m-s-4);
    margin: 0 auto;
  }

  /* Same corner, rotated a further 90deg so the arrowhead points down the
     now-vertical connector instead of right along the horizontal one. */
  .route > li + li::after {
    top: calc(var(--m-s-4) - 5px);
    left: 50%;
    transform: translateX(-50%) rotate(135deg);
  }

  .route__tier a {
    border-left: none;
    border-top: 1px solid var(--m-border);
  }

  .route__end {
    text-align: center;
  }
}
</style>
