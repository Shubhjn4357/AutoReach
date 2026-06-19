# 08 UI Design System Specifications

## Vision & Style Principles

1. **Spatial UI & Depth**:
   - Deeply inspired by Apple Vision Pro, Linear, Raycast, and Vercel.
   - Glassmorphism should be applied selectively (e.g. navigation bars, floating headers) to show visual hierarchy and depth, rather than acting as a universal backdrop.
   - Soft shadows, progressive blurs, and minimal borders structure overlapping panels.
2. **Color Contrast & Dark Theme**:
   - Dark mode is the absolute default interface.
   - OLED black is preferred on OLED device screens to conserve power.
3. **Motion First**:
   - Every layout transition must feel smooth and physically modeled (spring-based animations instead of abrupt cuts or simple linear translations).
   - Use Arc Browser-like sidebar transitions and slide-out layouts.

## Web Admin Panel Layout

- **Desktop**: Left Navigation Sidebar -> Center Context Screen -> Right Inspector/Details Drawer.
- **Tablet**: Collapsed Navigation Rail -> Main Workspace Grid -> Resizable panels.

## Mobile Layout

- **Mobile View**: Bottom navigation tab bar, floating cards, swipe-to-trigger actions, and an always-available floating AI Agent button.
- **Offline Indication**: Subtle, unobtrusive top-bar badge indicating the local queue status.
