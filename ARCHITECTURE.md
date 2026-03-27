# Architecture — Market Research Analysis Platform

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Data     │  │ Analysis │  │ Output   │  │ Report   │       │
│  │ Input    │→ │ Flow     │→ │ Display  │→ │ Builder  │       │
│  │ Layer    │  │ Engine   │  │ Layer    │  │          │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│       ↕              ↕             ↕             ↕             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    DATA STORE (Zustand)                  │   │
│  │  rawData | parsedData | session | findings | chartConfigs│   │
│  └─────────────────────────────────────────────────────────┘   │
│                            ↕                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              STATS ENGINE (pure computation)             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## BLOCK 1: Data Input Layer

### Purpose
User pastes survey data. The system structures it, tags it, and makes it available for all analyses.

### Components

```
DataInput/
├── DataWorkspace.tsx          # Main workspace container
│   ├── PasteGrid.tsx          # Spreadsheet grid (Handsontable)
│   ├── ColumnTagger.tsx       # Tag columns: Rating/Checkbox/Segment/Behavioral
│   ├── DataPreview.tsx        # Show first 3 + last 3 rows for verification
│   ├── QuestionTypeCard.tsx   # Shows detected/tagged question type per column group
│   └── AddQuestionButton.tsx  # Add another data group
│
├── parsers/
│   └── universalParser.ts     # ONE parser for all data types
│       ├── parseGrid()        # Raw paste → structured rows × columns
│       ├── detectHeaders()    # First row text? → auto-label columns
│       ├── classifyColumn()   # Numeric/categorical/sparse → suggest type
│       └── validate()         # Row counts match, no corruption
│
└── types/
    └── dataTypes.ts
        ├── QuestionType       # 'rating' | 'matrix' | 'checkbox' | 'radio' | 'category' | 'behavioral'
        ├── ColumnDefinition   # { id, name, type, values[], nRows, nMissing }
        ├── DataGroup          # { questionType, columns[], label, scaleRange? }
        └── PastedData         # { groups: DataGroup[], segments?: ColumnDefinition }
```

### How it works

```
User pastes into grid
        ↓
universalParser.parseGrid(rawText)
        ↓
Grid displays structured data (rows × columns)
        ↓
User tags columns via ColumnTagger:
  "Columns A-D = Matrix Grid (rating 1-5)"
  "Column E = Segment (DPS)"
        ↓
DataStore.setParsedData({
  groups: [
    { type: 'matrix', columns: [A, B, C, D], label: 'Clubs Clash Satisfaction', scaleRange: [1,5] },
  ],
  segments: { id: 'E', name: 'DPS', values: [...], groups: ['NonPayer','Minnow','Dolphin','Whale'] }
})
```

### Key rule
**The parser NEVER removes rows.** Empty cells stay as `null`. Row count in = row count out. The grid guarantees structural alignment — you can't have column A with 3009 rows and column E with 3010 rows because they're in the same grid.

---

## BLOCK 2: Analysis Flow Engine

### Purpose
Decides WHAT to analyze based on the data types present, runs analyses in sequence, carries data forward between steps.

### Components

```
FlowEngine/
├── FlowDetermination.ts       # Core algorithm: data types → analysis steps
│   ├── determineFlows()       # Returns ordered list of flows + steps
│   ├── FLOW_REGISTRY          # All possible flows defined here
│   └── STEP_REGISTRY          # All possible steps defined here
│
├── flows/
│   ├── RatingFlow.ts          # Rating + Segment: Freq → Crosstab → KW → PostHoc
│   ├── MatrixFlow.ts          # Matrix + Segment: Scale → BySegment → KW → Cronbach → FA
│   ├── CheckboxFlow.ts        # Checkbox + Segment: Rates → BySegment → ChiSq
│   ├── BehavioralFlow.ts      # Behavioral + Segment: Summary → BySegment → KW → Corr
│   └── CrossAnalysisFlow.ts   # Cross-question: Correlation → PointBiserial → Regression → DriverAnalysis
│
├── steps/
│   ├── FrequencyStep.ts       # Distribution, Top2/Bot2 box, Net score, diverging bar
│   ├── CrosstabStep.ts        # % by segment, index values, heatmap, sig letters
│   ├── SignificanceStep.ts    # KW/ANOVA, effect size (ε²), significance map
│   ├── PostHocStep.ts         # Pairwise MW, Bonferroni, mean plot with CI
│   ├── ReliabilityStep.ts     # Cronbach α, item-total, alpha-if-deleted
│   ├── FactorStep.ts          # EFA, scree plot, loadings, factor map
│   ├── RegressionStep.ts      # Linear/logistic, R², beta chart, residuals
│   ├── DriverStep.ts          # All predictors → outcome, importance ranking
│   ├── CorrelationStep.ts     # Pearson/Spearman matrix, heatmap, scatter
│   ├── PointBiserialStep.ts   # Binary × continuous comparison
│   └── SegmentProfileStep.ts  # Per-segment cards, radar/bar, vs average
│
└── StepRunner.ts              # Executes a step, stores results, pushes findings
    ├── runStep(stepId, session) → StepResult
    ├── StepResult             # { html?, data, charts[], findings[], plainLanguage }
    └── pushFinding(finding)   # Adds to session.findings for TLDR report
```

### Flow determination algorithm

```typescript
function determineFlows(data: PastedData): Flow[] {
  const flows: Flow[] = [];
  const has = {
    rating: data.groups.some(g => g.type === 'rating'),
    matrix: data.groups.some(g => g.type === 'matrix'),
    checkbox: data.groups.some(g => g.type === 'checkbox'),
    radio: data.groups.some(g => g.type === 'radio'),
    behavioral: data.groups.some(g => g.type === 'behavioral'),
    segment: !!data.segments,
  };

  // Individual flows
  if (has.rating && has.segment)     flows.push(RatingFlow);
  if (has.matrix && has.segment)     flows.push(MatrixFlow);
  if (has.checkbox && has.segment)   flows.push(CheckboxFlow);
  if (has.behavioral && has.segment) flows.push(BehavioralFlow);

  // Solo flows (no segment)
  if (has.rating && !has.segment)    flows.push(RatingSoloFlow);
  if (has.matrix && !has.segment)    flows.push(MatrixSoloFlow);

  // Cross-question flows (multiple data types)
  if (has.rating && has.matrix)      flows.push(RatingMatrixCrossFlow);
  if (has.rating && has.checkbox)    flows.push(RatingCheckboxCrossFlow);
  if (has.rating && has.behavioral)  flows.push(RatingBehavioralCrossFlow);
  if (has.matrix && has.behavioral)  flows.push(MatrixBehavioralCrossFlow);

  // Driver Analysis (the big one — needs rating + at least one other type)
  if (has.rating && (has.matrix || has.behavioral || has.checkbox)) {
    flows.push(DriverAnalysisFlow);
  }

  return flows;
}
```

### Step definition example

```typescript
const SignificanceStep: StepDefinition = {
  id: 'kw_significance',
  title: 'Significance Testing',
  desc: 'Are the differences between segments real or random?',
  requires: ['rating|matrix|behavioral', 'segment'],
  run: (session) => {
    // For each data column, run KW across segments
    const results = session.dataColumns.map(col => {
      const groups = splitBySegment(col, session.segments);
      const kw = StatsEngine.kruskalWallis(groups);
      const effectSize = computeEpsilonSquared(kw.H, groups.length, col.length);
      return { column: col.name, H: kw.H, p: kw.p, df: kw.df, effectSize };
    });

    return {
      data: results,
      charts: [
        { type: 'significanceMap', data: results },
        { type: 'meanBySegment', data: results, withCI: true }
      ],
      findings: results.filter(r => r.p < 0.05).map(r => ({
        finding: `Significant difference on ${r.column} (p=${r.p.toFixed(4)})`,
        important: true
      })),
      plainLanguage: generatePlainLanguage(results, session.segments.name)
    };
  }
};
```

---

## BLOCK 3: Stats Engine

### Purpose
Pure computation. No UI, no DOM, no opinions about visualization. Takes arrays in, returns numbers out.

### Structure

```
engine/
├── stats-engine.ts            # Direct port from current JS (6800 lines)
│   ├── describe(values)       # Mean, median, SD, skewness, kurtosis, CI
│   ├── ttest(a, b)            # Welch t-test
│   ├── pairedTTest(a, b)      # Paired t-test
│   ├── anova(groups)          # One-way ANOVA + post-hoc
│   ├── kruskalWallis(groups)  # Non-parametric comparison
│   ├── mannWhitney(a, b)      # Non-parametric 2-group
│   ├── wilcoxon(a, b)         # Paired non-parametric
│   ├── friedman(conditions)   # Repeated measures non-parametric
│   ├── pearson(x, y)          # Correlation
│   ├── spearman(x, y)         # Rank correlation
│   ├── chiSquare(table)       # Chi-square test
│   ├── linearRegression(y, xs)# Multiple regression
│   ├── logisticRegression(y, xs) # Logistic regression
│   ├── cronbachAlpha(items)   # Scale reliability
│   ├── factorAnalysis(items)  # EFA with varimax
│   ├── pca(items)             # Principal components
│   ├── kMeans(data, k)        # Clustering
│   └── ... (all 47 functions)
│
├── types.ts                   # TypeScript interfaces for all inputs/outputs
│   ├── TTestResult            # { t, df, p, meanA, meanB, cohensD, ci95 }
│   ├── ANOVAResult            # { F, p, dfBetween, dfWithin, etaSquared, postHoc[] }
│   ├── RegressionResult       # { R2, adjR2, F, fP, coefficients[], residuals[] }
│   └── ... (typed results for every function)
│
└── helpers/
    ├── effectSizes.ts         # Cohen's d, eta-squared, epsilon-squared, Cramér's V
    ├── postHoc.ts             # Pairwise comparisons with Bonferroni
    ├── assumptions.ts         # Normality, homogeneity, VIF, Cook's D
    └── plainLanguage.ts       # All interpretation functions
        ├── plainP(p, variable, group)
        ├── plainR(r)
        ├── plainR2(r2)
        ├── plainAlpha(alpha)
        ├── plainEffectSize(type, value)
        └── plainDrivers(betas[])
```

### Key principle
The engine is a **pure function library**. It has no state, no side effects, no DOM access. Every function: arrays in → typed result out. This makes it:
- Testable (1,400+ existing tests transfer directly)
- Portable (use in Node, browser, worker thread)
- Trustworthy (if input is correct, output is correct — the bugs were always in the input layer, not here)

---

## BLOCK 4: Chart & Visualization Layer

### Purpose
Renders interactive, editable, exportable charts from analysis results.

### Components

```
Charts/
├── ChartContainer.tsx         # Wrapper: chart + edit button + download button
│   ├── PlotlyChart.tsx        # Base Plotly component with default config
│   ├── ChartEditor.tsx        # Panel: rename title, labels, change colors
│   └── ChartExport.tsx        # Download as PNG/SVG/JPG
│
├── chart-types/
│   ├── HorizontalBarChart.tsx        # Means, selection rates, betas
│   ├── GroupedBarChart.tsx            # Items × segments
│   ├── DivergingStackedBar.tsx       # Market research classic: 1-2-3-4-5 centered
│   ├── StackedPercentBar.tsx         # 100% stacked bars per segment
│   ├── HeatmapTable.tsx              # Correlation matrix, crosstab with color
│   ├── ScatterPlot.tsx               # Correlation, predicted vs actual
│   ├── BoxPlot.tsx                   # Distribution by segment
│   ├── SignificanceMap.tsx           # -log10(p) bars with threshold line
│   ├── BetaImportanceChart.tsx       # Standardized coefficients sorted
│   ├── RadarChart.tsx                # Segment profiles across items
│   └── HistogramChart.tsx            # Distribution with mean/median lines
│
├── chart-config/
│   ├── colors.ts              # Editorial palette (slate blue, warm coral, sage green...)
│   ├── layouts.ts             # Default Plotly layouts (dark mode, light mode)
│   └── themes.ts              # Preset themes (editorial, corporate, academic)
│
└── useChartStore.ts           # Zustand store for chart edit state
    ├── chartConfigs: {}       # Per-chart overrides (title, labels, colors)
    ├── updateChart(id, config)
    └── resetChart(id)
```

### How chart editing works

```
Analysis step produces data
        ↓
ChartContainer renders PlotlyChart with default config
        ↓
User clicks "Edit Chart" button
        ↓
ChartEditor panel opens:
  - Title: [                    ]
  - X axis: [                   ]
  - Y axis: [                   ]
  - Colors: [picker] [picker] [picker]
  - Legend position: [top] [bottom] [right]
        ↓
Changes stored in useChartStore
        ↓
PlotlyChart re-renders with merged config
        ↓
User clicks "Download" → Plotly.downloadImage(format)
```

### Plotly configuration

```typescript
// Base config shared by all charts
const baseConfig: Partial<Plotly.Config> = {
  responsive: true,
  displayModeBar: true,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  toImageButtonOptions: {
    format: 'png',
    height: 600,
    width: 900,
    scale: 2,
  },
  editable: true,  // Click to edit title, labels
};

// Dark mode layout
const darkLayout: Partial<Plotly.Layout> = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { family: 'Inter, sans-serif', size: 12, color: '#e8e4e0' },
  legend: { orientation: 'h', y: -0.15, x: 0.5, xanchor: 'center' },
  margin: { l: 60, r: 20, t: 50, b: 80 },
  xaxis: { gridcolor: 'rgba(255,255,255,0.06)' },
  yaxis: { gridcolor: 'rgba(255,255,255,0.06)' },
};
```

---

## BLOCK 5: Output Display Layer

### Purpose
Renders analysis results as cards with charts, tables, plain language, and interactive elements.

### Components

```
Output/
├── AnalysisWorkspace.tsx      # Main results area
│   ├── FlowSection.tsx        # One section per flow (e.g., "Rating + Segments")
│   │   ├── StepCard.tsx       # One card per analysis step
│   │   │   ├── StepHeader.tsx         # Step number, title, description
│   │   │   ├── PlainLanguageCard.tsx   # Green/gray interpretation card
│   │   │   ├── MetricsRow.tsx          # Key numbers: Mean, N, p-value
│   │   │   ├── ChartContainer.tsx      # Interactive chart
│   │   │   ├── DataTable.tsx           # Results table (sortable, heatmap-colored)
│   │   │   ├── SigBadge.tsx            # Green "significant" / gray "not significant"
│   │   │   ├── EffectSizeCard.tsx      # "ε² = 0.08 (medium) — explains 8%"
│   │   │   ├── CollapsibleDetails.tsx  # Technical stats hidden by default
│   │   │   └── NextStepButton.tsx      # "→ Next: Post-hoc comparisons"
│   │   └── CrossAnalysisSection.tsx    # Cross-question analysis steps
│   │
│   ├── SegmentProfileCards.tsx         # Per-segment profile cards
│   └── DriverDashboard.tsx             # Driver analysis hero visualization
│
├── tables/
│   ├── FrequencyTable.tsx     # Distribution with inline % bars
│   ├── CrosstabTable.tsx      # Segments × options with sig letters, index
│   ├── CoefficientTable.tsx   # Regression coefficients with stars
│   ├── CorrelationMatrix.tsx  # Heatmap-colored correlation table
│   ├── PostHocTable.tsx       # Pairwise comparisons with Bonferroni
│   └── ExecutiveSummary.tsx   # One row per item: Mean, T2B, Net, Best/Worst segment
│
└── common/
    ├── TopBottomBox.tsx       # Top-2 box / Bottom-2 box display
    ├── IndexBadge.tsx         # "idx 105" green / "idx 88" red
    ├── ConfidenceInterval.tsx # "2.32 [2.26, 2.38]"
    └── ActionableInsight.tsx  # "So what?" card with recommendation
```

### Display hierarchy per step

```
┌─────────────────────────────────────────┐
│ Step 3: Significance Testing            │
│ "Are the differences between segments   │
│  real or random?"                        │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ PLAIN LANGUAGE (green card)          │ │
│ │ "There IS a clear difference between │ │
│ │  DPS segments on Matchmaking.        │ │
│ │  Extremely unlikely to be random."   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ KEY METRICS                          │ │
│ │ H: 18.61  |  p: 0.002  |  ε²: 0.08 │ │
│ │ df: 5     |  Groups: 6  |  Effect:  │ │
│ │           |             |  Medium   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ SIGNIFICANCE MAP (chart)             │ │
│ │ ████████████████ Matchmaking  *      │ │
│ │ ██████████████   Rewards      *      │ │
│ │ ████████         Leaderboard         │ │
│ │ ──────── threshold (p=.05) ──────── │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ MEAN BY SEGMENT (chart with CI)      │ │
│ │ [grouped bar chart with whiskers]    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ▸ Technical Details (collapsed)         │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ SO WHAT?                             │ │
│ │ "Focus on Matchmaking fairness —     │ │
│ │  the biggest gap between segments."  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [→ Next: Which segments differ?]        │
└─────────────────────────────────────────┘
```

---

## BLOCK 6: Report Builder

### Purpose
Collects findings from all analysis steps and generates a structured, exportable report.

### Components

```
Report/
├── ReportBuilder.tsx          # Main report generation UI
│   ├── ReportPreview.tsx      # Live preview of the report
│   ├── FindingsList.tsx       # All findings, reorderable, toggleable
│   ├── ChartSelector.tsx      # Pick which charts to include
│   └── ReportEditor.tsx       # Edit headings, add commentary
│
├── templates/
│   ├── ExecutiveTemplate.tsx  # 1-page executive summary
│   ├── DetailedTemplate.tsx   # Full report with all steps
│   └── PresentationTemplate.tsx # Slide-format for PPTX
│
├── export/
│   ├── exportPDF.ts           # React-PDF renderer
│   ├── exportPPTX.ts          # pptxgenjs generation
│   ├── exportDOCX.ts          # docx generation (optional)
│   └── exportCharts.ts        # Plotly.toImage for each chart
│
└── useReportStore.ts          # Zustand store for report state
    ├── findings: Finding[]    # Collected from all steps
    ├── includedCharts: string[] # Chart IDs to include
    ├── commentary: {}         # User-added notes per section
    ├── template: string       # Which template to use
    └── generateReport()       # Compile everything into exportable format
```

### Report structure

```
┌─────────────────────────────────────────┐
│           RESEARCH SUMMARY              │
│  Clubs Clash Feature Satisfaction       │
│  N = 3,009  |  5 segments  |  4 items  │
├─────────────────────────────────────────┤
│                                         │
│  EXECUTIVE SUMMARY TABLE               │
│  ┌─────┬──────┬─────┬─────┬──────────┐ │
│  │Item │ Mean │ T2B │ Net │ Sig?     │ │
│  ├─────┼──────┼─────┼─────┼──────────┤ │
│  │Match│ 2.45 │ 17% │ -42 │ p<.001 * │ │
│  │Rwds │ 2.41 │ 17% │ -45 │ p<.001 * │ │
│  │Ldbd │ 2.32 │ 10% │ -51 │ p=.002 * │ │
│  │Chsn │ 2.32 │ 13% │ -50 │ p<.001 * │ │
│  └─────┴──────┴─────┴─────┴──────────┘ │
│                                         │
│  KEY FINDINGS                           │
│  1. Overall satisfaction is LOW         │
│  2. Whales rate highest, NonPayers      │
│     rate lowest on all items            │
│  3. Matchmaking fairness is the #1      │
│     driver of satisfaction (β=0.35)     │
│  4. All items measure one construct     │
│     (α=0.87, Factor 1 explains 76%)    │
│                                         │
│  [Chart: Diverging stacked bar]         │
│  [Chart: Mean by segment]              │
│  [Chart: Driver importance]            │
│                                         │
│  SEGMENT PROFILES                       │
│  Whale: rates everything higher,        │
│    especially Matchmaking (+15% vs avg) │
│  NonPayer: rates everything lowest,     │
│    especially Leaderboard (-12% vs avg) │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ [Download PDF] [Download PPTX]   │   │
│  │ [Copy Text]    [Print]           │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## DATA FLOW — End to End

```
Step 1: PASTE
User pastes spreadsheet data into grid
        ↓
Step 2: PARSE
universalParser.parseGrid() → structured rows × columns
        ↓
Step 3: TAG
User tags columns: "A-D = Matrix, E = Segment"
        ↓
Step 4: STORE
DataStore receives typed, validated PastedData
        ↓
Step 5: DETERMINE
FlowDetermination reads DataStore → generates ordered flows + steps
        ↓
Step 6: ANALYZE (repeat per step)
StepRunner calls StatsEngine with data from DataStore
StatsEngine returns typed results
StepRunner pushes findings to SessionStore
        ↓
Step 7: DISPLAY
StepCard renders:
  - PlainLanguageCard (interpretation)
  - MetricsRow (key numbers)
  - ChartContainer → PlotlyChart (interactive visualization)
  - DataTable (detailed results)
  - NextStepButton (carries data forward)
        ↓
Step 8: CROSS-ANALYZE
CrossAnalysisFlow combines multiple DataGroups
DriverAnalysis uses ALL data types → finds what drives what
        ↓
Step 9: REPORT
ReportBuilder collects all findings + charts
User edits headings, adds commentary, picks charts
        ↓
Step 10: EXPORT
exportPDF() — structured PDF with charts as images
exportPPTX() — each step = one slide
exportCharts() — individual chart images (PNG/SVG)
Copy to clipboard — plain text summary
```

---

## CONNECTION MAP — How Blocks Talk

```
                    ┌──────────────┐
                    │   User       │
                    │   Actions    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
    ┌──────────────┐ ┌──────────┐ ┌──────────┐
    │ Data Input   │ │ Chart    │ │ Report   │
    │ Layer        │ │ Editor   │ │ Builder  │
    └──────┬───────┘ └────┬─────┘ └────┬─────┘
           │              │            │
           ▼              ▼            ▼
    ┌─────────────────────────────────────────┐
    │            ZUSTAND STORES               │
    │                                         │
    │  DataStore     SessionStore  ChartStore  │
    │  ┌─────────┐  ┌──────────┐  ┌────────┐ │
    │  │rawData  │  │currentFlow│ │configs │ │
    │  │parsed   │  │stepResults│ │edits   │ │
    │  │groups   │  │findings  │  │themes  │ │
    │  │segments │  │flowIndex │  └────────┘ │
    │  └────┬────┘  └────┬─────┘             │
    │       │            │                    │
    └───────┼────────────┼────────────────────┘
            │            │
            ▼            ▼
    ┌──────────────────────────┐
    │    FLOW ENGINE           │
    │                          │
    │  determineFlows()        │
    │  stepRunner.run()        │
    │       │                  │
    │       ▼                  │
    │  ┌──────────────────┐   │
    │  │  STATS ENGINE    │   │
    │  │  (pure functions) │   │
    │  │  ttest()         │   │
    │  │  anova()         │   │
    │  │  regression()    │   │
    │  │  kruskalWallis() │   │
    │  │  ...47 functions │   │
    │  └──────────────────┘   │
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │    OUTPUT DISPLAY        │
    │                          │
    │  StepCard                │
    │  ├── PlainLanguage       │
    │  ├── Metrics             │
    │  ├── PlotlyChart ←──── ChartStore (edits)
    │  ├── DataTable           │
    │  └── NextStep            │
    └──────────────────────────┘
```

---

## KEY ARCHITECTURAL RULES

### 1. Data flows DOWN, never UP
Grid → Parser → Store → Flow → Engine → Display → Report. No component reaches back to modify raw data.

### 2. Stats Engine is a black box
It takes typed arrays, returns typed results. It never knows about React, DOM, or user state. Test it independently with 1,400+ existing tests.

### 3. One parser, one store, one truth
All data enters through `universalParser`. All data lives in `DataStore`. Every component reads from the same source. No independent parsing.

### 4. Charts are data + config
Every chart = `{ data: PlotlyData, layout: PlotlyLayout, config: PlotlyConfig }`. The data comes from the step result. The layout comes from the theme + user edits. No chart draws itself from raw data.

### 5. Findings accumulate automatically
Every step that runs pushes findings to `SessionStore.findings`. The report builder just collects what's there. No manual report construction.

### 6. Steps are independent but ordered
Each step can run on its own (given the right data). The flow engine decides the order. Carry-forward is just "the next step reads from the same store."

### 7. Export is a view of the store
PDF, PPTX, clipboard — all read from `SessionStore.findings` + `ChartStore.configs`. They're different renderings of the same data, not separate processes.
