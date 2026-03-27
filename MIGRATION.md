# Migration Plan: Vanilla JS → React Web App

## Retrospective — What Went Wrong and Why

### The 8 parsing functions problem
**What happened:** Built method-by-method, each got its own parser. `parseValues`, `parseCategorical`, `parseMultiResponse`, `parseGrouping`, `parseBinaryValues`, `parseMultiCols`, `alignColumns`, `isScaleData` detection — all doing variations of the same thing with different blank-handling, header detection, and type conversion.

**Root cause:** No data layer. Each method reached directly into textareas, parsed text on the fly, and made its own assumptions about the data.

**React fix:** One `DataStore` (Zustand/Context) that holds parsed, typed, validated data. Components read from the store, never from raw text. Parse once on paste, validate once, share everywhere.

---

### The two-box alignment disaster
**What happened:** User pastes data in box A, grouping in box B. If either box silently removes a blank row, every subsequent row pairs the wrong respondent with the wrong segment. Spent 6+ hours fixing `.filter(blank)` patterns across 240 textareas.

**Root cause:** Two independent text blobs that must stay row-aligned, with no structural guarantee.

**React fix:** Replace textareas with a spreadsheet-like grid component (e.g., `react-datasheet`, `ag-grid-react`, or a lightweight custom grid). User pastes ALL columns at once into the grid. Rows are structural — you can't accidentally delete a row from one column without deleting it from all columns. The grid shows row numbers, column headers, and cell types. User clicks a column header to tag it as "data" or "grouping."

Alternative: Use Handsontable (open source) or SheetJS for paste handling. The paste goes into a structured table, not raw text.

---

### The isScaleData detection mess
**What happened:** Checkbox data (sparse, integer codes) was misdetected as Likert scale data. Added fill rate check (>50%), then strict Number() check, then failsafe (>100% = redirect), then count-per-group check. Four layers of detection because the first three kept failing.

**Root cause:** The app tried to GUESS what the data is. Wrong approach.

**React fix:** The user TELLS the app what the data is by which paste box they use. Box 1 = Rating. Box 2 = Matrix/Checkbox. Box 4 = Segments. No detection needed. The `questionType` is a prop, not a computation.

If we still want auto-detection as a convenience: run it ONCE on paste, show the result to the user ("Detected: Matrix Grid, 4 items, scale 1-5"), and let them CONFIRM or OVERRIDE. Never silently route based on detection alone.

---

### The 15,000-line single file
**What happened:** All CSS, HTML, and JS in one `analyze.html`. Every change risks breaking something unrelated. Can't test components in isolation. Can't reuse components across pages.

**React fix:** Component architecture:
```
src/
  components/
    DataInput/
      PasteGrid.tsx          # Spreadsheet-like paste component
      ColumnTagger.tsx       # Tag columns as data/grouping/etc.
      DataPreview.tsx         # Show first/last rows for verification
    Analysis/
      FrequencyStep.tsx
      CrosstabStep.tsx
      SignificanceStep.tsx
      PostHocStep.tsx
      RegressionStep.tsx
      FactorAnalysisStep.tsx
      DriverAnalysisStep.tsx
      SegmentProfileStep.tsx
    Charts/
      DivergingStackedBar.tsx
      GroupedBarChart.tsx
      HeatmapTable.tsx
      ScatterPlot.tsx
      SignificanceMap.tsx
      BetaImportanceChart.tsx
    Report/
      TLDRReport.tsx
      ExecutiveSummary.tsx
      FindingCard.tsx
      ReportExport.tsx       # PDF/JPG/PPTX export
    Common/
      PlainLanguage.tsx
      SigBadge.tsx
      MetricsRow.tsx
      CollapsibleDetails.tsx
  engine/
    stats-engine.ts          # Direct port, add TypeScript types
    types.ts                 # Data types, session types
  store/
    useDataStore.ts          # Zustand store for all pasted data
    useSessionStore.ts       # Analysis session, findings, flow state
    useChartStore.ts         # Chart configs for editing
  flows/
    flowDetermination.ts     # Which steps for which data combination
    flowDefinitions.ts       # Step definitions with run functions
  utils/
    parseHelpers.ts          # One set of parsing utilities
    formatters.ts            # Number formatting, plain language
    chartColors.ts           # Color palette
```

Each component < 200 lines. Each testable in isolation.

---

### Charts: Canvas 2D → Plotly

**What we have:** 7 custom Canvas 2D drawing functions (`drawBarChart`, `drawHistogram`, `drawBoxPlot`, `drawScatterPlot`, `drawResidualPlot`, `drawVerticalGroupedBarChart`, `drawDivergingStackedBar`). Each is 60-120 lines of manual pixel positioning. No interactivity, no tooltips, no editing, no export.

**What Plotly gives us:**
- Interactive charts (hover tooltips, zoom, pan)
- Editable labels (click to rename axis, title, legend items)
- Built-in export (PNG, SVG, JPG with one button)
- 40+ chart types out of the box
- Responsive by default
- `react-plotly.js` wrapper for React

**Migration map:**

| Current Function | Plotly Equivalent | Extras We Get |
|---|---|---|
| `drawBarChart` | `Plotly.Bar` (horizontal) | Hover values, click to edit labels |
| `drawVerticalGroupedBarChart` | `Plotly.Bar` (grouped) | Legend toggle, hover per bar |
| `drawDivergingStackedBar` | `Plotly.Bar` (stacked, centered) | Animation, hover % |
| `drawHistogram` | `Plotly.Histogram` | Auto-binning, overlay distributions |
| `drawBoxPlot` | `Plotly.Box` | Outlier points, quartile hover |
| `drawScatterPlot` | `Plotly.Scatter` | Trendline, R² annotation |
| `drawHeatmap` | `Plotly.Heatmap` | Color scale, hover values |
| Significance map | `Plotly.Bar` with threshold line | Annotation for threshold |
| Beta importance chart | `Plotly.Bar` (horizontal, sorted) | Color by sign |

**Chart editing flow:**
1. Chart renders from analysis results
2. User clicks "Edit Chart" button
3. Opens a panel: rename title, axis labels, legend items, change colors
4. Changes stored in `useChartStore`
5. User clicks "Download" → PNG/SVG/JPG

**Plotly config for all charts:**
```typescript
const defaultLayout = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  font: { family: 'Inter, sans-serif', color: '#e8e4e0' },
  margin: { l: 60, r: 20, t: 40, b: 60 },
  legend: { orientation: 'h', y: -0.2, x: 0.5, xanchor: 'center' },
  // Editable mode
  editable: true,
  editSelection: true,
};
```

---

### Paste Boxes → Spreadsheet Grid

**Current:** 5 separate textareas. User pastes tab-separated text. App parses it. Rows can misalign between boxes.

**React replacement:** One spreadsheet-like grid component per data type.

**Option A: Handsontable (recommended)**
- Paste from Excel → auto-populates cells
- Row/column structure preserved
- Column headers editable
- Row numbers visible
- Can't delete a row from one column without all columns
- Sorting, filtering built-in
- Free for personal/non-commercial use

```tsx
import { HotTable } from '@handsontable/react';

<HotTable
  data={gridData}
  colHeaders={columnHeaders}
  rowHeaders={true}
  contextMenu={true}
  afterPaste={(data) => handlePaste(data)}
  licenseKey="non-commercial-and-evaluation"
/>
```

**Option B: AG Grid (free community edition)**
- More powerful, enterprise-grade
- Paste handling
- Column types (numeric, text, category)
- Better performance for large datasets (10,000+ rows)

**Option C: Custom lightweight grid**
- Build a simple grid with `<table>` + contentEditable cells
- Less overhead, full control
- More work, but no dependency

**Recommendation:** Start with Handsontable for the prototype. It handles paste perfectly and looks professional. If we need more power, switch to AG Grid later.

**How the grid solves alignment:**
1. User pastes ALL columns (data + grouping) at once into the grid
2. Grid shows all columns side by side with row numbers
3. User clicks column header → dropdown: "This is: Rating Data / Checkbox Data / Segment / Behavioral"
4. The tagged columns go to the right analysis flow
5. Row alignment is GUARANTEED because it's one grid, one paste, one data structure

---

### Export: PDF, JPG, PPTX

**PDF export:**
- Use `react-to-pdf` or `html2canvas` + `jsPDF`
- Capture the TLDR Report div as an image, embed in PDF
- Or use `@react-pdf/renderer` for a structured PDF with styled components
- Plotly charts export as PNG → embed in PDF

**JPG/PNG chart export:**
- Plotly has built-in `Plotly.downloadImage()` — one function call
- Each chart has a download button in the corner

**PPTX export:**
- Use `pptxgenjs` — generates PowerPoint files in the browser
- Each analysis step = one slide
- Charts as images (from Plotly export)
- Tables as PPTX native tables
- TLDR report as a summary slide

```typescript
import pptxgen from 'pptxgenjs';

function exportToPPTX(session, findings) {
  const pptx = new pptxgen();

  // Title slide
  const slide1 = pptx.addSlide();
  slide1.addText('Research Summary', { x: 1, y: 1, fontSize: 36 });

  // Key findings slide
  const slide2 = pptx.addSlide();
  findings.forEach((f, i) => {
    slide2.addText(`${i+1}. ${f.finding}`, { x: 0.5, y: 0.5 + i * 0.6 });
  });

  // Chart slides
  // ... Plotly.toImage() → slide.addImage()

  pptx.writeFile('Research_Summary.pptx');
}
```

---

## Migration Phases

### Phase 1: Foundation (Week 1)
- Set up React + TypeScript + Vite
- Port `stats-engine.js` → `stats-engine.ts` (add types, zero logic changes)
- Set up Zustand stores (DataStore, SessionStore, ChartStore)
- Build `PasteGrid` component with Handsontable
- Build `ColumnTagger` component

### Phase 2: Core Analysis (Week 2)
- Port the 6 starred method flows (Frequencies → Crosstab → Significance → Post-hoc → Reliability → Factor Analysis)
- Build chart components with Plotly (Bar, Grouped Bar, Diverging Stacked)
- Build `PlainLanguage`, `SigBadge`, `MetricsRow` common components
- Build step-by-step flow UI

### Phase 3: Cross-Analysis + Visuals (Week 3)
- Port cross-question analysis (Driver Analysis, correlations, point-biserial)
- Build remaining Plotly charts (Heatmap, Scatter, Significance Map, Beta Chart)
- Add chart editing (rename labels, change colors)
- Add chart download (PNG/JPG)

### Phase 4: Report + Export (Week 4)
- Build TLDR Report component
- Add PDF export
- Add PPTX export
- Add print-friendly styling
- Executive summary table

### Phase 5: Polish + Testing (Week 5)
- Port 120 scenarios as integration tests (Playwright or Cypress)
- Port test-suite.js and test-monitor.js as unit tests (Vitest)
- Add the row-verification card (show 3 sample rows before analysis)
- Dark/light mode
- Mobile responsiveness
- Performance optimization for large datasets (10,000+ rows)

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React 18 + TypeScript | Type safety catches the blank-filter bugs at compile time |
| Build | Vite | Fast, modern, zero config |
| State | Zustand | Simple, no boilerplate, works with TypeScript |
| Charts | Plotly.js (react-plotly.js) | Interactive, editable, exportable, 40+ types |
| Grid | Handsontable | Paste from Excel, structural rows, professional look |
| Styling | Tailwind CSS | Rapid UI, dark mode built-in, consistent |
| Export PDF | @react-pdf/renderer | Structured PDFs with React components |
| Export PPTX | pptxgenjs | PowerPoint generation in browser |
| Testing | Vitest + Playwright | Unit tests for engine, E2E for flows |
| Stats | stats-engine.ts | Direct port of current engine |

---

## What Transfers Directly (zero rewrite)

1. `stats-engine.js` → `stats-engine.ts` — add types, keep all logic
2. `test-suite.js` → `test-suite.test.ts` — keep all assertions
3. `test-monitor.js` → `test-monitor.test.ts` — keep all randomized checks
4. `SCENARIOS.md` — 120 scenarios become Playwright test definitions
5. All plain language helpers (`plainP`, `plainR`, `plainR2`, `plainAlpha`)
6. Flow determination logic (which data combination → which steps)
7. Cross-question analysis logic (driver analysis, correlations)
8. Color palette (`CHART_COLORS`)

---

## What We Delete Forever

1. `.filter(function(s) { return s !== '' })` on row data — TypeScript lint rule prevents this
2. `split(/[\n]+/)` — banned pattern, eslint custom rule
3. `parseFloat("2) Minnow") === 2` — strict typing: `number` type won't accept strings
4. 8 separate parsing functions — replaced by 1 typed parser
5. `isScaleData` detection hacks — user tags the column type
6. `innerHTML` for results — React components
7. 15,000-line single file — 50 focused components
8. Global mutable state — Zustand store with immutable updates

---

## Rules for the New Codebase

1. **Never edit pasted data.** The grid preserves what the user pasted. No filtering, no collapsing, no removing.
2. **Empty cell = data.** In checkbox columns, empty means "not selected." Enforced by the grid component which preserves cell structure.
3. **User declares data type.** No silent detection. The column tagger lets the user say "this is a segment variable." The app trusts them.
4. **One parser, one store.** All data flows through `parseGrid()` → `DataStore`. Every analysis reads from the store.
5. **Charts are editable.** Every chart has an edit button. Labels, titles, colors can be changed. Plotly handles this natively.
6. **Everything exports.** Every chart: PNG/JPG. Every report: PDF. Every presentation: PPTX.
7. **Plain language first.** Every statistical result shows the interpretation BEFORE the numbers.
