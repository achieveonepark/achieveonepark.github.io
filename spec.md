# CyberOS React Simulator Specification

## 1. Overview
This project is a web-based simulation of a **Futuristic Cyberpunk Desktop Environment**, built using **React**, **TypeScript**, **Tailwind CSS**, and **Framer Motion**. It reimagines the desktop metaphor with a "Holographic HUD" aesthetic.

## 2. Design Language (Cyber-Holographic)

### 2.1 Visual Style
- **Theme**: Dark, Neon, Translucent.
- **Palette**: Black (`#000`), Cyan (`#06b6d4`), Purple (`#9333ea`), Dark Slate.
- **Texture**: Frosted glass (`backdrop-blur-xl`) with noise/scanline overlays.
- **Typography**: `Rajdhani` (Google Fonts) for a technical, sci-fi look.
- **Wallpaper**: Dark, Developer-focused, with "Cute/Retro" accents (Pixel art or similar).

### 2.2 Global Effects
- **CRT Scanline**: A global CSS overlay simulates a monitor screen.
- **Glow**: Active elements emit a colored shadow (`box-shadow`).

## 3. Core Architecture

### 3.1 State Management (Context API)
- `OSContext` manages:
    - `apps`: Installed modules.
    - `windows`: Active holographic projections (windows).
    - `activeWindowId`: Focus state.

### 3.2 Window Management
- **Visuals**: Windows appear as floating glass panes with glowing borders.
- **Controls**: Minimalist neon icons for Close/Minimize/Maximize.
- **Constraints**: 
    - Windows are constrained to the viewport to prevent loss.
    - **Maximized State**: Adds an `80px` top margin to respect the floating HUD Menu Bar.
- **Animations**:
    - Launch: Scale up from 0.8 with opacity fade (Materialization effect).
    - Close: Scale down and fade out.

## 4. UI Components

### 4.1 HUD Bar (Menu Bar)
- **Position**: Floating at the top, detached from edges.
- **Content**: System status (Ping, Network, Time) and App Menus.
- **Style**: Dark glass with monospace text.
- **Z-Index**: High (`z-[1000]`) to always stay on top.

### 4.2 Module Dock
- **Position**: Floating at the bottom center.
- **Style**: Capsule shape, heavy blur, glowing active indicators.
- **Visibility**: 
    - Only displays "Pinned" apps or currently open apps.
    - Apps like "Modules", "Logs", "Visual" are unpinned by default.
- **Interactions**:
    - Icons glow on hover.
    - Tooltips appear as mini HUD popups.

## 5. System Modules (Apps)

### 5.1 System (Finder)
- Renamed to "SYSTEM".
- Dark mode file explorer with neon folder icons.
- Displays "Access Denied" for restricted folders.
- Desktop Icon: "parkachieveone" (formerly Macintosh HD).

### 5.2 Shell (Terminal)
- Renamed to "SHELL".
- Green/Green-cyan text on black background.
- IntelliSense for commands (`/help`, `/clear`).

### 5.3 Modules (App Store)
- Interface to inject external "Web Modules".
- Cyberpunk-styled form elements.

### 5.4 Net (Browser)
- Dark mode wrapper for iframes.
- Inverts iframe colors (CSS filter) to attempt visual integration.

## 6. Technical Stack
- **React 18**: Component structure.
- **Tailwind CSS**: Utility-first styling.
- **Framer Motion**: Complex physics-based animations (Drag, Spring).
- **Lucide React**: Vector icons.
