/**
 * Heritage Lake Advisors — Market Timing Simulator
 * Simulation engine, constants, and utilities
 *
 * This file contains no React or JSX — it's pure JavaScript
 * that can be tested independently.
 */

// ─── Font Stacks ────────────────────────────────────────────
var FM = "'JetBrains Mono','Menlo',monospace";
var FA = "'Raleway','Helvetica Neue',sans-serif";
var FS = "'Libre Baskerville','Georgia',serif";

// ─── Theme Definitions ─────────────────────────────────────
// Logo paths (externalized from base64)
var LOGO_FULL = "images/logo-full.png";
var LOGO_INV  = "images/logo-inverse.png";

var THEMES = {
  dark: {
    bg:"#1a2f3d", bgCard:"#22394a", bgPanel:"#1e3344",
    border:"rgba(197,165,90,0.12)", borderSub:"rgba(242,239,230,0.07)",
    text:"#F2EFE6", textSec:"#9eb5c4", textMuted:"#6a8595",
    navy:"#3b5569", navyDark:"#2a3e4e",
    gold:"#c5a55a", goldBright:"#dbbe6e", goldDim:"#a08840",
    sage:"#7a9a7e", red:"#c46b5e", green:"#6ba389",
    slider:"linear-gradient(90deg,#2a3e4e,#3b5569)",
    recFill:"#c5a55a", recOp:0.12, axLine:"#1e3344",
    logo: LOGO_INV, thumbBg:"#F2EFE6"
  },
  light: {
    bg:"#F2EFE6", bgCard:"#ffffff", bgPanel:"#f5f2ea",
    border:"rgba(59,85,105,0.12)", borderSub:"rgba(59,85,105,0.08)",
    text:"#1c2d3a", textSec:"#3b5569", textMuted:"#6a8595",
    navy:"#3b5569", navyDark:"#d9d5cb",
    gold:"#a08840", goldBright:"#8a7435", goldDim:"#a08840",
    sage:"#5c7a60", red:"#b05545", green:"#4a8a6d",
    slider:"linear-gradient(90deg,#d9d5cb,#bfb9a8)",
    recFill:"#3b5569", recOp:0.10, axLine:"#e8e4da",
    logo: LOGO_FULL, thumbBg:"#fff"
  }
};

// ─── Constants ──────────────────────────────────────────────
var INI = 100000;
var SYS = [1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020];

// Recession year-months (NBER)
var REC_YM = [
  ["1980-01","1980-07"], ["1981-07","1982-11"],
  ["1990-07","1991-03"], ["2001-03","2001-11"],
  ["2007-12","2009-06"], ["2020-02","2020-04"]
];

// ─── Helpers ────────────────────────────────────────────────

/** Daily dividend rate from yearly yield */
function gdr(d) {
  return (DY[+d.slice(0,4)] || 1.5) / 100 / 252;
}

/** Format dollar amount */
function fmt(n) {
  return n >= 1e6
    ? "$" + (n/1e6).toFixed(2) + "M"
    : "$" + n.toLocaleString("en-US", {maximumFractionDigits:0});
}

/** Format as percentage */
function pct(n) {
  return (n * 100).toFixed(2) + "%";
}

/** Format date string for display */
function fmD(d) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {month:"short", year:"numeric"});
}

// ─── Data Processing ────────────────────────────────────────

/** Convert raw [YYYYMMDD, price] pairs into daily objects, filtered by start year */
function buildDaily(raw, sy) {
  return raw.filter(function(r) {
    var y = Math.floor(r[0] / 10000);
    return y >= sy;
  }).map(function(r) {
    var d = r[0], p = r[1];
    var y = Math.floor(d / 10000);
    var m = Math.floor((d % 10000) / 100);
    var dy = d % 100;
    return {
      date: y + "-" + String(m).padStart(2,"0") + "-" + String(dy).padStart(2,"0"),
      price: p
    };
  });
}

/** Sample one data point per month for charting */
function samMo(d) {
  var s = new Set();
  return d.filter(function(x) {
    var k = x.date.slice(0, 7);
    if (s.has(k)) return false;
    s.add(k);
    return true;
  });
}

/** Map recession year-month pairs to actual chart data dates */
function mapRecessions(chartData, startYear) {
  var datesByYM = {};
  chartData.forEach(function(d) {
    var ym = d.date.slice(0, 7);
    if (!datesByYM[ym]) datesByYM[ym] = d.date;
  });
  var result = [];
  REC_YM.forEach(function(pair) {
    var sYM = pair[0], eYM = pair[1];
    if (+sYM.slice(0,4) < startYear) return;
    var sDate = datesByYM[sYM];
    var eDate = null;
    chartData.forEach(function(d) {
      if (d.date.slice(0,7) === eYM) eDate = d.date;
    });
    if (sDate && eDate) result.push([sDate, eDate]);
  });
  return result;
}

// ─── Core Simulation ────────────────────────────────────────

/**
 * Run a market timing simulation on daily price data.
 *
 * @param {Array} daily - Array of {date, price} objects
 * @param {Object} o    - Options: sellPct, buyPct, minDays, cashRate,
 *                         stRate, ltRate, niit, reinvestDivs
 * @returns {Object}    - Full simulation results
 */
function simulate(daily, o) {
  var sellPct = o.sellPct, buyPct = o.buyPct, minDays = o.minDays;
  var cashRate = o.cashRate, stRate = o.stRate, ltRate = o.ltRate;
  var niit = o.niit, reinvestDivs = o.reinvestDivs;

  var eLt = ltRate + (niit ? 3.8 : 0);
  var st = daily[0].price;

  // Buy & Hold tracking
  var bS = INI / st, bB = INI;

  // Timing strategy state
  var iM = true;           // in market
  var sh = INI / st;       // shares held
  var ca = 0;              // cash amount
  var ath = st;            // all-time high
  var psL = Infinity;      // post-sale low
  var dS = 0;              // days since sell
  var bas = INI;           // cost basis
  var bD = daily[0].date;  // basis date
  var tP = 0;              // total tax paid
  var tDO = 0;             // total days out of market
  var oD = [];             // out-days per exit

  var ev = [];                      // buy/sell events
  var dR = new Array(daily.length); // daily results

  // Max drawdown tracking
  var bhPeak = INI, bhMaxDD = 0;
  var pPeak = INI, pMaxDD = 0;

  // Daily returns + in/out tracking for best days missed
  var dailyRets = [];

  for (var i = 0; i < daily.length; i++) {
    var date = daily[i].date, price = daily[i].price;
    var dr = reinvestDivs ? gdr(date) : 0;

    // Buy & Hold: reinvest dividends
    bS *= (1 + dr);
    var bV = bS * price;

    // Track daily return
    var ret = i > 0 ? (price / daily[i-1].price - 1) : 0;
    var wasIn = iM;

    if (iM) {
      // In market: reinvest dividends
      sh *= (1 + dr);
      ath = Math.max(ath, price);

      // Check sell trigger
      if (sellPct > 0 && (ath - price) / ath >= sellPct / 100 && i > 0) {
        var pr = sh * price;
        var g = pr - bas;
        var h = (new Date(date) - new Date(bD)) / 864e5;
        var t = 0;
        if (g > 0) t = g * ((h >= 365 ? eLt : stRate) / 100);
        ca = pr - t;
        tP += t;
        ev.push({type:"sell", date:date, val:Math.round(pr), tax:Math.round(t)});
        iM = false;
        sh = 0;
        dS = 0;
        psL = price;
      }
    } else {
      // Out of market: earn cash interest
      ca *= (1 + cashRate / 100 / 252);
      dS++;
      tDO++;
      psL = Math.min(psL, price);

      // Check buy trigger
      if (buyPct > 0 && dS >= minDays && psL < Infinity && (price - psL) / psL >= buyPct / 100) {
        sh = ca / price;
        bas = ca;
        bD = date;
        ev.push({type:"buy", date:date, val:Math.round(ca)});
        ca = 0;
        iM = true;
        ath = price;
        oD.push(dS);
        dS = 0;
        psL = Infinity;
      }
    }

    var pV = iM ? sh * price : ca;
    dR[i] = {date:date, price:price, bh:Math.round(bV), portfolio:Math.round(pV)};

    // Max drawdown
    bhPeak = Math.max(bhPeak, bV);
    bhMaxDD = Math.max(bhMaxDD, (bhPeak - bV) / bhPeak);
    pPeak = Math.max(pPeak, pV);
    pMaxDD = Math.max(pMaxDD, (pPeak - pV) / pPeak);

    if (i > 0) dailyRets.push({idx:i, date:date, ret:ret, wasIn:wasIn});
  }

  // Best days missed analysis
  var sortedRets = dailyRets.slice().sort(function(a,b) { return b.ret - a.ret; });
  var top10 = sortedRets.slice(0,10);
  var top20 = sortedRets.slice(0,20);
  var top30 = sortedRets.slice(0,30);
  var missed10 = top10.filter(function(d) { return !d.wasIn; }).length;
  var missed20 = top20.filter(function(d) { return !d.wasIn; }).length;
  var missed30 = top30.filter(function(d) { return !d.wasIn; }).length;
  var missedList = top20.filter(function(d) { return !d.wasIn; }).map(function(d) {
    return {date:d.date, ret:d.ret};
  });

  // Worst days analysis
  var sortedWorst = dailyRets.slice().sort(function(a,b) { return a.ret - b.ret; });
  var worst20 = sortedWorst.slice(0,20);
  var avoided20 = worst20.filter(function(d) { return !d.wasIn; }).length;

  // Final values
  if (!iM && dS > 0) oD.push(dS);
  var fV = iM ? sh * daily[daily.length-1].price : ca;
  var bF = bS * daily[daily.length-1].price;
  var bT = Math.max(0, bF - bB) * (eLt / 100);
  var pUG = iM ? Math.max(0, fV - bas) : 0;
  var pH = iM ? (new Date(daily[daily.length-1].date) - new Date(bD)) / 864e5 : 0;
  var pUT = pUG > 0 ? pUG * ((pH >= 365 ? eLt : stRate) / 100) : 0;

  return {
    dayResults: dR,
    events: ev,
    taxPaid: tP,
    basis: Math.round(iM ? bas : 0),
    unrealized: Math.round(iM ? fV - bas : 0),
    bhPostTax: Math.round(bF - bT),
    bhTax: Math.round(bT),
    pPostTax: Math.round(fV - pUT),
    pTax: Math.round(tP + pUT),
    pUnrealizedTax: Math.round(pUT),
    totalDaysOut: tDO,
    avgDaysOut: oD.length > 0 ? Math.round(oD.reduce(function(a,b){return a+b;}, 0) / oD.length) : 0,
    bhMaxDD: bhMaxDD,
    pMaxDD: pMaxDD,
    missed10: missed10,
    missed20: missed20,
    missed30: missed30,
    missedList: missedList,
    avoided20: avoided20
  };
}

// ─── Rolling Window Analysis ────────────────────────────────

/**
 * Run simulation across every possible N-year window, stepping by ~1 month.
 *
 * @param {Array}  allDaily - Full daily data from 1975
 * @param {Object} opts     - Simulation options
 * @param {number} winYrs   - Window size in years
 * @returns {Object|null}   - Rolling analysis results or null if insufficient data
 */
function rollingAnalysis(allDaily, opts, winYrs) {
  var winDays = Math.round(winYrs * 252);
  if (allDaily.length < winDays + 10) return null;

  var timingWins = 0, total = 0, bestTiming = -Infinity, worstTiming = Infinity, bhWins = 0;
  var results = [];
  var step = 21; // ~1 month in trading days

  for (var s = 0; s <= allDaily.length - winDays; s += step) {
    var slice = allDaily.slice(s, s + winDays);
    var r = simulate(slice, opts);
    var last = r.dayResults[r.dayResults.length - 1];
    var bhEnd = last.bh, pEnd = last.portfolio;
    var bhR = Math.pow(bhEnd / INI, 1 / winYrs) - 1;
    var pR = Math.pow(pEnd / INI, 1 / winYrs) - 1;
    var diff = pR - bhR;
    if (diff > 0) timingWins++; else bhWins++;
    total++;
    bestTiming = Math.max(bestTiming, diff);
    worstTiming = Math.min(worstTiming, diff);
    results.push({startDate:slice[0].date, bhCagr:bhR, pCagr:pR, diff:diff});
  }

  return {
    total: total,
    timingWins: timingWins,
    bhWins: bhWins,
    winRate: (timingWins / total * 100),
    bestTiming: bestTiming,
    worstTiming: worstTiming,
    results: results
  };
}
