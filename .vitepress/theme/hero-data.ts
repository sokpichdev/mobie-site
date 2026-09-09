import type { TreeRow } from '../toolkit-tree'

export type TranscriptLine = { kind: 'prompt' | 'output' | 'ok'; text: string }

/**
 * The SESSION panel's contents.
 *
 * This is a hand-written transcript, not a recording. It is truthful — every line is
 * something the toolkit actually produces — but it is authored, and the site must never
 * present it as captured output. It lives here, as data, so that dropping in a real
 * asciinema cast later is a change to one module and not to the component.
 */
export const SESSION_TRANSCRIPT: TranscriptLine[] = [
  { kind: 'prompt', text: '> Build a Profile screen that loads /me and stores the auth token securely.' },
  { kind: 'output', text: 'Reading .mobile-agents/CLAUDE.md' },
  { kind: 'output', text: 'Loading agents/ios_architect · agents/networking_expert' },
  { kind: 'output', text: 'Loading skills/security/keychain_storage' },
  { kind: 'output', text: 'Applying standards/swift_style · checklists/code_review' },
  { kind: 'ok', text: 'Mobile Engineering Agents — loaded ✓' }
]

/** The BEFORE/AFTER panel. Copy moved verbatim from the landing page's contrast block. */
export const CONTRAST: { label: string; code: string; note: string; tone: 'bad' | 'good' }[] = [
  {
    tone: 'bad',
    label: 'Without the toolkit',
    code: `class LoginVC: UIViewController {\n  UserDefaults.standard.set(\n    token, forKey: "token")\n  // 400 more lines\n}`,
    note: 'Massive View Controller · token in plaintext · no tests'
  },
  {
    tone: 'good',
    label: 'With the toolkit',
    code: `final class LoginViewModel {\n  let auth: AuthUseCase\n  func submit() async throws {\n    try await auth.login()\n  }\n}`,
    note: 'OAuth2 + PKCE · Keychain · MVVM · typed errors · tests'
  }
]

/**
 * The stat line under the hero CTAs: "18 agents · 80 skills · 14 workflows · 11 checklists".
 *
 * Takes the first `take` sections in tree order rather than the largest, so the line stays
 * stable as the toolkit grows and always leads with agents — the thing the page is about.
 * Renders whatever exists; it never pads to reach `take`.
 */
export function statLine(tree: TreeRow[], take = 4): string {
  return tree
    .slice(0, take)
    .map((row) => `${row.count} ${row.label.toLowerCase()}`)
    .join(' · ')
}
