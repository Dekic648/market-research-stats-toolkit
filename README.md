# Market Research Statistics Toolkit

**Free, open-source statistical analysis for market researchers. No login. No tracking. Just math.**

[**Try it live**](https://dekic648.github.io/market-research-stats-toolkit/) | [How It Works](https://dekic648.github.io/market-research-stats-toolkit/guide.html) | [UX Toolkit (sister project)](https://dekic648.github.io/ux-stats-toolkit/)

---

## What it does

Paste your survey data, answer a few plain questions, and get the right statistical analysis with results explained in language your stakeholders understand.

- **59 statistical methods** across 10 categories
- **Conversational guide** that picks the right method for you
- **Plain-English interpretation** with every result
- **Charts** for every analysis (canvas-based, no dependencies)
- **Copy-to-clipboard** results ready for your deck
- **Runs entirely in your browser** — your data never leaves your machine

## Methods

| Category | Count | Examples |
|---|---|---|
| Descriptive & Distributional | 4 | Summary stats, distributions, frequencies, multi-response |
| Group Comparison | 16 | t-test, ANOVA, Chi-Square, Mann-Whitney, Bayesian, A/B test |
| Correlation & Association | 8 | Pearson, Spearman, Kendall, partial, correlation matrix |
| Regression & Prediction | 9 | Linear, logistic, ordinal, Poisson, mediation, moderation, DiD |
| Scale & Construct Analysis | 5 | Cronbach's alpha, EFA, CFA, PCA, IRT Rasch |
| Segmentation & Classification | 5 | K-Means, hierarchical, LCA, decision trees, discriminant |
| Preference & Choice | 3 | Conjoint, MaxDiff, discrete choice modeling |
| Longitudinal & Repeated Measures | 3 | Repeated measures ANOVA, mixed-effects, survival analysis |
| Text & Open-Ended | 3 | Sentiment analysis, word frequency, inter-rater reliability |
| Survey Design & Weighting | 5 | Shapiro-Wilk, Levene's, post-stratification, imputation, propensity |

## How it works

1. **Describe your goal** — answer guided questions or type what you want to find out
2. **Paste your data** — copy columns from any spreadsheet
3. **Get results** — plain-English interpretation, statistics, and charts
4. **Validate** — built-in checklist helps you verify your analysis is sound
5. **Continue** — run additional analyses on the same data

## Tech stack

- Pure HTML/CSS/JS — no frameworks, no build step
- [jStat](https://github.com/jstat/jstat) for statistical distributions (CDFs)
- Custom stats engine (`stats-engine.js`, ~6,800 lines) ported from [SurveyLens](https://github.com/Dekic648/surveylens)
- Canvas-based charts (no charting library)
- Hosted on GitHub Pages

## Data limits

- Up to **3,000 rows** per column
- Up to **15-20 columns** for most methods
- All computation happens in your browser — no data is sent anywhere

## Testing

- `tests.html` — accuracy tests validated against Python scipy reference values
- `e2e-tests.html` — end-to-end smoke tests for all 59 methods
- Open either file in a browser to run the test suite

## Project structure

```
index.html          Landing page with searchable method directory
analyze.html        Conversational analysis tool (main app)
guide.html          "A Day in Sarah's Research" — narrative learning guide
stats-engine.js     Statistical computation engine (59 methods)
tests.html          Accuracy test suite (scipy reference values)
e2e-tests.html      End-to-end smoke tests
```

## Related

- [UX Research Statistics Toolkit](https://dekic648.github.io/ux-stats-toolkit/) — sister project for UX researchers

## Author

Built by [Milo Vandekic](https://github.com/Dekic648)
