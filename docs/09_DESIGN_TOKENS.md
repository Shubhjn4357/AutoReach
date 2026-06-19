# 09 Design Tokens

These variables are shared as a unified package (`packages/config` or `packages/design-tokens`) to enforce consistent rendering across Expo and Web Next.js:

## Color Tokens (HSL Based)

```yaml
Primary:
  500: "#5E6BFF"

Secondary:
  500: "#7C5CFF"

Accent:
  500: "#30D5C8"

Success:
  500: "#22C55E"

Warning:
  500: "#F59E0B"

Danger:
  500: "#EF4444"

Background:
  950: "#050505"

Surface:
  900: "#111111"

Card:
  850: "#171717"

Border:
  "#2A2A2A"

Text:
  Primary: "#FFFFFF"
  Secondary: "#A0A0A0"
  Muted: "#6B7280"
```

## Border Radius (px)

```text
xs  = 6
sm  = 10
md  = 14
lg  = 20
xl  = 28
2xl = 36
3xl = 48
pill = 999
```

## Spacing Grid

Must always follow multiples of 4:
- `2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128`

## Elevation Levels

- **surface-1**: Flat backdrop.
- **surface-2**: Raised card with 4px blur, minimal shadow opacity.
- **surface-3**: Submenu panel or select dropdown, 8px blur.
- **surface-floating**: Context menu/popover, 16px blur, deep soft shadow.
- **surface-modal**: Modal layer overlay, 24px blur, high contrasting borders.

## Motion & Transitions

- **Fast**: 120ms (Hover state, micro-clicks).
- **Normal**: 220ms (Drawer open, scale effects).
- **Slow**: 350ms (Page transitions, panel expands).
- **Spring**: 280ms duration with physical damping (coefficient 0.7) for cards.

## Blur Levels

- **Small**: 8px
- **Medium**: 16px
- **Large**: 24px
- **Hero**: 40px
