# Changelog

## [1.4.0] - 2026-01-29 (The Design System Update)
**Status:** Live on Production 🎨
**Focus:** UI/UX Polish & Mobile Responsiveness

### Added
- **Glassmorphism UI:** Implemented `backdrop-filter: blur(12px)` to create a modern, frosted-glass aesthetic for high-contrast readability.
- **Responsive Grid Layout:** Architected a CSS Grid system that fluidly adapts from Desktop (Sidebar View) to Mobile (Stacked View).
- **Micro-Interactions:** Added tactile CSS transforms (`translateY`) to buttons, providing physical feedback on user interaction.

### Changed
- **Color Architecture:** Standardized the palette using CSS Variables (`--primary`, `--bg-dark`) for consistent theming.
- **Typography:** Migrated to 'Inter' font family for improved legibility on high-DPI screens.

## [1.3.0] - 2026-01-29 (The Analytics Update)
**Status:** Live on Production 📊
**Focus:** Data Visualization & User Insight

### Added
- **Visual Analytics Engine:** Integrated **Chart.js** to render a real-time "Skill Radar" (Spider Chart) at the end of every session.
- **Dynamic Gradient UI:** Implemented HTML5 Canvas linear gradients to create a "Cyberpunk" aesthetic consistent with the dark mode theme.
- **Smart Fallback Logic:** Engineered a "Cold Start" state that displays placeholder data for new users, ensuring the UI never looks broken.

### Changed
- **Report Card Redesign:** Deprecated the text-based list in favor of a visual-first approach to reduce cognitive load.

## [1.2.0] - 2026-01-29 (The Voice Update)
**Status:** Live on Production 🔊
**Focus:** Accessibility & Multimodal Learning

### Added
- **Text-to-Speech (TTS) Integration:** Leveraged the native **Web Speech API** to provide real-time German pronunciation for all quiz questions.
- **Smart Audio Sanitization:** Implemented a regex-based parser to silence "blank" underscores (`______`) during speech playback, ensuring natural sentence flow.
- **CI/CD Pipeline:** Established automated deployment workflows linking **GitHub Main Branch** to **Netlify**, reducing deployment time by 90%.

### Changed
- **UX Enhancement:** Added interactive "Speaker" iconography to the question card interface.
- **Deployment Strategy:** Migrated from manual drag-and-drop to continuous integration.

---

## [1.1.0] - 2026-01-29 (The SaaS Update)
**Status:** Live on Production ☁️
**Focus:** User Retention & Data Persistence

### Added
- **Cloud Authentication (Firebase Auth):** Implemented secure Email/Password identity management to support multi-user environments.
- **Cross-Device Sync (Firestore):** Migrated data layer from `LocalStorage` (client-side) to **NoSQL Cloud Database**, enabling users to switch devices without losing progress.
- **Session Continuity:** Users now retain their "Lifetime Stats" (Total Questions Solved) even after logging out.

### Changed
- **Database Architecture:** Pivot from a decentralized LocalStorage model to a centralized **Cloud-First Architecture** to prepare for future leaderboard features.
- **Security:** Integrated Firebase SDK with modular imports for optimized bundle size.

### Fixed
- **Data volatility issue:** Resolved the limitation where clearing browser cache would delete user progress.

---

All notable changes to the **GermanPro Analytics** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-28 (The Launch Release)
**Status:** Production Ready 🚀
**Deployed to:** Netlify

### Added
- **Smart Review Algorithm:** Implemented a Priority Queue system that identifies categories with <50% accuracy and forces them into the next session.
- **Analytics Engine:** Visual "Performance Review" dashboard showing "Critical Weakness" vs. "Mastered" status.
- **Persistence:** Integrated `LocalStorage` to save user history (Total Questions & Accuracy) across browser sessions.
- **Deployment:** Live hosting via Netlify.

### Changed
- **Algorithm Strategy:** Moved from "Pure Random Shuffle" to "Weighted Priority Shuffle."
- **UI Architecture:** Finalized "Midnight Pro" theme with CSS Variables for consistent dark mode.

### Removed
- **User Authentication:** Rolled back the Beta Login System (v0.9) to reduce user friction and focus on the core learning value proposition (MVP Strategy).

---

## [0.9.0] - 2026-01-27 (Beta Phase)
### Added
- Basic "Grammar" vs. "Vocabulary" module switching.
- Initial JSON database structure (`grammar.json`).
- Sidebar navigation for mobile responsiveness.

### Fixed
- Resolved "Unsaved File" crash where `logic.js` could not find `vocabulary.json`.