# 10 Component Library Specifications

## Shared Package (`packages/ui`)

All primitives are constructed to output styling attributes adapting to both Tailwind CSS (Web) and React Native StyleSheets (Mobile).

## Core Primitives

1. **Button**: Supports multiple variants (Solid, Outline, Ghost, Link) and states (Default, Hover, Active, Disabled, Loading).
2. **Input**: Custom text and password entries with floating labels and error indicators.
3. **Card**: Elevation-based containers supporting hover expansions.
4. **Surface**: Layer primitives which automatically calculate the correct HSL background/border colors based on depth.
5. **Modal & Popover**: Spring-loaded overlays with dark overlay backdrops.
6. **Command Palette**: Search-as-you-type quick action triggers (Cmd+K / Ctrl+K).
7. **Floating Panel**: Resizable container supporting drag/dock actions.
8. **Kanban & Data Grid**: Column boards for lead movement with drag-and-drop animation handlers.
9. **AI Chat Component**: Streamed responses with code block highlight support and document uploads.
10. **Activity Feed**: Timeline feed documenting leads changes, sync events, and automated messages.
