# StoryVoice — Developer README

**Tagline:** Your voice. Your story.  
**Artifact:** Standalone Phase 3 interactive prototype  
**Entry point:** `index.html`

StoryVoice is a voice-first manuscript drafting environment for fiction writers. This prototype demonstrates the journey from spoken material to writer-approved manuscript text. It is intentionally self-contained so a developer can run, inspect and extend the experience without first installing a framework or configuring a backend.

> **Prototype boundary:** This is a front-end interaction prototype, not a production application. Recording, transcription and AI transformation are simulated. Project data exists in browser memory only and is cleared when the page is refreshed.

---

## 1. Run the prototype

### Fastest option

1. Download the project files.
2. Keep `index.html` and this `README.md` in the same directory.
3. Open `index.html` in a current browser.

There is no build step, package manager, server, API key, account or installation requirement.

### Optional local server

For a more production-like browser origin, run a static file server from the project directory:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

No application server is required. The static server only serves the HTML file.

---

## 2. Project structure

```text
storyvoice-prototype/
├── index.html       # Complete application: markup, styles and JavaScript
└── README.md        # This developer guide
```

The prototype is deliberately delivered as one HTML file. CSS and JavaScript are embedded in `index.html`; there are no local assets or third-party runtime dependencies.

### Main sections inside `index.html`

| Section | Responsibility |
|---|---|
| `<head>` | Document metadata, viewport declaration and page title |
| `:root` | Design tokens: colour, typography, radius and shadow |
| Global styles | Reset, type defaults, focus treatment and shared layout primitives |
| Component styles | Navigation, panels, cards, buttons, forms, manuscript and dialogs |
| Responsive styles | Desktop, tablet, mobile and reduced-motion behaviour |
| App shell | Header, navigation drawer, main page mount point, modal and toast |
| Sample data | Demonstration transcript, transformation modes and story context |
| Project state | Active project data and per-project in-memory snapshots |
| UI helpers | Navigation, toast, headings, buttons, breadcrumbs and progress stepper |
| Page renderers | HTML templates for each application screen |
| Export utilities | TXT, Markdown and browser-generated DOCX creation |
| Event handlers | Delegated click, form, change, keyboard and input handling |
| Initial render | Mounts the Projects screen when the document loads |

The file contains comments at these boundaries. Please preserve or update those comments when moving code or introducing new sections.

---

## 3. Product workflow

The primary journey is:

**Projects → Project Workspace → Record / Import → Transcribe → Transform → Compare → Approve → Organise → Export**

The prototype exposes these screens:

| Screen | Route key | Purpose |
|---|---|---|
| Projects | `projects` | Browse and open writing projects |
| Create Project | `create` | Create a project and add basic details |
| Project Workspace | `workspace` | Review project activity and accepted scenes |
| Capture Choice | `capture` | Choose recording or audio import |
| Recorder | `recorder` | Demonstrate the recording controls and timer |
| Audio Import | `import` | Select a local audio file for the simulated flow |
| Import Progress | `importing` | Demonstrate import progress and failure state |
| Transcription Progress | `transcribing` | Demonstrate transcription progress and retry |
| Transcript Review | `transcript` | Correct the source transcript before transformation |
| Transformation Setup | `transform` | Select one of the three transformation modes |
| Draft Processing | `processing` | Demonstrate draft preparation and failure recovery |
| Draft Comparison | `review` | Compare source and draft before accepting |
| Draft Editor | `editor` | Edit and save the candidate draft |
| Acceptance / Organisation | `organise` | Choose a scene destination and accept the draft |
| Scene View | `scene` | Read accepted manuscript content |
| Edit Accepted Scene | `editScene` | Edit the accepted scene |
| Story Context | `context` | Add, edit, delete and approve story context |
| Export | `export` | Export accepted text as TXT, Markdown or DOCX |
| Settings | `settings` | View prototype profile and preference placeholders |

The route keys are internal view identifiers, not URL routes. Navigation is handled in the browser without a router library.

---

## 4. Core product rules represented in the prototype

These rules are intentional. Do not weaken them when extending the interface:

- The writer remains the author and final decision-maker.
- The original recording, source transcript, transformed draft and accepted manuscript are separate artefacts or states.
- Transformations do not silently overwrite the source transcript.
- A draft is not manuscript content until the writer explicitly accepts it.
- Acceptance requires a scene destination: create a new scene or append to an existing one.
- Export includes accepted manuscript text only. Source transcripts and unaccepted drafts are excluded.
- Story context is writer-controlled. Suggestions are not canonical story facts unless approved.
- Unsaved source, draft and accepted-scene edits trigger a leave-without-saving confirmation.

### Transformation modes

1. **Faithful Transcript** — punctuation and minimal formatting; preserve the writer's wording.
2. **Clean Transcript** — remove obvious disfluencies while retaining meaningful spoken structure.
3. **Readable Draft** — shape rough speech into readable prose without inventing story events.

In this prototype, the sample passage is predefined. The transformations are demonstration outputs, not calls to a language model.

---

## 5. State and rendering model

The application uses a small, dependency-free state model in the global script scope.

- `state` is the active application state.
- `state.projects` holds the project list.
- `state.projectId` identifies the active project.
- `PROJECT_FIELDS` lists the project-scoped values copied into each project's `data` snapshot.
- `snapshotProject()` saves the active in-memory values into the active project's snapshot.
- `activateProject(id)` switches the active project and restores its snapshot.
- `page(routeKey)` changes the current view, closes the navigation drawer and calls `render()`.
- `render()` selects a page renderer and replaces the contents of `#main`.

### Adding a screen

1. Create a renderer function that returns the screen markup.
2. Register it in the `pages` object inside `render()` using a route key.
3. Add or reuse a navigation item or `data-action` control if the screen needs to be reachable.
4. Add its interactions to the delegated click handler where appropriate.
5. Add responsive checks at narrow mobile, tablet and desktop widths.
6. Update this README's screen table if the screen is part of the intended experience.

### Interaction conventions

- Use `data-action="actionName"` for delegated click actions.
- Use `data-page="routeKey"` for primary sidebar navigation.
- Keep action handling in the central `document.addEventListener("click", ...)` handler unless a native form/control event is more appropriate.
- Use the existing `btn()`, `heading()`, `crumb()` and `stepper()` helpers where possible.
- Escape user-entered values with `esc()` before interpolating them into HTML.
- Keep status feedback clear with `toast()` or the existing notice styles.
- Avoid attaching listeners to elements that are destroyed and recreated by `render()`; delegated events are used for that reason.

---

## 6. Responsive layout

The interface uses CSS Grid, Flexbox, fluid spacing and a small set of breakpoints. The viewport meta tag is already included.

| Range | Behaviour |
|---|---|
| Above 980px | Desktop workspace with persistent sidebar; three-column project grid |
| 980px and below | Reduced grid density and stacked secondary workspace columns |
| 701–860px | Tablet navigation drawer; content remains in a tablet-friendly grid |
| 700px and below | Mobile navigation drawer, single-column cards and stacked page headings |
| 420px and below | Compact header, tighter page gutters and panel spacing |

The workflow stepper intentionally scrolls horizontally inside its own container on narrow screens. This is not document-level horizontal overflow; users can swipe or scroll the stepper to reach later stages.

### Responsive verification performed

The current HTML was rendered in headless Chromium at these viewport widths:

`320, 360, 390, 430, 600, 700, 701, 768, 820, 860, 900, 1024, 1280, 1440, 1920, 2560px`.

Verification included:

- 112 primary navigation / route and viewport combinations.
- 171 page-render and viewport combinations across all 19 registered screens, including intermediate workflow screens.
- Document-level horizontal overflow checks.
- Navigation drawer open/close checks at mobile and tablet widths.
- Browser JavaScript error monitoring during the rendered route checks.

**Result:** No document-level horizontal overflow or browser page errors were observed in those checks. The stepper's own horizontal scrolling is intentional.

This is a Chromium viewport test, not proof of identical rendering on every physical device or browser. Safari, Firefox, Android/iOS device testing, assistive technology and formal accessibility audits should still be completed before production use.

---

## 7. Export implementation

TXT and Markdown exports are generated as browser downloads. DOCX is assembled locally as an Office Open XML ZIP package; no export API or server is called.

The export path is intentionally guarded by accepted manuscript state. If no accepted content exists, the export controls remain unavailable. Project export includes accepted scenes from the active project.

If export behaviour is changed, verify the resulting files with real applications or parsers (for example, Microsoft Word or LibreOffice for DOCX), not only by checking that a download was triggered.

---

## 8. Prototype limitations and production work

The following are not implemented:

- Real microphone capture or audio recording.
- Real audio playback.
- Speech-to-text processing.
- AI transformation or model integration.
- Backend, database or durable project persistence.
- Authentication, account management or cloud synchronisation.
- Cloud audio storage, deletion workflows or production privacy/security controls.
- Billing, subscriptions, analytics or monitoring infrastructure.
- Production export service, recovery or cross-device state synchronisation.
- Automated unit, integration or end-to-end test suite in the repository.

The audio file picker selects a local file for demonstration only; the file is not uploaded. Refreshing the browser resets in-memory data. Do not use real confidential manuscripts or personal recordings as if this prototype were a secure production service.

---

## 9. Collaboration guidelines

Before changing the prototype:

1. Read this README and the inline section comments in `index.html`.
2. Preserve the separation between source transcript, transformed draft and accepted manuscript.
3. Keep the writer's explicit approval as the boundary for manuscript acceptance and story-context approval.
4. Avoid adding dependencies unless the product architecture has explicitly moved beyond the standalone prototype.
5. Keep responsive styles grouped in the responsive section rather than scattering overrides throughout the file.
6. Use semantic controls, visible keyboard focus and accessible labels for new interactions.
7. Test the affected route at 320px, 390px, 768px, 1024px and 1440px at minimum; add other widths when a layout change affects a breakpoint.
8. Confirm that `document.documentElement.scrollWidth` does not exceed `window.innerWidth` for each tested screen. A horizontally scrollable child such as the workflow stepper is acceptable when intentional.
9. Verify the browser console and test the relevant interaction states, including empty, loading, success, error and unsaved-change states.
10. Update this README whenever routes, setup, architecture or prototype boundaries change.

### Suggested manual review checklist

- [ ] Projects list and project creation
- [ ] Project switching and project data isolation
- [ ] Record / import entry points
- [ ] Transcript editing and unsaved-change guard
- [ ] All three transformation modes
- [ ] Source and draft comparison
- [ ] Draft editing, restore and reject paths
- [ ] Explicit acceptance and scene destination
- [ ] Multiple accepted scenes and scene editing
- [ ] Story context add, edit, delete and approval
- [ ] TXT, Markdown and DOCX export
- [ ] Mobile navigation drawer and stepper scrolling
- [ ] 320px, 390px, 768px, 1024px and 1440px layouts
- [ ] Keyboard focus, reduced motion and readable contrast

---

## 10. Product source alignment

This prototype reflects the approved StoryVoice Phase 1 problem hypothesis, Phase 2 product strategy and Phase 3 experience architecture. It is a demonstration of the intended interaction model, not evidence of market validation, product-market fit, measured transcription fidelity, transformation quality or production technical feasibility.
