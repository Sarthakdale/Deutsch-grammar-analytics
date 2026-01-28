# Changelog

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