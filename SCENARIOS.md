# 120 Scenarios — Breaking Point Analysis

## Breaking Point Categories

| Code | Breaking Point | Severity |
|---|---|---|
| **ROW** | Rows mismatched — wrong respondent paired with wrong data | DISASTER |
| **CALC** | Stats engine produces wrong calculation | DISASTER |
| **VIZ** | Visualization doesn't show what user wants — needs toggle/option | FIXABLE |
| **ROUTE** | Data sent to wrong analysis function | DISASTER |
| **SILENT** | Wrong result with no warning | DISASTER |
| **BLOCK** | Valid data rejected / button disabled | ANNOYING |
| **COSMETIC** | Output is ugly or confusing but numbers are correct | LOW |

---

## CATEGORY 1: Multi-Response / Scale Detection Boundary

### #1: Checkbox 5 options, ~45% fill → Multi-Response, no grouping
- **Breaking points:**
  - ROW: No (single paste box)
  - CALC: HIGH — if respondents select 3-4 of 5 options (fill >50%), flips to scale mode. Shows means of option CODES instead of selection rates
  - VIZ: Shows diverging Likert chart instead of selection rate bars
  - ROUTE: DISASTER — checkbox data routed to scale comparison

### #2: Matrix Grid 1-3, 4 items, 100% fill → Multi-Response, no grouping
- **Breaking points:**
  - CALC: Borderline — scaleMax-scaleMin=2, exactly at >=2 threshold. Works, but 1-2 scale would fail
  - VIZ: OK if detected correctly

### #3: Matrix Grid 1-5 with ~40% missing cells → Multi-Response, no grouping
- **Breaking points:**
  - ROUTE: DISASTER — fill rate <50%, classified as checkbox. Each rating value treated as "selected option"
  - CALC: DISASTER — shows "45% selected option 3" instead of "mean = 3.2"
  - VIZ: Selection rate bars instead of mean comparison

### #4: Checkbox with integer codes 1-5, ~55% fill → Multi-Response, no grouping
- **Breaking points:**
  - ROUTE: DISASTER — all values integers 1-5, fill >50%, detected as scale
  - CALC: DISASTER — shows mean of option codes (meaningless)
  - VIZ: Diverging Likert chart for checkbox data

### #5: Matrix Grid 0-10 (NPS-style), 3 items → Multi-Response, no grouping
- **Breaking points:**
  - CALC: Borderline — range=10, exactly at <=10 threshold. Works, but 0-11 would fail
  - VIZ: OK

### #6: Ranking 1-N, 4 items, 100% fill → Multi-Response, no grouping
- **Breaking points:**
  - ROUTE: DISASTER — ranking data detected as scale. Shows "mean rating" but these are mean RANKS
  - CALC: SILENT wrong — mean rank of 2.3 interpreted as "rating 2.3 out of 4"
  - VIZ: No ranking-specific visualization (% ranked 1st, 2nd, etc.)

### #7: Matrix Grid 1-7, 4 items → Multi-Response, with grouping (1 extra row in grouping)
- **Breaking points:**
  - ROW: DISASTER — if data header auto-stripped but grouping header not, every respondent gets wrong group label
  - CALC: Wrong means per group (paired with wrong segment)

---

## CATEGORY 2: Frequencies / Crosstab Misinterpretation

### #8: Multi-column checkbox (tabs) → Frequencies, no grouping
- **Breaking points:**
  - ROUTE: Each cell value treated as a "selected option" across ALL columns
  - CALC: Frequency of "3" = count across all items, not per-item
  - VIZ: Shows combined frequencies, not per-item breakdown

### #9: Likert 1-5, single column → Frequencies, no grouping
- **Breaking points:** None — works correctly

### #10: NPS 0-10, single column → Frequencies, no grouping
- **Breaking points:**
  - VIZ: FIXABLE — no NPS-specific output (Promoter/Passive/Detractor breakdown). Shows generic Likert top-2/bottom-2 box instead of NPS convention (Promoter=9-10, Detractor=0-6)

### #11: Likert 1-5 → Frequencies, with grouping (row count differs)
- **Breaking points:**
  - ROW: DISASTER — alignment truncates longer array. If mismatch due to header, first row paired with wrong group, cascading for all rows

### #12: Binary Yes/No → Frequencies, no grouping
- **Breaking points:** None — works correctly

### #13: Continuous revenue values → Frequencies, no grouping
- **Breaking points:**
  - VIZ: FIXABLE — every value unique, table has N rows each with count=1. Useless without binning. Should suggest Summary Statistics

### #14: Radio codes (1=Satisfied, 2=Neutral, 3=Dissatisfied) → Frequencies, no grouping
- **Breaking points:**
  - CALC: SILENT wrong — numeric codes detected as Likert. Shows mean=2.1, top-box/bottom-box. Mean of arbitrary codes is meaningless
  - VIZ: Likert visualization applied to nominal categories

### #15: Multi-column checkbox (tabs) → Frequencies, with grouping
- **Breaking points:**
  - ROW: DISASTER — header auto-stripped from data but not from grouping (or vice versa), shifts alignment
  - CALC: Wrong crosstab — values from wrong respondent assigned to wrong group

---

## CATEGORY 3: T-test / Mann-Whitney — Wrong Test Choice

### #16: Likert 1-5, two independent groups → T-test
- **Breaking points:**
  - CALC: Debatable — t-test on ordinal data. Widely accepted in practice but purists disagree
  - VIZ: OK

### #17: Likert 1-5, paired (before/after) → T-test (independent)
- **Breaking points:**
  - ROUTE: DISASTER — independent t-test discards pairing information. Inflated SE, could miss real effect
  - CALC: SILENT wrong — p-value too conservative (real paired effect masked)

### #18: Two independent groups → Paired T-test (different N)
- **Breaking points:**
  - ROW: DISASTER — alignColumns pairs row 1 left with row 1 right. But these are DIFFERENT people. Pairing is arbitrary
  - CALC: DISASTER — paired t-test on random pairs is meaningless

### #19: NPS 0-10, two groups → T-test
- **Breaking points:**
  - VIZ: FIXABLE — t-test of raw scores ≠ NPS comparison. Users may confuse mean difference with NPS difference

### #20: Binary 0/1, two groups → T-test
- **Breaking points:**
  - VIZ: FIXABLE — shows "mean" of 0/1 (which is a proportion) but doesn't label it as proportion or show CI for proportion

### #21: Revenue (right-skewed), two groups → T-test
- **Breaking points:**
  - CALC: Risk with small N — skewed data violates normality. No warning to use Mann-Whitney

### #22: Likert with text labels → T-test
- **Breaking points:**
  - BLOCK: 0 numeric values, button disabled. Correct behavior

### #23: Paired before/after, rows scrambled in one column → Paired T-test
- **Breaking points:**
  - ROW: DISASTER — tool can't verify row 1 left = row 1 right = same person. If user sorted one column, all pairs are wrong. No warning possible

---

## CATEGORY 4: ANOVA / Kruskal-Wallis — Paired vs Independent

### #24: 3 conditions, same respondents → ANOVA (independent)
- **Breaking points:**
  - ROUTE: DISASTER — ANOVA ignores repeated-measures structure. Between-subject variance inflates error. Could miss real effects
  - CALC: p-value too conservative

### #25: 3 independent groups, different N → Repeated Measures ANOVA
- **Breaking points:**
  - ROW: DISASTER — alignColumns truncates to shortest. Different people arbitrarily paired
  - CALC: DISASTER — RM ANOVA on random pairs is meaningless

### #26: 4 independent groups, different N → Friedman
- **Breaking points:**
  - ROW: DISASTER — same as #25. Friedman requires same people across conditions
  - CALC: DISASTER — chi-square statistic computed on arbitrary pairings

### #27: Likert 1-5, 3 groups → Kruskal-Wallis
- **Breaking points:** None — correct use, independent flag set

### #28: Matrix Grid 1-7, 5 items, same respondents → ANOVA (5 "groups")
- **Breaking points:**
  - ROUTE: DISASTER — items treated as independent groups instead of repeated measures
  - CALC: SILENT wrong — independence assumption violated

### #29: 2 groups → ANOVA
- **Breaking points:**
  - BLOCK: UI starts with 3 boxes minimum. Can't happen

### #30: 3 groups, all identical values → ANOVA
- **Breaking points:**
  - CALC: Edge case — F=0/0 if zero variance within AND between. Now returns F=0, p=1 (fixed)

---

## CATEGORY 5: Correlation — Wrong Assumptions

### #31: Likert 1-5 × Likert 1-5 → Pearson
- **Breaking points:**
  - CALC: Debatable — Pearson on ordinal. Widely accepted but suboptimal

### #32: Binary 0/1 × continuous → Pearson
- **Breaking points:**
  - VIZ: FIXABLE — mathematically correct (= point-biserial) but doesn't show odds ratio interpretation

### #33: Nominal codes (1=North, 2=South) × continuous → Pearson
- **Breaking points:**
  - CALC: DISASTER — correlation of nominal codes is meaningless. r=0.3 "significant" but no interpretation
  - SILENT: No warning that codes are nominal

### #34: Revenue (skewed) × ad spend (skewed) → Pearson
- **Breaking points:**
  - CALC: Risk — single outlier can drive r from 0 to 0.8. No outlier detection

### #35: Ranking × Ranking → Pearson
- **Breaking points:**
  - CALC: Should use Spearman. Pearson CI assumes normality which ranks violate

### #36: 3+ variables → Correlation Matrix
- **Breaking points:**
  - VIZ: FIXABLE — all pairwise Pearson. No option for Spearman matrix

### #37: Two variables, U-shaped relationship → Spearman
- **Breaking points:**
  - CALC: Spearman detects monotonic only. rho≈0 for U-shape despite strong relationship

---

## CATEGORY 6: Regression — Data Type Mismatches

### #38: Continuous outcome + categorical codes as predictor → Multiple Regression
- **Breaking points:**
  - CALC: DISASTER — region coded 1/2/3 treated as continuous. Assumes linear effect across codes
  - SILENT: No warning to dummy-code

### #39: Continuous outcome + Likert predictors → Multiple Regression
- **Breaking points:** None — standard practice, works correctly

### #40: Binary 0/1 outcome → Multiple Regression (linear)
- **Breaking points:**
  - ROUTE: DISASTER — should use Logistic Regression. Linear model predicts outside 0-1
  - CALC: SILENT wrong — SE estimates incorrect (heteroscedasticity)

### #41: Continuous outcome → Logistic Regression
- **Breaking points:**
  - CALC: DISASTER — outcome silently binarized (above/below median). Discards continuous information
  - SILENT: User doesn't realize outcome was transformed

### #42: Ordinal 1-5 outcome → Logistic Regression
- **Breaking points:**
  - CALC: DISASTER — 5-level outcome collapsed to 2 categories. Should use Ordinal Regression
  - SILENT: No suggestion

### #43: Count outcome (0,1,2,...20) → Multiple Regression
- **Breaking points:**
  - CALC: Risk — negative predicted values possible. Poisson more appropriate

### #44: Outcome + 8 predictors, N=25 → Multiple Regression
- **Breaking points:**
  - CALC: DISASTER — severe overfit. R² artificially high. No warning about sample size per predictor

### #45: Two collinear predictors (r>0.95) → Multiple Regression
- **Breaking points:**
  - CALC: DISASTER — multicollinearity. Individual coefficients unstable/wrong sign. No VIF warning

---

## CATEGORY 7: Ordinal Regression Misuse

### #46: Continuous outcome (revenue) → Ordinal Regression
- **Breaking points:**
  - CALC: DISASTER — 200 unique values = 199 threshold parameters. Won't converge or produces nonsense

### #47: Binary 0/1 outcome → Ordinal Regression
- **Breaking points:**
  - CALC: OK but redundant — equivalent to logistic regression

### #48: Nominal codes (1=Red, 2=Blue, 3=Green) → Ordinal Regression
- **Breaking points:**
  - CALC: DISASTER — assumes 1<2<3 is meaningful. Cumulative odds model meaningless for nominal

---

## CATEGORY 8: Scale/Construct Analysis — Wrong Data Shape

### #49: Matrix Grid 1-5, 5 items → Cronbach's Alpha
- **Breaking points:** None — correct use case

### #50: 5 items from DIFFERENT constructs → Cronbach's Alpha
- **Breaking points:**
  - VIZ: FIXABLE — alpha will be low (correct) but "poor reliability" label may confuse. Should explain items may measure different things

### #51: Checkbox/binary 0/1, 5 items → Cronbach's Alpha
- **Breaking points:**
  - CALC: Technically correct (KR-20 equivalent) but alpha suppressed by low base rates

### #52: Matrix Grid 1-7, 3 items, N=10 → Factor Analysis
- **Breaking points:**
  - CALC: DISASTER — N=10 far too small. Factor loadings completely unstable. No minimum N warning

### #53: Matrix Grid 1-5, 20 items → PCA
- **Breaking points:**
  - VIZ: ANNOYING — must paste 20 columns into 20 separate boxes. Very tedious, high error risk

### #54: Ranking 1-N, 5 items → Cronbach's Alpha
- **Breaking points:**
  - CALC: DISASTER — ipsative ranking data violates independence assumption. Alpha uninterpretable

### #55: Matrix Grid 1-5, 3 items → Correlation Matrix
- **Breaking points:**
  - ROW: Risk — if one column has numeric-looking header (e.g., "5 Point Scale"), could be parsed as data

---

## CATEGORY 9: IRT — Silent Binary Conversion

### #56: Likert 1-5, 5 items → IRT
- **Breaking points:**
  - CALC: DISASTER — all non-zero → 1. With Likert 1-5, NO zeros exist. Every response = 1. 100% endorsement. Output is garbage
  - SILENT: Looks like a real analysis

### #57: Likert 0-4, 5 items → IRT
- **Breaking points:**
  - CALC: DISASTER — only 0s map to "incorrect." Values 1,2,3,4 all become 1. Loses all gradation

### #58: Binary 0/1, 10 items → IRT
- **Breaking points:** None — correct use case

### #59: Checkbox (blank/value), 10 items → IRT
- **Breaking points:**
  - CALC: OK for endorsement data, but IRT assumes latent trait ordering. Unordered items give poor fit

---

## CATEGORY 10: Clustering — Scale Mixing

### #60: Satisfaction 1-5, Revenue $10-$10K, Age 18-65 → K-Means
- **Breaking points:**
  - CALC: DISASTER — revenue dominates distance (range 10000 vs range 4). Clusters based on revenue only
  - SILENT: No standardization warning

### #61: Likert 1-7, 5 items, same scale → K-Means
- **Breaking points:** None — correct use case

### #62: Binary 0/1, 8 items → K-Means
- **Breaking points:**
  - CALC: Suboptimal — Euclidean distance on binary. LCA more appropriate
  - VIZ: FIXABLE — suggest LCA alternative

### #63: 3 variables, N=8 → K-Means (K=3)
- **Breaking points:**
  - CALC: DISASTER — <3 observations per cluster. Completely unstable. No minimum N warning

### #64: Likert 1-7, 5 items → Hierarchical Clustering
- **Breaking points:**
  - CALC: Slow on large N (500+) in browser. No progress indicator

### #65: Likert 1-5, 5 items → LCA
- **Breaking points:**
  - CALC: DISASTER — same as IRT #56. All values become 1. Every respondent identical. Meaningless classes
  - SILENT: Output looks real

---

## CATEGORY 11: Paired T-test / Wilcoxon — Alignment

### #66: Before/After with headers in both → Paired T-test
- **Breaking points:**
  - ROW: OK if both headers detected. DISASTER if only one detected (shift by 1)

### #67: Before/After, blank row in middle of one column → Paired T-test
- **Breaking points:**
  - ROW: Risk — alignColumns preserves blank positions but count display may not match aligned output

### #68: 100 before, 100 after → Wilcoxon
- **Breaking points:** None — correct use case

### #69: Before/After with many tied differences → Wilcoxon
- **Breaking points:**
  - CALC: Risk — 80% tied differences excluded, effective N very small. Now has tie correction (fixed)

---

## CATEGORY 12: Chi-Square / Fisher's — Input Format

### #70: 2x2 table entered correctly → Chi-Square
- **Breaking points:** None — works correctly

### #71: Expected count < 5 in cells → Chi-Square
- **Breaking points:**
  - CALC: Risk — chi-square unreliable. Should suggest Fisher's exact

### #72: 2x2 table → Fisher's Exact
- **Breaking points:** None — correct use case

### #73: Large 5x5 table → Chi-Square
- **Breaking points:**
  - CALC: Risk — many cells with expected < 5. No auto-collapse suggestion

### #74: Continuous data → Chi-Square table input
- **Breaking points:**
  - BLOCK: Table input expects counts, prevents wrong entry

---

## CATEGORY 13: Point-Biserial

### #75: Binary + Continuous → Point-Biserial
- **Breaking points:** None — correct use case

### #76: Continuous + Continuous → Point-Biserial
- **Breaking points:**
  - CALC: Risk — may auto-recode continuous to binary (median split)

### #77: 3-category + continuous → Point-Biserial
- **Breaking points:**
  - CALC: DISASTER — requires exactly 2 groups. May pick first 2 and ignore 3rd, or crash

---

## CATEGORY 14: Two-Way ANOVA / ANCOVA

### #78: Outcome, Factor A, Factor B → Two-Way ANOVA
- **Breaking points:** None — correct use case

### #79: Columns swapped (factor in outcome box) → Two-Way ANOVA
- **Breaking points:**
  - CALC: DISASTER — if factors are numeric codes, runs ANOVA on codes as outcome. Looks valid, is nonsense

### #80: Categorical covariate (text) → ANCOVA
- **Breaking points:**
  - CALC: DISASTER — text covariate produces NaN in regression

### #81: 2×2 design, N=8 per cell → Two-Way ANOVA
- **Breaking points:**
  - CALC: Risk — interaction test has very low power with small cells

---

## CATEGORY 15: Mediation / Moderation

### #82: Categorical X codes + continuous M + continuous Y → Mediation
- **Breaking points:**
  - CALC: DISASTER — X treated as continuous. Treatment groups (1/2/3) assumed linear effect

### #83: All continuous → Mediation
- **Breaking points:** None — correct use case

### #84: Continuous X + continuous M + binary Y → Mediation
- **Breaking points:**
  - CALC: DISASTER — linear Y~X+M instead of logistic. Wrong SE and Sobel test

### #85: All continuous → Moderation
- **Breaking points:** None — correct use case

### #86: X and M are same variable pasted twice → Moderation
- **Breaking points:**
  - CALC: DISASTER — X*M = X² (perfect collinearity). Coefficients undefined

---

## CATEGORY 16: Diff-in-Diff

### #87: Outcome, Treatment (0/1), Time (0/1) → DiD
- **Breaking points:** None — correct use case

### #88: Outcome, Treatment (0/1), Time (continuous years) → DiD
- **Breaking points:**
  - CALC: DISASTER — interaction coefficient means "per year" not "before vs after." Different model than standard DiD

### #89: Text treatment labels ("Control"/"Treated") → DiD
- **Breaking points:**
  - CALC: NaN — text fails numeric parsing. Now validates and shows error (fixed)

---

## CATEGORY 17: Survival Analysis

### #90: Time, Event (0/1), Group → Survival
- **Breaking points:** None — correct use case

### #91: Negative time values → Survival
- **Breaking points:**
  - CALC: DISASTER — impossible survival times. KM produces nonsense

### #92: Event column with values 0/1/2 → Survival
- **Breaking points:**
  - CALC: DISASTER — competing risks (event=2) treated as event=1. Wrong censoring

---

## CATEGORY 18: Text Analysis

### #93: Numeric scores → Sentiment Analysis
- **Breaking points:**
  - CALC: Numbers have no sentiment. All scored neutral. Useless output

### #94: Open-ended text → Word Frequency
- **Breaking points:** None — correct use case

### #95: Mixed text + numeric → Sentiment
- **Breaking points:**
  - CALC: Aggregate sentiment diluted by neutral numeric rows

---

## CATEGORY 19: Weighting / Imputation

### #96: Extreme strata imbalance (99% in one) → Post-Stratification
- **Breaking points:**
  - CALC: DISASTER — weight of 50x for one respondent. Single person drives entire estimate

### #97: 50% missing values → Multiple Imputation
- **Breaking points:**
  - CALC: DISASTER — imputation model barely identified. Results driven by model assumptions, not data

---

## CATEGORY 20: Conjoint / MaxDiff / Discrete Choice

### #98: Standard survey data → Conjoint
- **Breaking points:**
  - CALC: DISASTER — no orthogonal design. Coefficients biased by confounding

### #99: Arbitrary counts → MaxDiff
- **Breaking points:**
  - CALC: SILENT wrong — utility scores meaningless without proper best-worst data

### #100: Standard survey data → Discrete Choice
- **Breaking points:**
  - CALC: DISASTER — no experimental validity

---

## CATEGORY 21: LCA Silent Binarization

### #101: Likert 1-5, 6 items → LCA
- **Breaking points:**
  - CALC: DISASTER — all values become 1. No zeros in 1-5 scale. Every respondent identical
  - SILENT: Output looks like real analysis

### #102: Binary (blank/value), 8 items → LCA
- **Breaking points:** None — correct use case

### #103: Binary 0-1, 5 items → LCA
- **Breaking points:** None — works correctly

---

## CATEGORY 22: Cross-method Data Paste Errors

### #104: Tab-separated multi-column → Summary Statistics (single column box)
- **Breaking points:**
  - CALC: DISASTER — if only 1-2 lines have tabs, tab detection fails. Parses partial values from multi-column data
  - BLOCK: Usually blocked (good) when >2 tab lines detected

### #105: Single column → Multi-Response box
- **Breaking points:**
  - BLOCK: isMultiResponse=false, button disabled. Correct but confusing

### #106: PDF copy-paste with invisible Unicode → Any numeric method
- **Breaking points:**
  - CALC: Risk — invisible characters cause NaN. Rows silently dropped

### #107: European decimals (comma: 3,5) → Any numeric method
- **Breaking points:**
  - CALC: DISASTER — parseFloat("3,5")=3. ALL decimals truncated to integers. Results look plausible
  - SILENT: No warning

### #108: Currency symbols ($450, €200) → Summary Statistics
- **Breaking points:**
  - BLOCK: parseFloat("$450")=NaN. All rows dropped. Shows 0 values. Clear but frustrating

### #109: Percentage values (45%) → Summary Statistics
- **Breaking points:** None — percent stripping works correctly (fixed)

---

## CATEGORY 23: Row Alignment / Header Edge Cases

### #110: Column A header "Score", Column B header "5" → Paired T-test
- **Breaking points:**
  - ROW: DISASTER — "Score" detected as header (text), "5" not (numeric). Column A skips row 1, B doesn't. ALL pairs shift by 1

### #111: Headers like "Q1" (non-numeric text) → Pearson
- **Breaking points:** None — both detected as headers, correctly skipped

### #112: Column A: 150 values, Column B: 148 values → T-test (independent)
- **Breaking points:**
  - ROW: Risk — alignColumns truncates to 148 pairs. 2 values from larger group silently dropped. For independent t-test, should keep all values

### #113: Column A: 150, Column B: 148 → Paired T-test
- **Breaking points:**
  - ROW: DISASTER — which 2 rows get dropped? Last 2 of column A? Or middle rows? User can't control pairing

---

## CATEGORY 24: Bayesian / A-B Test

### #114: Two groups continuous → Bayesian
- **Breaking points:** None — correct use case

### #115: Two groups identical means → Bayesian
- **Breaking points:** None — correctly shows evidence for null

### #116: Control: 1000, Variant: 5 → A/B Test
- **Breaking points:**
  - CALC: Risk — very wide CI for variant. No minimum sample warning

---

## CATEGORY 25: Propensity / Mixed Effects

### #117: Treatment, Outcome, Covariates → Propensity Score
- **Breaking points:**
  - CALC: Risk — JS implementation approximate. No match quality diagnostics

### #118: Outcome, Group, Predictor → Mixed Effects
- **Breaking points:**
  - CALC: Risk — simplified implementation. No convergence diagnostic

---

## CATEGORY 26: Frequencies Multi-Column Edge Cases

### #119: Tab-separated Matrix Grid → Frequencies
- **Breaking points:**
  - CALC: DISASTER — counts value occurrences across ALL items. "3" appeared 500 times across 4 columns, shown as 500/1000=50%. But no per-item breakdown
  - VIZ: Combined frequency instead of per-item frequency

### #120: NPS 0-10, 500 scores → Frequencies
- **Breaking points:**
  - VIZ: FIXABLE — shows generic top-2 box (9-10) / bottom-2 box (0-1). NPS convention is Promoter=9-10, Detractor=0-6. User may cite wrong NPS breakdown

---

## SUMMARY: DISASTER Scenarios by Breaking Point

### ROW MISALIGNMENT (11 scenarios)
#7, #11, #15, #18, #23, #25, #26, #66, #110, #112, #113

### WRONG CALCULATION (29 scenarios)
#1, #3, #4, #6, #14, #33, #38, #40, #41, #42, #44, #45, #46, #48, #52, #54, #56, #57, #60, #63, #65, #77, #79, #82, #84, #86, #88, #96, #101

### WRONG ROUTING (8 scenarios)
#1, #3, #4, #6, #17, #24, #28, #40

### SILENT WRONG (no warning) (12 scenarios)
#6, #14, #33, #38, #41, #42, #56, #65, #84, #101, #107, #119

### VISUALIZATION FIXABLE (toggle/option needed) (10 scenarios)
#10, #13, #19, #20, #32, #36, #50, #62, #120, and all grouped analyses (% vs mean toggle)

---

## PRIORITY ORDER FOR FIXING

### P0 — Fix immediately (DISASTER + common data type)
Row misalignment: #7, #11, #110 (header asymmetry)
Scale/checkbox misdetection: #1, #3, #4 (boundary cases)
Silent binarization: #56, #65, #101 (IRT/LCA on Likert)
European decimals: #107
Independent t-test truncation: #112

### P1 — Fix soon (DISASTER + less common)
Paired vs independent confusion: #17, #18, #24, #25, #26, #28
Nominal codes as continuous: #14, #33, #38, #48
Wrong regression type: #40, #41, #42
Overfit: #44, #52, #63

### P2 — Add warnings (prevent misuse)
Ranking treated as scale: #6, #54
Collinearity: #45, #86
Scale mixing in clustering: #60
Extreme weights: #96

### P3 — Add toggles/options (VIZ improvements)
NPS-specific output: #10, #120
% vs Mean toggle: all grouped analyses
Spearman option in correlation matrix: #36
Proportion display for binary: #20

---

## TESTING ARCHITECTURE — 5 Layers

The 3 disasters and how to catch them:

### The 3 Disasters
1. **I paste data → rows get mismatched** — due to app code structure, results are wrong
2. **Statistics does wrong analysis** — wrong function called, wrong formula applied
3. **Visual output has wrong data** — charts/tables show numbers that don't match computation

### How world-class engineers solve this: 5 test layers

```
Layer 1: PARSING TESTS (automated)
  What: raw pasted text → parsed arrays
  Checks: row count correct, column count correct, no position shifts,
          blanks preserved, headers detected, Excel errors filtered
  Functions tested: parseMultiResponse, parseCategorical, parseValues, alignColumns
  Catches: Disaster #1 (row mismatch)

Layer 2: ROUTING TESTS (automated)
  What: parsed data → which analysis function gets called
  Checks: matrix data → runScaleComparison (not runMultiResponse)
          checkbox data → runMultiResponse (not runScaleComparison)
          grouping present → grouped analysis (not dropped)
          independent groups → no alignColumns (not truncated)
          paired data → alignColumns (not independent parse)
  Functions tested: isScaleData detection, avgPerRow check, independent flag,
                    grpLines.length matching, fill rate threshold
  Catches: Disaster #2 (wrong analysis)

Layer 3: COMPUTATION TESTS (automated — already built, 1400+ checks)
  What: arrays → statistical results
  Checks: p-values in [0,1], effect sizes in range, means correct,
          known-answer datasets, mathematical identities (F=t² for k=2)
  Functions tested: all StatsEngine.* functions
  Catches: Disaster #2 (wrong calculation)

Layer 4: HANDOFF TESTS (automated — NEW)
  What: computation result → data passed to chart/table rendering
  Checks: if computation says mean=2.45, the object passed to
          drawBarChart contains 2.45 (not 167%, not NaN, not undefined)
          All percentages passed to charts are ≤ 100
          Group counts match respondent counts
          Number of bars matches number of groups/items
  Functions tested: the code between run*() result and drawBarChart/table HTML
  Catches: Disaster #3 (visual output wrong)

Layer 5: VISUAL REVIEW (human — the user)
  What: eyes on screen, domain expertise
  Checks: does the result MAKE SENSE for this survey question?
          Is "mean 2.45 on a 1-5 scale" reasonable for this data?
          Are the right segments showing?
          Is the chart type appropriate?
  Tool: test-scenarios.html — structured walkthrough of 120 scenarios
  Catches: everything automated tests can't — domain interpretation
```

### What each layer catches from the 120 scenarios

| Layer | Scenarios caught | Example |
|---|---|---|
| Layer 1 (Parsing) | #7, #11, #15, #23, #66, #67, #110, #112, #113 | Header in one column shifts all rows |
| Layer 2 (Routing) | #1, #3, #4, #6, #17, #24, #25, #28, #40, #56, #65, #101 | Matrix data sent to checkbox function |
| Layer 3 (Computation) | #30, #44, #45, #52, #63, #69, #107 | Overfit regression, European decimals |
| Layer 4 (Handoff) | #8, #14, #33, #38, #41, #42, #79, #119 | Chart receives >100%, wrong variable passed |
| Layer 5 (Visual/Human) | #10, #13, #19, #20, #36, #50, #120 + confirmation of all above | NPS needs Promoter/Detractor split, not generic top-box |

### Layers 1-4 are fully automatable
- Run with: `node test-scenarios.js`
- Each scenario has known input data and expected decision/output
- If any check fails, we know EXACTLY which scenario broke and at which layer

### Layer 5 requires the user
- Structured walkthrough page: test-scenarios.html
- One scenario at a time, pass/fail/skip buttons
- Progress saved to localStorage
- Only checks "does this make sense?" — not debugging code
- Results exportable for developer to act on
