#!/usr/bin/env node
'use strict';

// === SETUP: Load stats engine in Node ===
// Shim window/jStat so stats-engine.js can load
var jStat = require('jstat');
global.window = global;
global.jStat = jStat;

// Load stats engine
require('./stats-engine.js');
var SE = global.StatsEngine;

// === TEST FRAMEWORK ===
var passed = 0, failed = 0, errors = 0;
var failures = [];

function approxEqual(a, b, tol) {
  if (tol === undefined) tol = 0.01;
  if (typeof a !== 'number' || typeof b !== 'number') return false;
  if (isNaN(a) && isNaN(b)) return true;
  if (!isFinite(a) || !isFinite(b)) return a === b;
  return Math.abs(a - b) < tol;
}

function assert(name, actual, expected, tol) {
  if (approxEqual(actual, expected, tol)) {
    passed++;
  } else {
    failed++;
    failures.push({ name: name, expected: expected, actual: actual });
  }
}

function assertBool(name, actual, expected) {
  if (actual === expected) { passed++; }
  else { failed++; failures.push({ name: name, expected: expected, actual: actual }); }
}

function section(title) {
  console.log('\n=== ' + title + ' ===');
}

// === REFERENCE DATASETS ===
// All expected values verified against textbook formulas

// Dataset A: Two groups for t-test, Mann-Whitney
var groupA = [4, 5, 6, 5, 4, 3, 5, 6, 4, 5, 7, 3, 4, 5, 6];
var groupB = [6, 7, 8, 7, 6, 5, 7, 8, 6, 7, 9, 5, 6, 7, 8];
// groupA: mean=4.8, sd~=1.082
// groupB: mean=6.8, sd~=1.082
// Welch t = (4.8-6.8) / sqrt(1.082^2/15 + 1.082^2/15) = -2.0/0.395 = -5.06
// df ~ 28 (equal variances), Cohen's d ~ 1.85

// Dataset B: Paired data
var before = [45, 52, 48, 55, 43, 50, 47, 53, 46, 51];
var after =  [50, 55, 52, 58, 48, 54, 51, 57, 50, 55];
// Differences (before - after): [-5, -3, -4, -3, -5, -4, -4, -4, -4, -4]
// Mean diff = -4.0, SD diff = 0.667, SE = 0.211
// t = -4.0/0.211 = -18.97, df = 9

// Dataset C: Three groups for ANOVA
var g1 = [3, 4, 5, 4, 3, 4, 5, 3, 4, 5];  // mean=4.0
var g2 = [5, 6, 7, 6, 5, 6, 7, 5, 6, 7];  // mean=6.0
var g3 = [7, 8, 9, 8, 7, 8, 9, 7, 8, 9];  // mean=8.0
// Grand mean = 6.0, SS_between = 10*(4-6)^2 + 10*(6-6)^2 + 10*(8-6)^2 = 80
// Large F expected

// Dataset D: Correlation
var xVals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
var yVals = [2.1, 4.0, 5.9, 8.1, 10.0, 11.9, 14.1, 16.0, 17.9, 20.1];
// Near-perfect positive correlation, r ~ 0.999+

// Dataset E: Likert scale data (lots of ties) for non-parametric tests
var likertA = [3, 3, 4, 4, 4, 5, 5, 3, 4, 3, 2, 4, 5, 3, 4];
var likertB = [4, 5, 5, 5, 4, 5, 5, 4, 5, 4, 3, 5, 5, 4, 5];

// Dataset F: Binary data for chi-square, Fisher
// 2x2 table: [[20, 30], [40, 10]]
// Chi-sq = N*(ad-bc)^2 / (R1*R2*C1*C2) = 100*(200-1200)^2 / (50*50*60*40)

// Dataset G: Scale items for Cronbach's alpha
var item1 = [4, 5, 3, 4, 5, 4, 3, 5, 4, 5, 3, 4, 5, 4, 3];
var item2 = [3, 4, 3, 4, 5, 3, 3, 4, 4, 5, 3, 4, 4, 3, 3];
var item3 = [4, 5, 4, 5, 5, 4, 3, 5, 4, 5, 3, 5, 5, 4, 3];
var item4 = [3, 4, 2, 3, 4, 3, 2, 4, 3, 4, 2, 3, 4, 3, 2];

// Dataset H: Regression
var regX = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
var regY = regX.map(function(x) { return 2 * x + 3 + (x % 3 - 1) * 0.5; }); // y ~ 2x + 3 with small noise

// Dataset I: Ordinal/ranked data with many ties
var ordinalA = [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5];
var ordinalB = [2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 5, 5];

// === TESTS ===

// ---- Helpers ----
section('Helpers');
assert('mean([1,2,3,4,5])', SE._helpers.mean([1,2,3,4,5]), 3.0);
assert('median([1,2,3,4,5])', SE._helpers.median([1,2,3,4,5]), 3.0);
assert('median([1,2,3,4])', SE._helpers.median([1,2,3,4]), 2.5);
assert('variance([2,4,4,4,5,5,7,9], ddof=1)', SE._helpers.variance([2,4,4,4,5,5,7,9], 1), 4.571, 0.01);
assert('sd([2,4,4,4,5,5,7,9], ddof=1)', SE._helpers.sd([2,4,4,4,5,5,7,9], 1), 2.138, 0.01);

// ---- T-test (Welch) ----
section('Independent t-test');
var tt = SE.ttest(groupA, groupB);
assert('t-test: t-statistic', Math.abs(tt.t), 4.78, 0.15);
assertBool('t-test: p < 0.001', tt.p < 0.001, true);
assert('t-test: Cohen d', Math.abs(tt.cohensD), 1.74, 0.15);
assert('t-test: mean A', tt.meanA, 4.8, 0.01);
assert('t-test: mean B', tt.meanB, 6.8, 0.01);
assertBool('t-test: significant', tt.p < 0.05, true);

// ---- Paired t-test ----
section('Paired t-test');
var pt = SE.pairedTTest(before, after);
// pairedTTest computes a[i] - b[i] = before[i] - after[i], so meanDiff = -4.0
assert('paired t: mean diff', pt.meanDiff, -4.0, 0.01);
assertBool('paired t: p < 0.001', pt.p < 0.001, true);
assertBool('paired t: significant', pt.p < 0.05, true);
assert('paired t: n', pt.n, 10);

// ---- One-way ANOVA ----
section('One-way ANOVA');
var av = SE.anova([g1, g2, g3]);
assertBool('ANOVA: significant', av.p < 0.001, true);
assert('ANOVA: df between', av.dfBetween, 2);
assert('ANOVA: df within', av.dfWithin, 27);
// eta-squared should be large (groups very different)
assertBool('ANOVA: eta-sq > 0.7', av.etaSquared > 0.7, true);

// ---- Welch ANOVA ----
section('Welch ANOVA');
var wa = SE.welchAnova([g1, g2, g3]);
assertBool('Welch ANOVA: significant', wa.p < 0.001, true);

// ---- Mann-Whitney U ----
section('Mann-Whitney U');
var mw = SE.mannWhitney(groupA, groupB);
assertBool('Mann-Whitney: significant', mw.p < 0.05, true);
assert('Mann-Whitney: nA', mw.nA, 15);
assert('Mann-Whitney: nB', mw.nB, 15);

// Test with tied data (Likert)
var mwTied = SE.mannWhitney(likertA, likertB);
assertBool('Mann-Whitney (tied): has p-value', typeof mwTied.p === 'number' && !isNaN(mwTied.p), true);
assertBool('Mann-Whitney (tied): p is between 0 and 1', mwTied.p >= 0 && mwTied.p <= 1, true);

// ---- Wilcoxon Signed-Rank ----
section('Wilcoxon Signed-Rank');
var wc = SE.wilcoxon(before, after);
assertBool('Wilcoxon: significant', wc.p < 0.05, true);

// ---- Kruskal-Wallis ----
section('Kruskal-Wallis');
var kw = SE.kruskalWallis([g1, g2, g3]);
assertBool('Kruskal-Wallis: significant', kw.p < 0.05, true);
assert('Kruskal-Wallis: df', kw.df, 2);

// Test with tied data
var kwTied = SE.kruskalWallis([likertA, likertB, ordinalA]);
assertBool('Kruskal-Wallis (tied): valid p', typeof kwTied.p === 'number' && !isNaN(kwTied.p), true);

// ---- Friedman Test ----
section('Friedman Test');
// Each array is a condition, all same subjects
var fr = SE.friedman([g1, g2, g3]);
assertBool('Friedman: significant', fr.p < 0.05, true);

// ---- Repeated Measures ANOVA ----
section('Repeated Measures ANOVA');
var rm = SE.repeatedMeasuresAnova([g1, g2, g3]);
assertBool('RM ANOVA: significant', rm.p < 0.05, true);
// Check that eta-squared is partial (should be larger than total)
assertBool('RM ANOVA: partial eta-sq > 0.5', rm.etaSquared > 0.5, true);

// ---- Two-Way ANOVA ----
section('Two-Way ANOVA');
var outcome2 = [3,4,5,6, 5,6,7,8, 4,5,6,7, 6,7,8,9];
var factor1 = [0,0,0,0, 0,0,0,0, 1,1,1,1, 1,1,1,1];
var factor2 = [0,0,1,1, 0,0,1,1, 0,0,1,1, 0,0,1,1];
var tw = SE.twoWayAnova(outcome2, factor1, factor2);
assertBool('Two-Way: has mainA p', typeof tw.mainA.p === 'number', true);
assertBool('Two-Way: has mainB p', typeof tw.mainB.p === 'number', true);
assertBool('Two-Way: has interaction p', typeof tw.interaction.p === 'number', true);

// ---- Pearson Correlation ----
section('Pearson Correlation');
var pc = SE.pearson(xVals, yVals);
assert('Pearson: r near 1', pc.r, 1.0, 0.005);
assertBool('Pearson: significant', pc.p < 0.001, true);
assert('Pearson: n', pc.n, 10);

// Test zero correlation
var randX = [1,2,3,4,5,6,7,8,9,10];
var randY = [5,3,8,2,9,1,7,4,6,10]; // shuffled
var pcRand = SE.pearson(randX, randY);
assertBool('Pearson (random): |r| < 0.5', Math.abs(pcRand.r) < 0.5, true);

// Pearson CI with small n (edge case)
var pcSmall = SE.pearson([1,2,3], [2,4,6]);
assertBool('Pearson n=3: CI exists', pcSmall.ci95 !== undefined, true);

// ---- Spearman Correlation ----
section('Spearman Correlation');
var sp = SE.spearman(xVals, yVals);
assert('Spearman: rho near 1', sp.rho, 1.0, 0.01);
assertBool('Spearman: significant', sp.p < 0.05, true);

// ---- Kendall's Tau ----
section("Kendall's Tau");
var kt = SE.kendallTau(xVals, yVals);
assert("Kendall: tau near 1", kt.tau, 1.0, 0.01);
assertBool("Kendall: significant", kt.p < 0.05, true);

// Test with heavily tied data
var ktTied = SE.kendallTau(ordinalA, ordinalB);
assertBool("Kendall (tied): valid p", typeof ktTied.p === 'number' && !isNaN(ktTied.p), true);
assertBool("Kendall (tied): p between 0 and 1", ktTied.p >= 0 && ktTied.p <= 1, true);

// ---- Chi-Square ----
section('Chi-Square');
var cs = SE.chiSquare([[20, 30], [40, 10]]);
assertBool('Chi-Square: significant', cs.p < 0.05, true);
assert('Chi-Square: df', cs.df, 1);
assertBool("Chi-Square: Cramer's V > 0", cs.cramersV > 0, true);
// Expected chi-sq = 100*(200-1200)^2 / (50*50*60*40) = 100*1000000 / 6000000 = 16.67
assert('Chi-Square: chi-sq value', cs.chiSquare, 16.67, 0.5);

// ---- Fisher's Exact ----
section("Fisher's Exact");
// Small table — fisherExact(a, b, c, d) takes 4 numbers
var fe = SE.fisherExact(5, 1, 1, 5);
assertBool("Fisher: valid p", typeof fe.p === 'number' && !isNaN(fe.p), true);
assertBool("Fisher: p between 0 and 1", fe.p >= 0 && fe.p <= 1, true);

// Large table (overflow test - N > 170)
var feLarge = SE.fisherExact(80, 20, 30, 70);
assertBool("Fisher (N=200): valid p", typeof feLarge.p === 'number' && !isNaN(feLarge.p), true);
assertBool("Fisher (N=200): p between 0 and 1", feLarge.p >= 0 && feLarge.p <= 1, true);
assertBool("Fisher (N=200): significant", feLarge.p < 0.05, true);

// Very large table
var feHuge = SE.fisherExact(150, 50, 60, 140);
assertBool("Fisher (N=400): valid p (no overflow)", typeof feHuge.p === 'number' && !isNaN(feHuge.p), true);

// ---- Simple Linear Regression ----
section('Simple Linear Regression');
var sr = SE.linearRegression(regY, [regX]);
assertBool('Simple reg: R-squared > 0.99', sr.R2 > 0.99, true);
assert('Simple reg: slope near 2', sr.coefficients[1], 2.0, 0.1);
assert('Simple reg: intercept near 3', sr.coefficients[0], 3.0, 0.5);
assertBool('Simple reg: significant', sr.fP < 0.05, true);

// ---- Multiple Linear Regression ----
section('Multiple Linear Regression');
var x1 = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
var x2 = [2,4,1,3,5,2,4,1,3,5,2,4,1,3,5];
var yMult = x1.map(function(v, i) { return 3 * v + 2 * x2[i] + 5; });
var mr = SE.linearRegression(yMult, [x1, x2]);
assert('Multiple reg: R-squared = 1', mr.R2, 1.0, 0.01);
assert('Multiple reg: coeff x1 near 3', mr.coefficients[1], 3.0, 0.1);
assert('Multiple reg: coeff x2 near 2', mr.coefficients[2], 2.0, 0.1);

// ---- Logistic Regression ----
section('Logistic Regression');
var logX = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
var logY = [0,0,0,0,0,0,0,0,1,0,1,1,1,1,1,1,1,1,1,1];
var lr = SE.logisticRegression(logY, [logX]);
assertBool('Logistic: converged', lr.converged !== false, true);
assertBool('Logistic: positive slope', lr.coefficients[1] > 0, true);
assertBool('Logistic: OR > 1', lr.oddsRatios && lr.oddsRatios[1] > 1, true);

// ---- Cronbach's Alpha ----
section("Cronbach's Alpha");
var ca = SE.cronbachAlpha([item1, item2, item3, item4]);
assertBool("Cronbach: alpha between 0 and 1", ca.alpha >= 0 && ca.alpha <= 1, true);
assertBool("Cronbach: alpha > 0.5", ca.alpha > 0.5, true); // moderate reliability
assert("Cronbach: k (nItems)", ca.k, 4);
assertBool("Cronbach: has alphaIfDeleted", Array.isArray(ca.alphaIfDeleted), true);
assert("Cronbach: alphaIfDeleted length", ca.alphaIfDeleted.length, 4);

// ---- PCA ----
section('PCA');
var pca = SE.pca([item1, item2, item3, item4]);
assertBool('PCA: has eigenvalues', Array.isArray(pca.eigenvalues), true);
assertBool('PCA: eigenvalues sum to nItems',
  Math.abs(pca.eigenvalues.reduce(function(a,b){return a+b;}, 0) - 4) < 0.1, true);
assertBool('PCA: first eigenvalue largest', pca.eigenvalues[0] >= pca.eigenvalues[1], true);

// ---- Factor Analysis ----
section('Factor Analysis');
var fa = SE.factorAnalysis([item1, item2, item3, item4], { nFactors: 1 });
assertBool('FA: has loadings', fa.loadings !== undefined, true);
assertBool('FA: has variance explained', fa.explainedVariance !== undefined, true);

// ---- K-Means ----
section('K-Means');
// Two clearly separated clusters
var kmX = [1,2,1,2,1, 10,11,10,11,10];
var kmY = [1,1,2,2,1, 10,10,11,11,10];
var km = SE.kMeans([kmX, kmY], 2);
assertBool('K-Means: 2 clusters', km.k === 2, true);
assert('K-Means: n', km.n, 10);
assertBool('K-Means: has assignments', Array.isArray(km.assignments), true);
// Points 0-4 should be in one cluster, 5-9 in another
var cluster0 = km.assignments[0];
var allFirstSame = km.assignments.slice(0, 5).every(function(a) { return a === cluster0; });
var allSecondSame = km.assignments.slice(5).every(function(a) { return a === km.assignments[5]; });
assertBool('K-Means: first 5 same cluster', allFirstSame, true);
assertBool('K-Means: last 5 same cluster', allSecondSame, true);
assertBool('K-Means: two different clusters', km.assignments[0] !== km.assignments[5], true);

// ---- Shapiro-Wilk ----
section('Shapiro-Wilk');
// Normal-ish data should pass
var normalData = [2.3, 3.1, 2.8, 3.5, 2.9, 3.2, 2.7, 3.0, 3.3, 2.6, 3.1, 2.8, 3.4, 2.9, 3.0, 2.8, 3.2, 2.7, 3.1, 2.9];
var sw = SE.shapiroWilk(normalData);
assertBool('Shapiro-Wilk: W between 0 and 1', sw.W >= 0 && sw.W <= 1, true);
assertBool('Shapiro-Wilk: normal data p > 0.05', sw.p > 0.05, true);

// Clearly non-normal data (bimodal)
var bimodal = [1,1,1,1,1,1,1,1,1,1, 10,10,10,10,10,10,10,10,10,10];
var swBi = SE.shapiroWilk(bimodal);
assertBool('Shapiro-Wilk: bimodal p < 0.05', swBi.p < 0.05, true);

// ---- Levene's Test ----
section("Levene's Test");
// Equal variances
var lev = SE.levene([g1, g2, g3]);
assertBool("Levene: equal var groups p > 0.05", lev.p > 0.05, true);

// Unequal variances
var highVar = [1, 10, 2, 9, 3, 8, 4, 7, 5, 6];
var lowVar = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
var levUneq = SE.levene([highVar, lowVar]);
assertBool("Levene: unequal var p < 0.05", levUneq.p < 0.05, true);

// ---- Point-Biserial ----
section('Point-Biserial');
var binary = [0,0,0,0,0,0,0, 1,1,1,1,1,1,1];
var contin = [3,4,3,2,4,3,3, 7,8,7,6,8,7,7];
var pb = SE.pointBiserial(binary, contin);
assertBool('Point-Biserial: r > 0.8', Math.abs(pb.r) > 0.8, true);
assertBool('Point-Biserial: significant', pb.p < 0.05, true);

// ---- Edge Cases ----
section('Edge Cases');

// n=1
var tt1 = SE.ttest([5], [3]);
assertBool('t-test n=1: returns result', tt1 !== undefined, true);

// Zero variance
var ttZero = SE.ttest([5,5,5,5,5], [3,3,3,3,3]);
assertBool('t-test zero var: has p', typeof ttZero.p === 'number', true);

// All same values
var mwSame = SE.mannWhitney([3,3,3,3,3], [3,3,3,3,3]);
assertBool('Mann-Whitney all same: p = 1 or valid', typeof mwSame.p === 'number', true);

// Empty arrays (should not crash)
try {
  SE.ttest([], [1,2,3]);
  assertBool('t-test empty A: no crash', true, true);
} catch(e) {
  assertBool('t-test empty A: no crash', false, true);
}

try {
  SE.pearson([], []);
  assertBool('Pearson empty: no crash', true, true);
} catch(e) {
  assertBool('Pearson empty: no crash', false, true);
}

// Very large N for Fisher's (overflow test)
try {
  var feMassive = SE.fisherExact(500, 200, 300, 600);
  assertBool("Fisher N=1600: no overflow", typeof feMassive.p === 'number' && !isNaN(feMassive.p), true);
} catch(e) {
  assertBool("Fisher N=1600: no crash", false, true);
}

// n=2 for Pearson (should work, r = +/-1)
var pc2 = SE.pearson([1, 2], [3, 5]);
assert('Pearson n=2: r = 1', pc2.r, 1.0, 0.001);

// ---- Hierarchical Clustering ----
section('Hierarchical Clustering');
var hc = SE.hierarchicalClustering([kmX, kmY], 'average');
assertBool('Hierarchical: has labels', hc.labels !== undefined, true);
assert('Hierarchical: n', hc.n, 10);
// Use cutTree to get assignments for k=2
var hcAssignments = hc.cutTree(2);
assertBool('Hierarchical: cutTree returns array', Array.isArray(hcAssignments), true);
assert('Hierarchical: cutTree length', hcAssignments.length, 10);

// ---- Latent Class Analysis ----
section('Latent Class Analysis');
var lcaBin1 = [1,1,1,1,1,0,0,0,0,0];
var lcaBin2 = [1,1,1,1,0,0,0,0,0,0];
var lcaBin3 = [0,0,0,0,0,1,1,1,1,1];
var lca = SE.latentClassAnalysis([lcaBin1, lcaBin2, lcaBin3], 2);
assertBool('LCA: has classes', lca.nClasses === 2, true);
assertBool('LCA: has assignments', Array.isArray(lca.assignments), true);

// ---- DiffInDiff ----
section('Difference-in-Differences');
var didY = [10,11,12, 10,11,12, 15,16,17, 20,21,22]; // control pre, control post, treat pre, treat post
var didT = [0,0,0, 0,0,0, 1,1,1, 1,1,1];
var didP = [0,0,0, 1,1,1, 0,0,0, 1,1,1];
var did = SE.diffInDiff(didY, didT, didP);
assertBool('DiD: has estimate', typeof did.didEstimate === 'number', true);
assert('DiD: N', did.N, 12);

// === REPORT ===
console.log('\n' + '='.repeat(50));
console.log('RESULTS: ' + passed + ' passed, ' + failed + ' failed');
if (failures.length > 0) {
  console.log('\nFAILURES:');
  failures.forEach(function(f) {
    console.log('  FAIL ' + f.name + ': expected ' + f.expected + ', got ' + f.actual);
  });
}
console.log('='.repeat(50));
process.exit(failed > 0 ? 1 : 0);
