import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import PlatformBadge from './PlatformBadge.vue'
import Landing from './Landing.vue'
import NotFound from './NotFound.vue'
import './palette.css'
import './theme.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'doc-before': () => h(PlatformBadge),
      'not-found': () => h(NotFound)
    })
  },
  enhanceApp({ app }) {
    app.component('PlatformBadge', PlatformBadge)
    app.component('Landing', Landing)
  }
} satisfies Theme
