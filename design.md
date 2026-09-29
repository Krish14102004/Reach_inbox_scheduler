# Design — Colors, Theme, Fonts, Typography

> ⚠️ **STATUS: PENDING FIGMA EXTRACTION.**
> The Figma file ([Outbox Labs Assignment](https://www.figma.com/design/kOTwGlESjijCYnMgtHfvfU/Outbox-Labs-Assignment?node-id=59-4050&p=f&m=dev), file key `kOTwGlESjijCYnMgtHfvfU`, start node `59-4050`) could **not** be read when this file was created — the Figma tool returned *"you don't have edit access to this file"* for metadata, screenshot and design-context calls.
>
> Nothing in the "Figma value" column below has been invented. The **Placeholder** column is a neutral stand-in so development can start; it is **not** the real design. Replace every row before Phase 7 sign-off.

## How to fill this file

1. Get readable access: duplicate the Figma file into your own drafts (**File → Duplicate to your drafts**) and share *that* copy with edit access, **or** export the key frames as PNG and upload them.
2. Inspect node `59-4050` and its sibling frames (login, dashboard, compose, scheduled table, sent table, empty states, Slack connect).
3. Copy real values into the **Figma value** column, then mirror them into `frontend/src/styles/theme.css`.
4. Mark this file `STATUS: EXTRACTED` and log it in `memory.md`.

---

## 1. Color tokens

| Token | Usage | Figma value | Placeholder (not real) |
|---|---|---|---|
| `--color-bg` | App background | TBD | `#FFFFFF` |
| `--color-surface` | Cards, tables, modal | TBD | `#FFFFFF` |
| `--color-surface-muted` | Table header, subtle fills | TBD | `#F8FAFC` |
| `--color-border` | Dividers, inputs | TBD | `#E2E8F0` |
| `--color-text` | Primary text | TBD | `#0F172A` |
| `--color-text-muted` | Secondary text, hints | TBD | `#64748B` |
| `--color-primary` | Primary buttons, active tab, links | TBD | `#2563EB` |
| `--color-primary-hover` | Hover/pressed | TBD | `#1D4ED8` |
| `--color-primary-contrast` | Text on primary | TBD | `#FFFFFF` |
| `--color-success` / `-bg` | `sent` badge | TBD | `#16A34A` / `#DCFCE7` |
| `--color-warning` / `-bg` | `scheduled`/`processing` badge | TBD | `#D97706` / `#FEF3C7` |
| `--color-danger` / `-bg` | `failed` badge, errors | TBD | `#DC2626` / `#FEE2E2` |
| `--color-focus-ring` | Keyboard focus | TBD | `#93C5FD` |

Status → badge mapping (final colors come from Figma):

| Status | Label | Token pair |
|---|---|---|
| `scheduled` | Scheduled | warning |
| `processing` | Sending | warning |
| `sent` | Sent | success |
| `failed` | Failed | danger |

## 2. Theme

- **Modes:** TBD (Figma shows light only / light+dark?). Default assumption: **light only**.
- **Implementation:** CSS variables in `theme.css` exposed to Tailwind via `@theme`; components use semantic classes (`bg-surface`, `text-muted`), never raw hex.
- **Contrast:** text/background pairs must meet WCAG AA (4.5:1 body, 3:1 large).

## 3. Fonts

| Role | Figma value | Placeholder (not real) | Source |
|---|---|---|---|
| Sans (UI/body) | TBD | Inter | Google Fonts, weights 400/500/600/700 |
| Mono (if used for emails/ids) | TBD | ui-monospace stack | system |

Fallback stack: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
Load fonts in `frontend/index.html`; declare in `theme.css` as `--font-sans`.

## 4. Typography scale

| Style | Usage | Figma (size / line / weight) | Placeholder (not real) |
|---|---|---|---|
| Display / H1 | Login headline | TBD | 30 / 36 / 700 |
| H2 | Page / section title | TBD | 24 / 32 / 600 |
| H3 | Modal title | TBD | 18 / 28 / 600 |
| Body | Default text, table cells | TBD | 14 / 20 / 400 |
| Body-strong | Table emphasis, labels | TBD | 14 / 20 / 500 |
| Small / caption | Hints, timestamps, badges | TBD | 12 / 16 / 500 |
| Button | Button label | TBD | 14 / 20 / 500 |

## 5. Spacing, radius, elevation

| Token | Figma value | Placeholder (not real) |
|---|---|---|
| Spacing base unit | TBD | 4px scale (Tailwind default) |
| Page max-width / gutters | TBD | 1200px / 24px |
| Radius — input/button | TBD | 8px |
| Radius — card/modal | TBD | 12px |
| Radius — badge/avatar | TBD | 9999px |
| Shadow — card | TBD | `0 1px 2px rgb(0 0 0 / .06)` |
| Shadow — modal | TBD | `0 20px 40px rgb(0 0 0 / .15)` |

## 6. Component inventory (must be visually verified against Figma)

| Component | States to design/verify |
|---|---|
| Button | primary, secondary, ghost, disabled, loading |
| Input / Textarea | default, focus, error, disabled |
| DateTimeInput | default, focus, error |
| FileDropzone | idle, drag-over, file selected (shows filename + detected count), error |
| Modal (Compose) | open/close, scroll with long content |
| Tabs | active, inactive, hover |
| Table | header, row, hover, loading (skeleton), empty, error |
| Badge | scheduled, processing, sent, failed |
| Avatar | image, initials fallback |
| Header | logged-in (name, email, avatar, logout) |
| Slack connect | not connected, connected, loading |
| Toasts | success, error |
| Login page | default, redirecting |

## 7. Layout notes (fill from Figma)

- Screens expected from the brief: **Login**, **Dashboard** (header + Scheduled/Sent tabs + Compose button), **Compose** (modal or separate page — confirm in Figma), **Empty states**.
- Breakpoints: TBD (desktop-first unless Figma includes mobile frames).
- Icons: TBD (placeholder: `lucide-react`).
- Copy/microcopy: take exact strings from Figma (button labels, empty-state text).

## 8. Fidelity rules

- Match Figma spacing, radii, weights and colors within **±1px / exact hex**.
- Any deviation gets a line in `docs/assumptions-and-tradeoffs.md`.
- If Figma and this file disagree, **Figma wins** — then update this file.
