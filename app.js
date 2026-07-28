(function () {
  "use strict";
  var h = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useMemo = React.useMemo;
  var useRef = React.useRef;

  /* =========================================================================
     ثابت‌ها و گزینه‌های کشویی -- دقیقا برگرفته از فایل ژورنال مرجع اکسل
     ========================================================================= */
  var DEFAULT_OPTIONS = {
    testType: ["لایو", "بکتست، دمو", "پراپ"],
    propStage: ["1", "2", "لایو"],
    underTestId: ["1", "2", "3", "4", "5", "6"],
    system: ["سیستم بهمن اصلی", "سیستم بهمن اسکلپ", "سیستم کاربردی فقط ستاپ", "اضافه"],
    symbol: ["EU", "GU", "GJ", "UCHF", "AU"],
    direction: ["🟢 Buy", "🔴 Sell", "🟢 Buy Limit", "🔴 Sell Limit", "🟢 Buy Stop", "🔴 Sell Stop"],
    style: ["دی‌ترید", "سوئینگ", "اسکلپ"],
    exitReason: ["SL", "TP", "Trail", "ریسک فری", "دستی", "PE"],
    yesNo: ["بله", "خیر"],
    moneyManagement: ["ثابت", "آنتی مارتینگل"],
    entryReason: ["XIL", "S", "T", "CTC", "ترکیبی"],
    xilType: ["IL", "SP"],
    combinedType: ["1", "2", "3", "4"],
    mainTF: ["W1", "D1", "H4", "H1", "M15", "M5"],
    confirmTF: ["H4", "H1", "M15", "M5"],
    entryTF: ["H4", "H1", "M15", "M5", "M1"],
    atr: ["ATR تایم ورود 2 برابر", "ATR تایم تاییدیه 1 برابر"],
    divergenceIndicator: ["RSI", "TDI"],
    entryCandle: ["کندل ورود", "معمولی"],
    setupModel: ["MSU برعکس", "MSU منفی", "MSU X", "MSU S", "MSU پلاس", "MSU تجمیع", "MSU SUB"],
    elderTest: ["7-8", "5-6", "0-4"],
    setupQuality: ["5 - عالی", "4 - خوب", "3 - متوسط", "2 - بد", "1 - خیلی بد"],
    result: ["سود", "ضرر", "ریسک فری", "عدم ترید", "PE", "تریل SL در سود"],
    resultDisplayType: ["RR", "دلاری", "درصد", "پیپ"],
    trendState: ["روندار - صعودی", "روندار - نزولی", "رنج", "متلاطم - غیرقابل تشخیص"],
    readiness: ["هیچی", "ورزش", "خواب", "حوصله", "آمادگی کلی"],
    mistake: ["ورود زودهنگام", "عدم رعایت حد ضرر", "ورود بدون تأییدیه", "خروج زودهنگام", "بی‌نظمی در حجم", "بدون اشتباه", "سایر"],
  };

  var SYMBOL_CFG = {
    EU: { name: "EURUSD", pip: 0.0001, pipValue: 10 },
    GU: { name: "GBPUSD", pip: 0.0001, pipValue: 10 },
    GJ: { name: "GBPJPY", pip: 0.01, pipValue: 6.7 },
    UCHF: { name: "USDCHF", pip: 0.0001, pipValue: 10 },
    AU: { name: "AUDUSD", pip: 0.0001, pipValue: 10 },
  };

  var RESULT_COLOR = {
    "سود": "#2FBF8F", "ضرر": "#E5575C", "ریسک فری": "#D4A24C",
    "عدم ترید": "#4E5866", "PE": "#5B9BD5", "تریل SL در سود": "#9B7FD4",
  };

  var C = {
    amber: "#D4A24C", teal: "#2FBF8F", coral: "#E5575C", blue: "#5B9BD5", purple: "#9B7FD4",
  };

  /* =========================================================================
     توابع کمکی محاسباتی -- منطبق بر فرمول‌های شیت «ژورنال» فایل اکسل
     ========================================================================= */
  function pad2(n) { return String(n).padStart(2, "0"); }
  function isBuy(dir) { return /Buy/.test(dir || ""); }
  function isSell(dir) { return /Sell/.test(dir || ""); }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }

  function dayFromDate(dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return "";
    var wd = d.getDay();
    var map = { 1: "دوشنبه", 2: "سه‌شنبه", 3: "چهارشنبه", 4: "پنج‌شنبه", 5: "جمعه" };
    return map[wd] || "آخر هفته";
  }

  function timeToMinutes(t) {
    if (!t) return null;
    var parts = t.split(":");
    if (parts.length < 2) return null;
    var hh = parseInt(parts[0], 10), mm = parseInt(parts[1], 10);
    if (isNaN(hh) || isNaN(mm)) return null;
    return hh * 60 + mm;
  }

  function sessionFromTime(t) {
    var m = timeToMinutes(t);
    if (m == null) return "";
    if (m >= 630 && m <= 750) return "اورلپ آسیا-لندن";
    if (m >= 751 && m <= 929) return "لندن";
    if (m >= 930 && m <= 1170) return "اورلپ لندن-نیویورک";
    return "خارج از تایم";
  }

  function isMyTimeCalc(t) {
    var m = timeToMinutes(t);
    if (m == null) return "";
    return (m >= 630 && m <= 1170) ? "بله" : "خیر";
  }

  function computeDuration(openTime, closeTime) {
    var o = timeToMinutes(openTime), c = timeToMinutes(closeTime);
    if (o == null || c == null) return "";
    var diff = c - o;
    if (diff < 0) diff += 24 * 60;
    return pad2(Math.floor(diff / 60)) + ":" + pad2(diff % 60);
  }

  function durationToMinutes(d) {
    if (!d) return null;
    var p = d.split(":");
    if (p.length < 2) return null;
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  function defaultExitReason(result) {
    var map = { "ضرر": "SL", "سود": "TP", "ریسک فری": "ریسک فری", "PE": "PE", "تریل SL در سود": "Trail", "عدم ترید": "" };
    return map.hasOwnProperty(result) ? map[result] : "دستی";
  }

  function computeExitPrice(t) {
    if (t.result === "ضرر") return num(t.sl);
    if (t.result === "سود") return num(t.tp);
    if (t.result === "ریسک فری") return num(t.entry);
    var manual = num(t.manualExit);
    return manual;
  }

  function computeSlPips(t) {
    var cfg = SYMBOL_CFG[t.symbol];
    var entry = num(t.entry), sl = num(t.sl);
    if (!cfg || entry == null || sl == null) return null;
    return Math.abs(entry - sl) / cfg.pip;
  }

  function computeCore(t) {
    var cfg = SYMBOL_CFG[t.symbol];
    var exit = computeExitPrice(t);
    var slPips = computeSlPips(t);
    var entry = num(t.entry);
    if (!cfg || exit == null || entry == null) {
      return { exit: exit, pips: null, dollar: null, slPips: slPips, riskDollar: null, rr: null };
    }
    var dir = isBuy(t.direction) ? 1 : (isSell(t.direction) ? -1 : 0);
    var priceDiff = (exit - entry) * dir;
    var pips = priceDiff / cfg.pip;
    var lot = num(t.lot) || 0;
    var commission = num(t.commission) || 0;
    var gross = pips * cfg.pipValue * lot;
    var dollar = gross - commission * lot;
    var riskPercent = num(t.riskPercent);
    var balanceBefore = num(t.balanceBeforeEntry);
    var riskDollar = (riskPercent && balanceBefore) ? (riskPercent / 100) * balanceBefore : null;
    var rr = (riskDollar && riskDollar > 0) ? dollar / riskDollar : null;
    return { exit: exit, pips: pips, dollar: dollar, slPips: slPips, riskDollar: riskDollar, rr: rr };
  }

  function fmt(n, d) {
    if (d === undefined) d = 0;
    if (n == null || isNaN(n)) return "—";
    return n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
  }

  function setupScoreValue(s) {
    var m = /^(\d+)/.exec(s || "");
    return m ? parseInt(m[1], 10) : null;
  }

  /* =========================================================================
     محاسبه‌ی سری غنی‌شده معاملات (بالانس، دراودان، استریک، شماره)
     ========================================================================= */
  function enrichTrades(trades, initialBalance) {
    var sorted = trades.slice().sort(function (a, b) {
      var da = (a.openDate || "") + "T" + (a.openTime || "00:00");
      var db = (b.openDate || "") + "T" + (b.openTime || "00:00");
      if (da < db) return -1;
      if (da > db) return 1;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
    var balance = initialBalance, peak = initialBalance;
    var winStreak = 0, lossStreak = 0;
    var out = [];
    sorted.forEach(function (t, idx) {
      var core = computeCore(t);
      var counted = t.result !== "عدم ترید";
      if (counted && core.dollar != null) balance += core.dollar;
      peak = Math.max(peak, balance);
      var drawdown = peak > 0 ? (peak - balance) / peak : 0;
      winStreak = t.result === "سود" ? winStreak + 1 : 0;
      lossStreak = t.result === "ضرر" ? lossStreak + 1 : 0;
      out.push(Object.assign({}, t, core, {
        number: idx + 1,
        day: dayFromDate(t.openDate),
        session: sessionFromTime(t.openTime),
        isMyTime: isMyTimeCalc(t.openTime),
        duration: computeDuration(t.openTime, t.closeTime),
        exitReasonAuto: t.exitReason || defaultExitReason(t.result),
        balance: balance,
        drawdown: drawdown,
        winStreak: winStreak,
        lossStreak: lossStreak,
      }));
    });
    return out;
  }

  function computeStats(enriched, initialBalance) {
    var counted = enriched.filter(function (t) { return t.result !== "عدم ترید"; });
    var wins = counted.filter(function (t) { return t.result === "سود"; });
    var losses = counted.filter(function (t) { return t.result === "ضرر"; });
    var riskFree = counted.filter(function (t) { return t.result === "ریسک فری"; });
    var pe = counted.filter(function (t) { return t.result === "PE"; });
    var trail = counted.filter(function (t) { return t.result === "تریل SL در سود"; });
    var noTrade = enriched.filter(function (t) { return t.result === "عدم ترید"; });

    var grossProfit = wins.reduce(function (s, t) { return s + (t.dollar || 0); }, 0);
    var grossLoss = Math.abs(losses.reduce(function (s, t) { return s + (t.dollar || 0); }, 0));
    var netProfit = enriched.reduce(function (s, t) { return s + (t.result !== "عدم ترید" && t.dollar != null ? t.dollar : 0); }, 0);
    var currentBalance = initialBalance + netProfit;
    var winRate = counted.length ? wins.length / counted.length : 0;
    var lossRate = counted.length ? losses.length / counted.length : 0;
    var breakevenRate = counted.length ? riskFree.length / counted.length : 0;
    var profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;
    var avgWin = wins.length ? grossProfit / wins.length : 0;
    var avgLoss = losses.length ? grossLoss / losses.length : 0;
    var largestWin = wins.length ? Math.max.apply(null, wins.map(function (t) { return t.dollar || 0; })) : 0;
    var largestLoss = losses.length ? Math.abs(Math.min.apply(null, losses.map(function (t) { return t.dollar || 0; }))) : 0;
    var expectancy = winRate * avgWin - lossRate * avgLoss;
    var maxDD = enriched.reduce(function (m, t) { return Math.max(m, t.drawdown || 0); }, 0);
    var currentDD = enriched.length ? enriched[enriched.length - 1].drawdown : 0;
    var maxW = enriched.reduce(function (m, t) { return Math.max(m, t.winStreak || 0); }, 0);
    var maxL = enriched.reduce(function (m, t) { return Math.max(m, t.lossStreak || 0); }, 0);

    var riskVals = enriched.map(function (t) { return num(t.riskPercent); }).filter(function (v) { return v != null; });
    var avgRiskPercent = riskVals.length ? riskVals.reduce(function (a, b) { return a + b; }, 0) / riskVals.length : 0;
    var lotVals = enriched.map(function (t) { return num(t.lot); }).filter(function (v) { return v != null; });
    var avgLot = lotVals.length ? lotVals.reduce(function (a, b) { return a + b; }, 0) / lotVals.length : 0;
    var rrVals = wins.map(function (t) { return t.rr; }).filter(function (v) { return v != null; });
    var avgWinRR = rrVals.length ? rrVals.reduce(function (a, b) { return a + b; }, 0) / rrVals.length : 0;
    var durVals = enriched.map(function (t) { return durationToMinutes(t.duration); }).filter(function (v) { return v != null; });
    var avgDurMin = durVals.length ? durVals.reduce(function (a, b) { return a + b; }, 0) / durVals.length : 0;
    var setupScores = enriched.map(function (t) { return setupScoreValue(t.setupQuality); }).filter(function (v) { return v != null; });
    var avgSetupScore = setupScores.length ? setupScores.reduce(function (a, b) { return a + b; }, 0) / setupScores.length : 0;
    var execScores = enriched.map(function (t) { return setupScoreValue(t.executionScore); }).filter(function (v) { return v != null; });
    var avgExecScore = execScores.length ? execScores.reduce(function (a, b) { return a + b; }, 0) / execScores.length : 0;

    var lastDayStart = null;
    for (var i = enriched.length - 1; i >= 0; i--) {
      var v = num(enriched[i].dayStartBalance);
      if (v != null) { lastDayStart = v; break; }
    }
    if (lastDayStart == null) lastDayStart = currentBalance;

    return {
      totalTrades: counted.length, totalPositions: counted.length + noTrade.length,
      countProfit: wins.length, countLoss: losses.length, countRiskFree: riskFree.length,
      countPE: pe.length, countTrail: trail.length, countNoTrade: noTrade.length,
      grossProfit: grossProfit, grossLoss: grossLoss, netProfit: netProfit, currentBalance: currentBalance,
      winRate: winRate, lossRate: lossRate, breakevenRate: breakevenRate, profitFactor: profitFactor,
      avgWin: avgWin, avgLoss: avgLoss, largestWin: largestWin, largestLoss: largestLoss,
      expectancy: expectancy, maxDD: maxDD, currentDD: currentDD, maxW: maxW, maxL: maxL,
      totalReturnPct: initialBalance ? (currentBalance - initialBalance) / initialBalance : 0,
      avgRiskPercent: avgRiskPercent, avgLot: avgLot, avgWinRR: avgWinRR, avgDurMin: avgDurMin,
      avgSetupScore: avgSetupScore, avgExecScore: avgExecScore,
      dayStartBalance: lastDayStart,
      maxDrawdownLimit: initialBalance * 0.12,
      dailyDrawdownLimit: lastDayStart * 0.05,
      halfDailyDrawdownLimit: (lastDayStart * 0.05) / 2,
      floatingRiskLimit: currentBalance * 0.03,
      stage1Target: initialBalance * 0.1,
      stage2Target: initialBalance * 0.05,
    };
  }

  /* =========================================================================
     ذخیره‌سازی (روی دیسک از طریق Electron -- بدون محدودیت localStorage)
     ========================================================================= */
  var hasAPI = typeof window.hwAPI !== "undefined";
  var LS_KEY = "hw-journal-v1";

  function loadStateAsync(cb) {
    if (hasAPI) {
      window.hwAPI.loadState().then(function (s) { cb(s); }).catch(function () { cb(null); });
    } else {
      try {
        var raw = localStorage.getItem(LS_KEY);
        cb(raw ? JSON.parse(raw) : null);
      } catch (e) { cb(null); }
    }
  }

  var saveTimer = null;
  function persistState(state) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      if (hasAPI) {
        window.hwAPI.saveState(state);
      } else {
        try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { }
      }
    }, 250);
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function defaultSettings() {
    return { currency: "USD", initialBalance: 10000, defaultRiskPercent: 0.4, defaultSpread: 2, defaultCommission: 4.5 };
  }

  function cloneOptions() {
    var out = {};
    Object.keys(DEFAULT_OPTIONS).forEach(function (k) { out[k] = DEFAULT_OPTIONS[k].slice(); });
    return out;
  }

  function emptyTrade(settings, opts) {
    return {
      id: Date.now() + Math.random(),
      createdAt: Date.now(),
      testType: opts.testType[0], propStage: opts.propStage[0], underTestId: opts.underTestId[0],
      openDate: todayStr(), closeDate: todayStr(), openTime: "", closeTime: "",
      system: opts.system[0], symbol: "EU", direction: opts.direction[0], style: opts.style[0],
      tags: [],
      entry: "", sl: "", tp: "", manualExit: "", exitReason: "",
      multiTP: "خیر", multiTPReason: "",
      lot: "0.5", spread: String(settings.defaultSpread), commission: String(settings.defaultCommission),
      swap: "خیر", slippage: "خیر", slippageReason: "",
      riskPercent: String(settings.defaultRiskPercent), dayStartBalance: "", balanceBeforeEntry: "",
      moneyManagement: opts.moneyManagement[0], newsHoliday: "خیر", newsCompliance: "بله",
      entryReason: opts.entryReason[0], xilType: opts.xilType[0], combinedType: opts.combinedType[0],
      mainTF: "H4", confirmTF: "H1", entryTF: "M15",
      atr: opts.atr[0], usedDivergence: "خیر", divergenceIndicator: opts.divergenceIndicator[0],
      entryCandle: opts.entryCandle[0], setupModel: opts.setupModel[0], subStructure: "خیر",
      higherTFTrend: opts.trendState[0], marketTrend: opts.trendState[0], trendStrength: "بله",
      elderTest: opts.elderTest[0], setupQuality: opts.setupQuality[0],
      lqStatus: "", gapStatus: "", ctcStatus: "",
      result: opts.result[0], resultDisplayType: "دلاری", closedUnder30s: "خیر",
      multipleEntries: "خیر", multipleEntriesReason: "", allClosedSameDay: "بله",
      expertWorkedCorrectly: "بله", expertFailReason: "", noTradeReason: "",
      mistake: "بدون اشتباه", executionScore: opts.setupQuality[0],
      snf: "خیر", readiness: opts.readiness[4] || opts.readiness[0],
      feelings: "", generalAnalysis: "", myOpinion: "", generalNote: "",
      imgBefore: null, imgDuring: null, imgAfter: null,
      custom: {},
    };
  }

  function seedTrades(settings, opts) {
    function mk(over) {
      var t = emptyTrade(settings, opts);
      return Object.assign(t, over);
    }
    return [
      mk({ openDate: "2026-07-01", openTime: "11:15", closeTime: "12:40", symbol: "EU", direction: "🟢 Buy", entry: "1.08620", sl: "1.08420", tp: "1.09120", lot: "0.5", result: "سود", balanceBeforeEntry: "10000", riskPercent: "0.5", setupQuality: "5 - عالی", executionScore: "5 - عالی" }),
      mk({ openDate: "2026-07-03", openTime: "13:40", closeTime: "14:05", symbol: "GU", direction: "🔴 Sell", entry: "1.27350", sl: "1.27650", tp: "1.26750", lot: "0.3", result: "ضرر", balanceBeforeEntry: "10091", riskPercent: "0.4", mistake: "ورود بدون تأییدیه" }),
      mk({ openDate: "2026-07-06", openTime: "10:50", closeTime: "11:30", symbol: "GJ", direction: "🟢 Buy", entry: "190.20", sl: "189.80", tp: "191.20", lot: "1.0", result: "سود", system: "سیستم بهمن اسکلپ", balanceBeforeEntry: "9980", riskPercent: "0.6" }),
      mk({ openDate: "2026-07-09", openTime: "16:05", closeTime: "16:45", symbol: "AU", direction: "🟢 Buy", entry: "0.65120", sl: "0.64920", tp: "0.65620", lot: "0.4", result: "ریسک فری", balanceBeforeEntry: "10250", riskPercent: "0.5" }),
      mk({ openDate: "2026-07-12", openTime: "11:20", closeTime: "12:00", symbol: "EU", direction: "🔴 Sell", entry: "1.08980", sl: "1.09180", tp: "1.08480", lot: "0.5", result: "سود", balanceBeforeEntry: "10250", riskPercent: "0.45" }),
    ];
  }

  function defaultState() {
    var settings = defaultSettings();
    var opts = cloneOptions();
    return { theme: "dark", settings: settings, fieldOptions: opts, customFields: [], trades: seedTrades(settings, opts) };
  }

  /* =========================================================================
     مؤلفه‌های عمومی UI
     ========================================================================= */
  function Section(props) { return h("div", { style: { fontSize: 12, fontWeight: 700, color: C.amber, margin: "20px 0 8px", paddingBottom: 4, borderBottom: "1px solid var(--border-soft)" } }, props.title); }
  function Grid(props) {
    return h("div", { style: { display: "grid", gridTemplateColumns: "repeat(" + (props.cols || 3) + ", 1fr)", gap: 10, marginBottom: 4 } }, props.children);
  }
  function Field(props) {
    return h("div", { className: "field", style: props.style }, h("label", null, props.label), props.children);
  }

  var btnPrimary = { background: C.amber, color: "#1A1406", border: "none", borderRadius: 10, padding: "9px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" };
  var btnGhost = { background: "none", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" };
  var smallBtn = { background: "none", border: "none", color: C.amber, cursor: "pointer", fontSize: 11, fontWeight: 600, padding: 0 };
  var smallBtnCoral = Object.assign({}, smallBtn, { color: C.coral });

  function Kpi(props) {
    return h("div", { className: "card", style: { padding: "14px 16px" } },
      h("div", { style: { fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginBottom: 8 } }, props.label),
      h("div", { className: "mono", style: { fontSize: 20, fontWeight: 700, color: props.accent || "var(--text)" } }, props.value)
    );
  }

  function Logo(props) {
    var size = props.size || 34;
    return h("svg", { width: size, height: size, viewBox: "0 0 100 100" },
      h("polygon", { points: "50,4 92,27 92,73 50,96 8,73 8,27", fill: "#0D1117", stroke: C.amber, strokeWidth: 3 }),
      h("text", { x: "50", y: "50", fill: C.amber, fontSize: "34", fontWeight: "800", fontFamily: "Poppins, Arial, sans-serif", textAnchor: "middle", dominantBaseline: "central" }, "HW"),
      h("line", { x1: "28", y1: "68", x2: "72", y2: "68", stroke: C.amber, strokeWidth: "3" })
    );
  }

  function SunMoonToggle(props) {
    var dark = props.theme === "dark";
    return h("button", {
      onClick: props.onToggle, title: dark ? "تغییر به حالت روشن" : "تغییر به حالت تیره",
      style: { background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 999, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.amber, fontSize: 18 }
    }, dark ? "🌙" : "☀️");
  }

  /* ---- ورودی تگ‌ها (هشتگ) ---- */
  function TagsInput(props) {
    var tags = props.value || [];
    var val = useState("")[0], setVal = useState("")[1];
    function commit() {
      var v = val.trim().replace(/^#/, "");
      if (v) {
        props.onChange(tags.concat(["#" + v]));
      }
      setVal("");
    }
    function removeAt(i) {
      var next = tags.slice(); next.splice(i, 1); props.onChange(next);
    }
    return h("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 6 } },
      tags.map(function (tg, i) {
        return h("span", { key: i, className: "badge", style: { background: C.amber + "22", color: C.amber, display: "flex", alignItems: "center", gap: 4 } },
          tg, h("span", { onClick: function () { removeAt(i); }, style: { cursor: "pointer", fontWeight: 700 } }, "✕"));
      }),
      h("input", {
        value: val, placeholder: "تگ جدید و Enter...", style: { border: "none", background: "transparent", flex: 1, minWidth: 100, color: "var(--text)", fontSize: 12, outline: "none" },
        onChange: function (e) { setVal(e.target.value); },
        onKeyDown: function (e) { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } },
        onBlur: commit
      })
    );
  }

  /* ---- انتخاب‌گر تصویر از کامپیوتر / گوشی ---- */
  function ImagePicker(props) {
    var fileInputRef = React.useRef(null);
    function pick() {
      if (hasAPI) {
        window.hwAPI.pickImage().then(function (res) {
          if (res && res.dataUrl) props.onChange(res.dataUrl);
        });
        return;
      }
      if (fileInputRef.current) fileInputRef.current.click();
    }
    function onFileChosen(e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () { props.onChange(reader.result); };
      reader.readAsDataURL(file);
      e.target.value = "";
    }
    return h("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
      !hasAPI ? h("input", { ref: fileInputRef, type: "file", accept: "image/*", style: { display: "none" }, onChange: onFileChosen }) : null,
      props.value
        ? h("img", { src: props.value, style: { width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" } })
        : h("div", { style: { width: 64, height: 64, borderRadius: 8, border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)", fontSize: 10 } }, "بدون تصویر"),
      h("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
        h("button", { type: "button", onClick: pick, style: Object.assign({}, btnGhost, { padding: "6px 12px", fontSize: 11 }) }, hasAPI ? "انتخاب از کامپیوتر" : "انتخاب تصویر"),
        props.value ? h("button", { type: "button", onClick: function () { props.onChange(null); }, style: Object.assign({}, smallBtnCoral, { textAlign: "right" }) }, "حذف تصویر") : null
      )
    );
  }

  /* ---- نمودار SVG ساده‌ی منحنی سرمایه (بدون هیچ کتابخانه‌ی خارجی) ---- */
  function EquityCurve(props) {
    var data = props.data, initialBalance = props.initialBalance;
    var W = 900, H = 220, PAD = 30;
    if (!data.length) return h("div", { style: { color: "var(--text-muted)", fontSize: 12, padding: 20 } }, "هنوز معامله‌ای ثبت نشده است.");
    var values = data.map(function (d) { return d.balance; }).concat([initialBalance]);
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    if (min === max) { min -= 10; max += 10; }
    function X(i) { return PAD + (i / (data.length - 1 || 1)) * (W - PAD * 2); }
    function Y(v) { return H - PAD - ((v - min) / (max - min)) * (H - PAD * 2); }
    var pts = data.map(function (d, i) { return X(i) + "," + Y(d.balance); }).join(" ");
    var baseline = Y(initialBalance);
    var last = data[data.length - 1];
    var up = last.balance >= initialBalance;
    var areaPts = pts + " " + X(data.length - 1) + "," + (H - PAD) + " " + X(0) + "," + (H - PAD);
    return h("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", height: H, preserveAspectRatio: "none" },
      h("defs", null, h("linearGradient", { id: "eqGrad", x1: "0", y1: "0", x2: "0", y2: "1" },
        h("stop", { offset: "0%", stopColor: up ? C.teal : C.coral, stopOpacity: 0.35 }),
        h("stop", { offset: "100%", stopColor: up ? C.teal : C.coral, stopOpacity: 0 })
      )),
      h("line", { x1: PAD, y1: baseline, x2: W - PAD, y2: baseline, stroke: "var(--text-faint)", strokeDasharray: "4 4", strokeWidth: 1 }),
      h("polygon", { points: areaPts, fill: "url(#eqGrad)" }),
      h("polyline", { points: pts, fill: "none", stroke: up ? C.teal : C.coral, strokeWidth: 2.4, strokeLinejoin: "round", strokeLinecap: "round" }),
      data.map(function (d, i) { return h("circle", { key: i, cx: X(i), cy: Y(d.balance), r: 2.6, fill: up ? C.teal : C.coral }); })
    );
  }

  function BarRow(props) {
    return h("div", { style: { marginBottom: 10 } },
      h("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 } },
        h("span", null, props.label), h("span", { className: "mono", style: { color: "var(--text-muted)" } }, props.sub)),
      h("div", { style: { height: 6, background: "var(--border-soft)", borderRadius: 4, overflow: "hidden" } },
        h("div", { style: { width: (props.pct || 0) + "%", height: "100%", background: props.color || C.amber } }))
    );
  }

  /* =========================================================================
     تعریف فیلدهای فرم ثبت معامله (منطبق بر ستون‌های فایل ژورنال مرجع)
     ========================================================================= */
  function fieldGroups() {
    return [
      {
        title: "اطلاعات پایه", fields: [
          { key: "testType", label: "نوع تست", type: "select" },
          { key: "propStage", label: "مرحله چند؟ (پراپ)", type: "select", showIf: function (t) { return t.testType === "پراپ"; } },
          { key: "underTestId", label: "شناسه تحت تست", type: "select" },
          { key: "openDate", label: "تاریخ باز کردن ترید", type: "date" },
          { key: "closeDate", label: "تاریخ بستن ترید", type: "date" },
          { key: "openTime", label: "ساعت باز کردن ترید", type: "time" },
          { key: "closeTime", label: "ساعت بستن ترید", type: "time" },
          { key: "system", label: "سیستم / چک‌لیست", type: "select" },
          { key: "symbol", label: "نماد", type: "symbol" },
          { key: "direction", label: "جهت ترید", type: "select" },
          { key: "style", label: "استایل ترید", type: "select" },
          { key: "tags", label: "تگ‌ها (#)", type: "tags", full: true },
        ]
      },
      {
        title: "قیمت‌ها و حجم", fields: [
          { key: "entry", label: "قیمت ورود", type: "number", step: "0.00001" },
          { key: "sl", label: "Stop Loss", type: "number", step: "0.00001" },
          { key: "tp", label: "Take Profit", type: "number", step: "0.00001" },
          { key: "manualExit", label: "قیمت خروج دستی (PE / Trail / عدم ترید)", type: "number", step: "0.00001", showIf: function (t) { return ["PE", "تریل SL در سود", "عدم ترید"].indexOf(t.result) >= 0; } },
          { key: "exitReason", label: "دلیل خروج از معامله", type: "select" },
          { key: "multiTP", label: "آیا چند TP داشتیم؟", type: "select", optionsKey: "yesNo" },
          { key: "multiTPReason", label: "چرا چند TP داشتیم و RR؟", type: "text", showIf: function (t) { return t.multiTP === "بله"; } },
          { key: "lot", label: "حجم معامله (Lot)", type: "number", step: "0.01" },
          { key: "spread", label: "اسپرد (پیپ)", type: "number", step: "0.1" },
          { key: "commission", label: "کمیسیون (هر لات)", type: "number", step: "0.1" },
          { key: "swap", label: "سواپ", type: "select", optionsKey: "yesNo" },
          { key: "slippage", label: "اسلیپیج", type: "select", optionsKey: "yesNo" },
          { key: "slippageReason", label: "علت اسلیپیج", type: "text", showIf: function (t) { return t.slippage === "بله"; } },
        ]
      },
      {
        title: "ریسک و مدیریت سرمایه", fields: [
          { key: "riskPercent", label: "درصد ریسک از حساب (%)", type: "number", step: "0.1" },
          { key: "dayStartBalance", label: "بالانس اول روز کاری ($)", type: "number", step: "1" },
          { key: "balanceBeforeEntry", label: "بالانس قبل از ورود ($)", type: "number", step: "1" },
          { key: "moneyManagement", label: "مدل مدیریت سرمایه", type: "select" },
          { key: "newsHoliday", label: "اخبار / تعطیلی", type: "select", optionsKey: "yesNo" },
          { key: "newsCompliance", label: "اگر خبر داشتیم، رعایت شد؟", type: "select", optionsKey: "yesNo", showIf: function (t) { return t.newsHoliday === "بله"; } },
          { key: "entryReason", label: "دلیل ورود به معامله", type: "select" },
          { key: "xilType", label: "نوع XIL", type: "select" },
          { key: "combinedType", label: "نوع ترکیبی", type: "select", showIf: function (t) { return t.entryReason === "ترکیبی"; } },
        ]
      },
      {
        title: "تحلیل تکنیکال و ستاپ", fields: [
          { key: "mainTF", label: "تایم اصلی", type: "select" },
          { key: "confirmTF", label: "تایم تاییدیه", type: "select" },
          { key: "entryTF", label: "تایم ورود", type: "select" },
          { key: "atr", label: "ATR", type: "select" },
          { key: "usedDivergence", label: "آیا از دایورجنس استفاده کردیم؟", type: "select", optionsKey: "yesNo" },
          { key: "divergenceIndicator", label: "اندیکاتور دایورجنس", type: "select", showIf: function (t) { return t.usedDivergence === "بله"; } },
          { key: "entryCandle", label: "کندل ورود چگونه بود؟", type: "select" },
          { key: "setupModel", label: "مدل ستاپ", type: "select" },
          { key: "subStructure", label: "آیا ترید بر اساس ساختار SUB بود؟", type: "select", optionsKey: "yesNo" },
          { key: "higherTFTrend", label: "روند تایم بالا چگونه بود؟", type: "select", optionsKey: "trendState" },
          { key: "marketTrend", label: "روند کلی مارکت چگونه بود؟", type: "select", optionsKey: "trendState" },
          { key: "trendStrength", label: "آیا قدرت روند داشتیم؟", type: "select", optionsKey: "yesNo" },
          { key: "elderTest", label: "تست دکتر الدر", type: "select" },
          { key: "setupQuality", label: "کیفیت ستاپ", type: "select" },
          { key: "lqStatus", label: "وضعیت LQ ها", type: "text" },
          { key: "gapStatus", label: "آیا گپ داشتیم؟ اگر بله کجا؟", type: "text" },
          { key: "ctcStatus", label: "وضعیت CTC", type: "text" },
        ]
      },
      {
        title: "نتیجه‌ی معامله", fields: [
          { key: "result", label: "نتیجه ترید", type: "select" },
          { key: "resultDisplayType", label: "نوع نمایش سود یا ضرر", type: "select" },
          { key: "noTradeReason", label: "دلیل ترید نکردن", type: "text", showIf: function (t) { return t.result === "عدم ترید"; } },
          { key: "closedUnder30s", label: "آیا معامله زیر 30 ثانیه بسته شد؟", type: "select", optionsKey: "yesNo" },
          { key: "multipleEntries", label: "آیا در یک موقعیت چند بار ورود داشتیم؟", type: "select", optionsKey: "yesNo" },
          { key: "multipleEntriesReason", label: "اگر بله چرا و چند RR؟", type: "text", showIf: function (t) { return t.multipleEntries === "بله"; } },
          { key: "allClosedSameDay", label: "آیا همه معاملات همان روز بسته شدند؟", type: "select", optionsKey: "yesNo" },
          { key: "expertWorkedCorrectly", label: "آیا اکسپرت درست کار کرد؟", type: "select", optionsKey: "yesNo" },
          { key: "expertFailReason", label: "اگر خیر، علت چه بود؟", type: "text", showIf: function (t) { return t.expertWorkedCorrectly === "خیر"; } },
          { key: "mistake", label: "اشتباه اصلی", type: "select" },
          { key: "executionScore", label: "نمره کلی اجرای معامله", type: "select", optionsKey: "setupQuality" },
          { key: "snf", label: "آیا S&F انجام شد؟", type: "select", optionsKey: "yesNo" },
          { key: "readiness", label: "میزان آمادگی", type: "select" },
        ]
      },
      {
        title: "روان‌شناسی و یادداشت", fields: [
          { key: "feelings", label: "احساسات (قبل / حین / بعد از معامله)", type: "textarea", full: true },
          { key: "generalAnalysis", label: "تحلیل کلی", type: "textarea", full: true },
          { key: "myOpinion", label: "نظر من درباره این معامله", type: "textarea", full: true },
          { key: "generalNote", label: "یادداشت کلی", type: "textarea", full: true },
        ]
      },
      {
        title: "تصاویر معامله (از کامپیوتر)", fields: [
          { key: "imgBefore", label: "تصویر قبل از معامله", type: "image" },
          { key: "imgDuring", label: "تصویر حین معامله", type: "image" },
          { key: "imgAfter", label: "تصویر بعد از معامله", type: "image" },
        ]
      },
    ];
  }

  /* =========================================================================
     فرم ثبت / ویرایش معامله
     ========================================================================= */
  function TradeForm(props) {
    var initial = props.initial, opts = props.fieldOptions, customFields = props.customFields;
    var st = useState(initial), f = st[0], setF = st[1];
    var touchedCloseRef = useRef(initial.closeDate !== initial.openDate);

    function set(k, v) {
      setF(function (prev) {
        var next = Object.assign({}, prev);
        next[k] = v;
        if (k === "openDate" && !touchedCloseRef.current) next.closeDate = v;
        if (k === "closeDate") touchedCloseRef.current = true;
        if (k === "result") next.exitReason = defaultExitReason(v);
        return next;
      });
    }
    function setCustom(k, v) {
      setF(function (prev) {
        var next = Object.assign({}, prev);
        next.custom = Object.assign({}, prev.custom);
        next.custom[k] = v;
        return next;
      });
    }

    var preview = useMemo(function () { return computeCore(f); }, [f.entry, f.sl, f.tp, f.result, f.manualExit, f.symbol, f.direction, f.lot, f.commission, f.riskPercent, f.balanceBeforeEntry]);
    var autoDay = dayFromDate(f.openDate), autoSession = sessionFromTime(f.openTime), autoDuration = computeDuration(f.openTime, f.closeTime);

    function submit(e) {
      e.preventDefault();
      if (!f.openDate || !f.entry) { alert("لطفا حداقل «تاریخ باز کردن» و «قیمت ورود» را وارد کنید."); return; }
      props.onSave(f);
    }

    function renderOne(def) {
      if (def.showIf && !def.showIf(f)) return null;
      var value = f[def.key];
      var label = h("label", null, def.label);
      var body;
      if (def.type === "select") {
        var list = opts[def.optionsKey || def.key] || [];
        body = h("select", { value: value, onChange: function (e) { set(def.key, e.target.value); } },
          list.map(function (o) { return h("option", { key: o, value: o }, o); }));
      } else if (def.type === "symbol") {
        body = h("select", { value: value, onChange: function (e) { set(def.key, e.target.value); } },
          Object.keys(SYMBOL_CFG).map(function (k) { return h("option", { key: k, value: k }, SYMBOL_CFG[k].name + " (" + k + ")"); }));
      } else if (def.type === "textarea") {
        body = h("textarea", { value: value || "", onChange: function (e) { set(def.key, e.target.value); } });
      } else if (def.type === "tags") {
        body = h(TagsInput, { value: value || [], onChange: function (v) { set(def.key, v); } });
      } else if (def.type === "image") {
        body = h(ImagePicker, { value: value, onChange: function (v) { set(def.key, v); } });
      } else if (def.type === "date") {
        body = h("input", { type: "date", value: value || "", onChange: function (e) { set(def.key, e.target.value); } });
      } else if (def.type === "time") {
        body = h("input", { type: "time", value: value || "", onChange: function (e) { set(def.key, e.target.value); } });
      } else if (def.type === "number") {
        body = h("input", { type: "number", step: def.step || "any", className: "mono", value: value, onChange: function (e) { set(def.key, e.target.value); } });
      } else {
        body = h("input", { type: "text", value: value || "", onChange: function (e) { set(def.key, e.target.value); } });
      }
      return h(Field, { key: def.key, label: def.label, style: def.full ? { gridColumn: "1 / -1" } : null }, body);
    }

    var groups = fieldGroups();

    return h("div", { className: "modal-backdrop" },
      h("form", { onSubmit: submit, className: "card fade-up", style: { padding: 24, width: "100%", maxWidth: 900, maxHeight: "92vh", overflowY: "auto" } },
        h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } },
          h("h2", { style: { fontSize: 18, fontWeight: 700, margin: 0 } }, initial.__editing ? "ویرایش معامله" : "ثبت معامله‌ی جدید"),
          h("button", { type: "button", onClick: props.onCancel, style: { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18 } }, "✕")
        ),
        h("div", { className: "mono", style: { fontSize: 11, color: "var(--text-muted)", marginBottom: 10 } },
          "خودکار → روز: ", autoDay || "—", " · سشن: ", autoSession || "—", " · مدت زمان: ", autoDuration || "—"),

        groups.map(function (g) {
          return h(React.Fragment, { key: g.title },
            h(Section, { title: g.title }),
            h(Grid, { cols: 3 }, g.fields.map(renderOne))
          );
        }),

        customFields && customFields.length > 0 ? h(React.Fragment, null,
          h(Section, { title: "فیلدهای سفارشی شما" }),
          h(Grid, { cols: 3 }, customFields.map(function (cf) {
            var val = (f.custom || {})[cf.key] || "";
            var body;
            if (cf.type === "select") {
              body = h("select", { value: val, onChange: function (e) { setCustom(cf.key, e.target.value); } },
                (cf.options || []).map(function (o) { return h("option", { key: o, value: o }, o); }));
            } else if (cf.type === "number") {
              body = h("input", { type: "number", className: "mono", value: val, onChange: function (e) { setCustom(cf.key, e.target.value); } });
            } else {
              body = h("input", { type: "text", value: val, onChange: function (e) { setCustom(cf.key, e.target.value); } });
            }
            return h(Field, { key: cf.key, label: cf.label }, body);
          }))
        ) : null,

        (preview.dollar != null || preview.slPips != null) ? h("div", {
          className: "mono", style: { marginTop: 16, background: "var(--panel-alt)", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }
        },
          h("span", { style: { color: "var(--text-muted)", fontFamily: "inherit" } }, "پیش‌نمایش خودکار:"),
          h("span", null,
            preview.slPips != null ? (fmt(preview.slPips, 1) + " پیپ SL · ") : "",
            preview.pips != null ? (fmt(preview.pips, 1) + " پیپ · ") : "",
            preview.dollar != null ? h("span", { style: { color: preview.dollar >= 0 ? C.teal : C.coral, fontWeight: 700 } }, (preview.dollar >= 0 ? "+" : "") + fmt(preview.dollar, 2) + "$") : "",
            preview.rr != null ? ("  ·  RR: " + fmt(preview.rr, 2)) : ""
          )
        ) : null,

        h("button", { type: "submit", style: Object.assign({}, btnPrimary, { width: "100%", marginTop: 18, padding: "12px", fontSize: 14 }) }, "ذخیره‌ی معامله")
      )
    );
  }

  /* =========================================================================
     تب داشبورد
     ========================================================================= */
  function Dashboard(props) {
    var stats = props.stats, enriched = props.enriched, initialBalance = props.initialBalance;
    var chartData = useMemo(function () {
      return [{ label: "شروع", balance: initialBalance }].concat(enriched.map(function (t) { return { label: t.openDate, balance: t.balance }; }));
    }, [enriched, initialBalance]);

    var bySymbol = useMemo(function () {
      var m = {};
      enriched.filter(function (t) { return t.result !== "عدم ترید"; }).forEach(function (t) {
        if (!m[t.symbol]) m[t.symbol] = { symbol: t.symbol, win: 0, loss: 0 };
        if (t.result === "سود") m[t.symbol].win++;
        if (t.result === "ضرر") m[t.symbol].loss++;
      });
      return Object.keys(m).map(function (k) { return m[k]; });
    }, [enriched]);

    var bySystem = useMemo(function () {
      var systems = {};
      enriched.forEach(function (t) {
        if (t.result === "عدم ترید") return;
        if (!systems[t.system]) systems[t.system] = { system: t.system, total: 0, win: 0 };
        systems[t.system].total++;
        if (t.result === "سود") systems[t.system].win++;
      });
      return Object.keys(systems).map(function (k) { var s = systems[k]; return Object.assign({}, s, { winRate: s.total ? s.win / s.total : 0 }); });
    }, [enriched]);

    var byMistake = useMemo(function () {
      var m = {};
      enriched.forEach(function (t) { if (t.mistake && t.mistake !== "بدون اشتباه") m[t.mistake] = (m[t.mistake] || 0) + 1; });
      return Object.keys(m).map(function (k) { return { mistake: k, count: m[k] }; }).sort(function (a, b) { return b.count - a.count; });
    }, [enriched]);

    return h("div", { className: "fade-up" },
      h("div", { style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 } },
        h(Kpi, { label: "بالانس فعلی", value: "$" + fmt(stats.currentBalance), accent: stats.currentBalance >= initialBalance ? C.teal : C.coral }),
        h(Kpi, { label: "Win Rate", value: fmt(stats.winRate * 100, 1) + "%", accent: C.amber }),
        h(Kpi, { label: "Profit Factor", value: stats.profitFactor == null ? "—" : fmt(stats.profitFactor, 2), accent: C.amber }),
        h(Kpi, { label: "Expectancy", value: "$" + fmt(stats.expectancy, 1), accent: stats.expectancy >= 0 ? C.teal : C.coral }),
        h(Kpi, { label: "Net Profit", value: "$" + fmt(stats.netProfit), accent: stats.netProfit >= 0 ? C.teal : C.coral }),
        h(Kpi, { label: "Max Drawdown", value: fmt(stats.maxDD * 100, 1) + "%", accent: C.coral }),
        h(Kpi, { label: "بیشترین برد پیاپی", value: stats.maxW, accent: C.teal }),
        h(Kpi, { label: "بیشترین باخت پیاپی", value: stats.maxL, accent: C.coral })
      ),
      h("div", { className: "card", style: { padding: "18px 20px 8px", marginBottom: 16 } },
        h("div", { style: { fontSize: 13, color: "var(--text-muted)", marginBottom: 10, fontWeight: 600 } }, "منحنی سرمایه (Equity Curve)"),
        h(EquityCurve, { data: chartData.slice(1), initialBalance: initialBalance })
      ),
      h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 } },
        h("div", { className: "card", style: { padding: 18 } },
          h("div", { style: { fontSize: 13, color: "var(--text-muted)", marginBottom: 12, fontWeight: 600 } }, "Win/Loss به تفکیک نماد"),
          bySymbol.length ? bySymbol.map(function (s) {
            var t = s.win + s.loss, pct = t ? (s.win / t) * 100 : 0;
            return h(BarRow, { key: s.symbol, label: (SYMBOL_CFG[s.symbol] || {}).name || s.symbol, sub: s.win + "W / " + s.loss + "L", pct: pct, color: C.teal });
          }) : h("div", { style: { color: "var(--text-faint)", fontSize: 12 } }, "داده‌ای موجود نیست.")
        ),
        h("div", { className: "card", style: { padding: 18 } },
          h("div", { style: { fontSize: 13, color: "var(--text-muted)", marginBottom: 12, fontWeight: 600 } }, "Win Rate بر اساس سیستم"),
          bySystem.length ? bySystem.map(function (s) {
            return h(BarRow, { key: s.system, label: s.system, sub: fmt(s.winRate * 100, 0) + "% (" + s.total + ")", pct: s.winRate * 100, color: C.amber });
          }) : h("div", { style: { color: "var(--text-faint)", fontSize: 12 } }, "داده‌ای موجود نیست.")
        )
      ),
      byMistake.length > 0 ? h("div", { className: "card", style: { padding: 18 } },
        h("div", { style: { fontSize: 13, color: "var(--text-muted)", marginBottom: 12, fontWeight: 600 } }, "فراوانی اشتباهات تکراری"),
        byMistake.map(function (m) {
          return h("div", { key: m.mistake, style: { display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 0", borderTop: "1px solid var(--border-soft)" } },
            h("span", null, m.mistake), h("span", { className: "mono", style: { color: C.coral, fontWeight: 700 } }, m.count + "×"));
        })
      ) : null
    );
  }

  /* =========================================================================
     تب معاملات (جدول)
     ========================================================================= */
  function TradesTab(props) {
    var enriched = props.enriched, onEdit = props.onEdit, onDelete = props.onDelete, customFields = props.customFields;
    var list = enriched.slice().reverse();
    var baseCols = ["#", "تاریخ", "روز", "سشن", "نماد", "جهت", "لات", "تگ‌ها", "نتیجه", "دلیل خروج", "پیپ", "دلار", "RR", "بالانس", "تصاویر", ""];
    var cols = baseCols.slice(0, -1).concat((customFields || []).map(function (c) { return c.label; })).concat([""]);
    return h("div", { className: "card fade-up", style: { overflow: "hidden" } },
      h("div", { style: { overflowX: "auto" } },
        h("table", null,
          h("thead", null, h("tr", null, cols.map(function (c, i) { return h("th", { key: i }, c); }))),
          h("tbody", null, list.map(function (t) {
            var imgCount = [t.imgBefore, t.imgDuring, t.imgAfter].filter(Boolean).length;
            return h("tr", { key: t.id },
              h("td", { className: "mono" }, t.number),
              h("td", { className: "mono" }, t.openDate || "—"),
              h("td", null, t.day || "—"),
              h("td", { style: { fontSize: 11, color: "var(--text-muted)" } }, t.session || "—"),
              h("td", null, (SYMBOL_CFG[t.symbol] || {}).name || t.symbol),
              h("td", { style: { color: /Buy/.test(t.direction) ? C.teal : C.coral } }, t.direction),
              h("td", { className: "mono" }, t.lot),
              h("td", null, (t.tags || []).join(" ")),
              h("td", null, h("span", { className: "badge", style: { background: (RESULT_COLOR[t.result] || "#888") + "22", color: RESULT_COLOR[t.result] || "#888" } }, t.result)),
              h("td", { style: { fontSize: 11, color: "var(--text-muted)" } }, t.exitReasonAuto || "—"),
              h("td", { className: "mono", style: { color: "var(--text-muted)" } }, t.pips != null ? fmt(t.pips, 1) : "—"),
              h("td", { className: "mono", style: { color: t.dollar > 0 ? C.teal : (t.dollar < 0 ? C.coral : "var(--text-muted)"), fontWeight: 600 } }, t.dollar != null ? ((t.dollar >= 0 ? "+" : "") + fmt(t.dollar, 2)) : "—"),
              h("td", { className: "mono", style: { color: "var(--text-muted)" } }, t.rr != null ? fmt(t.rr, 2) : "—"),
              h("td", { className: "mono", style: { fontWeight: 600 } }, "$" + fmt(t.balance, 0)),
              h("td", { style: { fontSize: 11 } }, imgCount ? ("🖼 " + imgCount) : "—"),
              (customFields || []).map(function (cf) { return h("td", { key: cf.key, style: { fontSize: 11 } }, (t.custom || {})[cf.key] || "—"); }),
              h("td", null,
                h("button", { onClick: function () { onEdit(t); }, style: smallBtn }, "ویرایش"),
                h("button", { onClick: function () { onDelete(t.id); }, style: Object.assign({}, smallBtnCoral, { marginRight: 6 }) }, "حذف")
              )
            );
          }))
        )
      ),
      !list.length ? h("div", { style: { padding: 24, textAlign: "center", color: "var(--text-faint)", fontSize: 13 } }, "هنوز معامله‌ای ثبت نشده. از دکمه‌ی «+ ثبت معامله» استفاده کنید.") : null
    );
  }

  /* =========================================================================
     تب حساب‌کتاب
     ========================================================================= */
  function AccountBookTab(props) {
    var s = props.stats, settings = props.settings;
    function Row(label, value, accent) {
      return h("div", { style: { display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: "1px solid var(--border-soft)", fontSize: 12.5 } },
        h("span", { style: { color: "var(--text-muted)" } }, label), h("span", { className: "mono", style: { fontWeight: 700, color: accent || "var(--text)" } }, value));
    }
    return h("div", { className: "fade-up", style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } },
      h("div", { className: "card", style: { padding: 20 } },
        h("div", { style: { fontWeight: 700, marginBottom: 6, color: C.amber, fontSize: 13 } }, "شمارش معاملات"),
        Row("تعداد کل معاملات", s.totalTrades),
        Row("مجموع کل موقعیت‌ها (شامل عدم ترید)", s.totalPositions),
        Row("معاملات سود", s.countProfit, C.teal),
        Row("معاملات ضرر", s.countLoss, C.coral),
        Row("ریسک فری", s.countRiskFree),
        Row("PE", s.countPE),
        Row("تریل SL", s.countTrail),
        Row("عدم ترید", s.countNoTrade),
        Row("بیشترین برد پیاپی (استریک)", s.maxW, C.teal),
        Row("بیشترین باخت پیاپی (استریک)", s.maxL, C.coral)
      ),
      h("div", { className: "card", style: { padding: 20 } },
        h("div", { style: { fontWeight: 700, marginBottom: 6, color: C.amber, fontSize: 13 } }, "سود / زیان"),
        Row("Gross Profit", "$" + fmt(s.grossProfit), C.teal),
        Row("Gross Loss", "$" + fmt(s.grossLoss), C.coral),
        Row("Net Profit", "$" + fmt(s.netProfit), s.netProfit >= 0 ? C.teal : C.coral),
        Row("Profit Factor", s.profitFactor == null ? "—" : fmt(s.profitFactor, 2)),
        Row("Average Win", "$" + fmt(s.avgWin, 1)),
        Row("Average Loss", "$" + fmt(s.avgLoss, 1)),
        Row("Largest Win", "$" + fmt(s.largestWin, 1)),
        Row("Largest Loss", "$" + fmt(s.largestLoss, 1)),
        Row("Expectancy", "$" + fmt(s.expectancy, 2)),
        Row("Total Return", fmt(s.totalReturnPct * 100, 1) + "%")
      ),
      h("div", { className: "card", style: { padding: 20 } },
        h("div", { style: { fontWeight: 700, marginBottom: 6, color: C.amber, fontSize: 13 } }, "نرخ‌ها و میانگین‌ها"),
        Row("Win Rate", fmt(s.winRate * 100, 1) + "%"),
        Row("Loss Rate", fmt(s.lossRate * 100, 1) + "%"),
        Row("Breakeven Rate", fmt(s.breakevenRate * 100, 1) + "%"),
        Row("میانگین درصد ریسک", fmt(s.avgRiskPercent, 2) + "%"),
        Row("میانگین حجم (لات)", fmt(s.avgLot, 2)),
        Row("میانگین RR معاملات سودده", fmt(s.avgWinRR, 2)),
        Row("میانگین مدت زمان ترید (دقیقه)", fmt(s.avgDurMin, 0)),
        Row("میانگین امتیاز ستاپ", fmt(s.avgSetupScore, 1) + " / 5"),
        Row("میانگین امتیاز اجرا", fmt(s.avgExecScore, 1) + " / 5")
      ),
      h("div", { className: "card", style: { padding: 20 } },
        h("div", { style: { fontWeight: 700, marginBottom: 6, color: C.amber, fontSize: 13 } }, "بالانس و ریسک شناور"),
        Row("بالانس اولیه", "$" + fmt(settings.initialBalance)),
        Row("بالانس اول روز کاری", "$" + fmt(s.dayStartBalance)),
        Row("بالانس فعلی", "$" + fmt(s.currentBalance), s.currentBalance >= settings.initialBalance ? C.teal : C.coral),
        Row("دراودان جاری", fmt(s.currentDD * 100, 1) + "%"),
        Row("حداکثر دراودان ثبت‌شده", fmt(s.maxDD * 100, 1) + "%", C.coral),
        Row("سقف مجاز دراودان کل (۱۲٪ بالانس اولیه)", "$" + fmt(s.maxDrawdownLimit), C.coral),
        Row("سقف مجاز دراودان روز (۵٪ بالانس اول روز)", "$" + fmt(s.dailyDrawdownLimit), C.coral),
        Row("۵۰٪ دراودان روز", "$" + fmt(s.halfDailyDrawdownLimit)),
        Row("سقف ریسک شناور (۳٪ بالانس فعلی)", "$" + fmt(s.floatingRiskLimit), C.amber),
        Row("تارگت مرحله اول (۱۰٪ بالانس اولیه)", "$" + fmt(s.stage1Target), C.teal),
        Row("تارگت مرحله دوم (۵٪ بالانس اولیه)", "$" + fmt(s.stage2Target), C.teal)
      )
    );
  }

  /* =========================================================================
     تب تنظیمات
     ========================================================================= */
  function SettingsTab(props) {
    var state = props.state, setState = props.setState;
    var backupInputRef = React.useRef(null);
    var s0 = useState(String(state.settings.initialBalance)), balVal = s0[0], setBalVal = s0[1];
    var s1 = useState(String(state.settings.defaultRiskPercent)), riskVal = s1[0], setRiskVal = s1[1];
    var s2 = useState(String(state.settings.defaultSpread)), spreadVal = s2[0], setSpreadVal = s2[1];
    var s3 = useState(String(state.settings.defaultCommission)), commVal = s3[0], setCommVal = s3[1];

    function saveGeneral() {
      setState(function (s) {
        return Object.assign({}, s, {
          settings: Object.assign({}, s.settings, {
            initialBalance: parseFloat(balVal) || 10000,
            defaultRiskPercent: parseFloat(riskVal) || 0.4,
            defaultSpread: parseFloat(spreadVal) || 2,
            defaultCommission: parseFloat(commVal) || 4.5,
          })
        });
      });
    }

    var optKeys = Object.keys(state.fieldOptions);
    var optState = useState({}); var optDraft = optState[0], setOptDraft = optState[1];
    function optValue(k) { return optDraft.hasOwnProperty(k) ? optDraft[k] : state.fieldOptions[k].join(", "); }
    function saveOption(k) {
      var list = (optValue(k) || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
      setState(function (s) { return Object.assign({}, s, { fieldOptions: Object.assign({}, s.fieldOptions, (function () { var o = {}; o[k] = list; return o; })()) }); });
    }

    var cfState = useState({ label: "", type: "text", options: "" });
    var cfDraft = cfState[0], setCfDraft = cfState[1];
    function addCustomField() {
      if (!cfDraft.label.trim()) { alert("نام فیلد را وارد کنید."); return; }
      var key = "custom_" + Date.now();
      var field = { key: key, label: cfDraft.label.trim(), type: cfDraft.type, options: cfDraft.type === "select" ? cfDraft.options.split(",").map(function (x) { return x.trim(); }).filter(Boolean) : [] };
      setState(function (s) { return Object.assign({}, s, { customFields: s.customFields.concat([field]) }); });
      setCfDraft({ label: "", type: "text", options: "" });
    }
    function removeCustomField(key) {
      if (!confirm("این فیلد سفارشی حذف شود؟")) return;
      setState(function (s) { return Object.assign({}, s, { customFields: s.customFields.filter(function (c) { return c.key !== key; }) }); });
    }

    function doExportBackup() {
      var json = JSON.stringify(state, null, 2);
      if (hasAPI) window.hwAPI.exportBackup(json).then(function (ok) { if (ok) alert("پشتیبان با موفقیت ذخیره شد."); });
      else {
        var blob = new Blob([json], { type: "application/json" });
        var url = URL.createObjectURL(blob); var a = document.createElement("a"); a.href = url; a.download = "HW-Journal-Backup.json"; a.click(); URL.revokeObjectURL(url);
      }
    }
    function applyImportedBackup(raw) {
      if (!raw) return;
      try {
        var parsed = JSON.parse(raw);
        if (!confirm("بازیابی پشتیبان، تمام داده‌های فعلی را جایگزین می‌کند. ادامه می‌دهید؟")) return;
        setState(function () { return parsed; });
      } catch (e) { alert("فایل پشتیبان معتبر نیست."); }
    }
    function onBackupFileChosen(e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () { applyImportedBackup(reader.result); };
      reader.readAsText(file);
      e.target.value = "";
    }
    function doImportBackup() {
      if (!hasAPI) {
        if (backupInputRef.current) backupInputRef.current.click();
        return;
      }
      window.hwAPI.importBackup().then(function (raw) {
        if (!raw) return;
        try {
          var parsed = JSON.parse(raw);
          if (!confirm("بازیابی پشتیبان، تمام داده‌های فعلی را جایگزین می‌کند. ادامه می‌دهید؟")) return;
          setState(function () { return parsed; });
        } catch (e) { alert("فایل پشتیبان معتبر نیست."); }
      });
    }
    function doExportCSV() {
      var enriched = enrichTrades(state.trades, state.settings.initialBalance);
      var headers = ["شماره", "تاریخ باز", "تاریخ بسته", "ساعت باز", "ساعت بسته", "روز", "سشن", "نماد", "جهت", "لات", "نتیجه", "پیپ", "دلار", "RR", "بالانس", "تگ‌ها"];
      var rows = enriched.map(function (t) {
        return [t.number, t.openDate, t.closeDate, t.openTime, t.closeTime, t.day, t.session, t.symbol, t.direction, t.lot, t.result,
        t.pips != null ? t.pips.toFixed(1) : "", t.dollar != null ? t.dollar.toFixed(2) : "", t.rr != null ? t.rr.toFixed(2) : "", t.balance.toFixed(2), (t.tags || []).join(" ")]
          .map(function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; }).join(",");
      });
      var csv = [headers.join(",")].concat(rows).join("\n");
      if (hasAPI) window.hwAPI.exportCSV(csv).then(function (ok) { if (ok) alert("خروجی CSV ذخیره شد."); });
      else {
        var blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        var url = URL.createObjectURL(blob); var a = document.createElement("a"); a.href = url; a.download = "HW-Journal-Export.csv"; a.click(); URL.revokeObjectURL(url);
      }
    }
    function resetAll() {
      if (!confirm("تمام معاملات و تنظیمات حذف و به حالت اولیه بازمی‌گردد. مطمئن هستید؟")) return;
      setState(function () { return defaultState(); });
    }

    return h("div", { className: "fade-up", style: { display: "flex", flexDirection: "column", gap: 16, maxWidth: 900 } },
      h("div", { className: "card", style: { padding: 22 } },
        h("div", { style: { fontSize: 15, fontWeight: 700, marginBottom: 6 } }, "تنظیمات کلی"),
        h("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 16, background: "var(--panel-alt)", borderRadius: 8, padding: "8px 12px" } },
          h("span", { style: { fontWeight: 700, color: C.amber } }, "$ USD"),
          h("span", { style: { fontSize: 11, color: "var(--text-muted)" }, title: "برای جلوگیری از خطا در محاسبات، واحد پول این نرم‌افزار همیشه دلار آمریکا (USD) است و قابل تغییر نیست." },
            "واحد پول ثابت روی دلار آمریکاست و برای جلوگیری از خطای محاسباتی قابل تغییر نیست.")
        ),
        h(Grid, { cols: 2 },
          h(Field, { label: "بالانس اولیه ($)" }, h("input", { type: "number", className: "mono", value: balVal, onChange: function (e) { setBalVal(e.target.value); } })),
          h(Field, { label: "درصد ریسک پیش‌فرض (%)" }, h("input", { type: "number", step: "0.1", className: "mono", value: riskVal, onChange: function (e) { setRiskVal(e.target.value); } })),
          h(Field, { label: "اسپرد پیش‌فرض (پیپ)" }, h("input", { type: "number", step: "0.1", className: "mono", value: spreadVal, onChange: function (e) { setSpreadVal(e.target.value); } })),
          h(Field, { label: "کمیسیون پیش‌فرض (هر لات)" }, h("input", { type: "number", step: "0.1", className: "mono", value: commVal, onChange: function (e) { setCommVal(e.target.value); } }))
        ),
        h("button", { style: Object.assign({}, btnPrimary, { marginTop: 12 }), onClick: saveGeneral }, "ذخیره‌ی تنظیمات کلی")
      ),

      h("div", { className: "card", style: { padding: 22 } },
        h("div", { style: { fontSize: 15, fontWeight: 700, marginBottom: 4 } }, "مدیریت فیلدها و گزینه‌های کشویی"),
        h("div", { style: { fontSize: 11.5, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.8 } }, "گزینه‌های هر فیلد کشویی را با ویرگول (,) از هم جدا کنید و سپس ذخیره بزنید."),
        h("div", { style: { display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, overflowY: "auto" } },
          optKeys.map(function (k) {
            return h("div", { key: k, style: { display: "flex", gap: 8, alignItems: "center" } },
              h("div", { style: { width: 160, fontSize: 12, color: "var(--text-muted)", flexShrink: 0 } }, k),
              h("input", { style: { flex: 1, background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", color: "var(--text)", fontSize: 12 }, value: optValue(k), onChange: function (e) { setOptDraft(Object.assign({}, optDraft, (function () { var o = {}; o[k] = e.target.value; return o; })())); } }),
              h("button", { style: Object.assign({}, smallBtn, { flexShrink: 0 }), onClick: function () { saveOption(k); } }, "ذخیره")
            );
          })
        )
      ),

      h("div", { className: "card", style: { padding: 22 } },
        h("div", { style: { fontSize: 15, fontWeight: 700, marginBottom: 4 } }, "افزودن فیلد سفارشی جدید"),
        h("div", { style: { fontSize: 11.5, color: "var(--text-muted)", marginBottom: 14 } }, "فیلد جدید در فرم ثبت معامله و جدول معاملات نمایش داده می‌شود."),
        h(Grid, { cols: 3 },
          h(Field, { label: "نام فیلد" }, h("input", { value: cfDraft.label, onChange: function (e) { setCfDraft(Object.assign({}, cfDraft, { label: e.target.value })); } })),
          h(Field, { label: "نوع فیلد" }, h("select", { value: cfDraft.type, onChange: function (e) { setCfDraft(Object.assign({}, cfDraft, { type: e.target.value })); } },
            h("option", { value: "text" }, "متن"), h("option", { value: "number" }, "عدد"), h("option", { value: "select" }, "کشویی"))),
          cfDraft.type === "select" ? h(Field, { label: "گزینه‌ها (با ویرگول)" }, h("input", { value: cfDraft.options, onChange: function (e) { setCfDraft(Object.assign({}, cfDraft, { options: e.target.value })); } })) : h("div", null)
        ),
        h("button", { style: btnPrimary, onClick: addCustomField }, "+ افزودن فیلد"),
        state.customFields.length > 0 ? h("div", { style: { marginTop: 16, display: "flex", flexDirection: "column", gap: 6 } },
          state.customFields.map(function (cf) {
            return h("div", { key: cf.key, style: { display: "flex", justifyContent: "space-between", fontSize: 12, borderTop: "1px solid var(--border-soft)", padding: "8px 0" } },
              h("span", null, cf.label, " (", cf.type, ")"),
              h("button", { style: smallBtnCoral, onClick: function () { removeCustomField(cf.key); } }, "حذف"));
          })
        ) : null
      ),

      h("div", { className: "card", style: { padding: 22 } },
        h("div", { style: { fontSize: 15, fontWeight: 700, marginBottom: 14 } }, "پشتیبان‌گیری و خروجی"),
        !hasAPI ? h("input", { ref: backupInputRef, type: "file", accept: "application/json,.json", style: { display: "none" }, onChange: onBackupFileChosen }) : null,
        h("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" } },
          h("button", { style: btnGhost, onClick: doExportCSV }, "خروجی CSV"),
          h("button", { style: btnGhost, onClick: doExportBackup }, "ذخیره پشتیبان کامل (JSON)"),
          h("button", { style: btnGhost, onClick: doImportBackup }, "بازیابی از پشتیبان")
        )
      ),

      h("div", { className: "card", style: { padding: 22, border: "1px solid " + C.coral } },
        h("div", { style: { fontSize: 15, fontWeight: 700, marginBottom: 10, color: C.coral } }, "منطقه خطر"),
        h("button", { style: Object.assign({}, btnGhost, { color: C.coral, borderColor: C.coral }), onClick: resetAll }, "بازنشانی کامل داده‌ها")
      ),

      h("div", { style: { fontSize: 11, color: "var(--text-faint)", lineHeight: 1.9, padding: "0 4px" } },
        hasAPI ? "همه‌ی داده‌ها و تصاویر شما به‌صورت محلی روی همین کامپیوتر ذخیره می‌شوند — نیازی به اینترنت یا سرور نیست." : "همه‌ی داده‌ها و تصاویر شما به‌صورت محلی روی همین گوشی ذخیره می‌شوند — نیازی به اینترنت نیست. برای اطمینان، هر چند وقت یک‌بار از «پشتیبان‌گیری» استفاده کنید.")
    );
  }

  /* =========================================================================
     برنامه‌ی اصلی
     ========================================================================= */
  function App() {
    var s0 = useState(null), state = s0[0], setState = s0[1];
    var s1 = useState(false), showForm = s1[0], setShowForm = s1[1];
    var s2 = useState(null), editTrade = s2[0], setEditTrade = s2[1];
    var s3 = useState("dashboard"), tab = s3[0], setTab = s3[1];
    var s4 = useState(false), loaded = s4[0], setLoaded = s4[1];

    useEffect(function () {
      loadStateAsync(function (loadedState) {
        setState(loadedState || defaultState());
        setLoaded(true);
      });
    }, []);

    useEffect(function () {
      if (loaded && state) persistState(state);
    }, [state, loaded]);

    useEffect(function () {
      if (state) document.documentElement.setAttribute("data-theme", state.theme || "dark");
    }, [state && state.theme]);

    var enriched = useMemo(function () {
      if (!state) return [];
      return enrichTrades(state.trades, state.settings.initialBalance);
    }, [state]);
    var stats = useMemo(function () {
      if (!state) return computeStats([], 0);
      return computeStats(enriched, state.settings.initialBalance);
    }, [enriched, state]);

    if (!state) {
      return h("div", { style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" } }, "در حال بارگذاری...");
    }

    function saveTrade(trade) {
      setState(function (s) {
        var exists = s.trades.some(function (t) { return t.id === trade.id; });
        var trades = exists ? s.trades.map(function (t) { return t.id === trade.id ? trade : t; }) : s.trades.concat([trade]);
        return Object.assign({}, s, { trades: trades });
      });
      setShowForm(false); setEditTrade(null);
    }
    function deleteTrade(id) {
      if (!confirm("این معامله حذف بشه؟")) return;
      setState(function (s) { return Object.assign({}, s, { trades: s.trades.filter(function (t) { return t.id !== id; }) }); });
    }
    function openNew() {
      setEditTrade(Object.assign(emptyTrade(state.settings, state.fieldOptions), { balanceBeforeEntry: String(Math.round(stats.currentBalance)) }));
      setShowForm(true);
    }
    function openEdit(t) {
      setEditTrade(Object.assign({}, t, { __editing: true }));
      setShowForm(true);
    }
    function toggleTheme() {
      setState(function (s) { return Object.assign({}, s, { theme: s.theme === "dark" ? "light" : "dark" }); });
    }

    var TABS = [["dashboard", "داشبورد"], ["trades", "معاملات"], ["accountBook", "حساب کتاب"], ["settings", "تنظیمات"]];

    return h("div", { style: { minHeight: "100vh", display: "flex", flexDirection: "column" } },
      h("div", { style: { borderBottom: "1px solid var(--border)", background: "linear-gradient(180deg, var(--panel), var(--bg))" } },
        h("div", { style: { maxWidth: 1320, margin: "0 auto", padding: "18px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }, className: "fade-up" },
          h("div", { style: { display: "flex", alignItems: "center", gap: 12 } },
            h(Logo, { size: 40 }),
            h("div", null,
              h("div", { style: { fontSize: 10, letterSpacing: 2, color: C.amber, marginBottom: 2 } }, "WINDOWS DESKTOP · نسخه‌ی محلی"),
              h("h1", { style: { fontSize: 22, fontWeight: 800, margin: 0 } }, "HW Journal"))
          ),
          h("div", { style: { display: "flex", gap: 10, alignItems: "center" } },
            h(SunMoonToggle, { theme: state.theme, onToggle: toggleTheme }),
            h("button", { onClick: openNew, style: btnPrimary }, "+ ثبت معامله")
          )
        ),
        h("div", { style: { maxWidth: 1320, margin: "0 auto", padding: "14px 24px 0", display: "flex", gap: 4 } },
          TABS.map(function (tt) {
            return h("button", { key: tt[0], className: "tab-btn" + (tab === tt[0] ? " active" : ""), onClick: function () { setTab(tt[0]); } }, tt[1]);
          })
        )
      ),
      h("div", { style: { maxWidth: 1320, margin: "0 auto", padding: "22px 24px 40px", flex: 1, width: "100%" } },
        tab === "dashboard" ? h(Dashboard, { stats: stats, enriched: enriched, initialBalance: state.settings.initialBalance }) : null,
        tab === "trades" ? h(TradesTab, { enriched: enriched, onEdit: openEdit, onDelete: deleteTrade, customFields: state.customFields }) : null,
        tab === "accountBook" ? h(AccountBookTab, { stats: stats, settings: state.settings }) : null,
        tab === "settings" ? h(SettingsTab, { state: state, setState: setState }) : null
      ),
      h("div", { style: { borderTop: "1px solid var(--border)", padding: "14px 24px", textAlign: "center", fontSize: 12, color: "var(--text-faint)" } },
        "HW Journal — ساخته شده توسط ", h("span", { style: { color: C.amber, fontWeight: 700 } }, "@hw4rex")
      ),
      showForm ? h(TradeForm, {
        initial: editTrade || emptyTrade(state.settings, state.fieldOptions),
        fieldOptions: state.fieldOptions, customFields: state.customFields,
        onCancel: function () { setShowForm(false); setEditTrade(null); },
        onSave: saveTrade
      }) : null
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(h(App));

  // نکته: این بخش فقط برای تست خودکار در Node.js استفاده می‌شود و در Electron/مرورگر
  // اجرا نمی‌شود چون در آنجا 'module' تعریف نشده است و هیچ تاثیری روی برنامه ندارد.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      computeCore: computeCore, enrichTrades: enrichTrades, computeStats: computeStats,
      dayFromDate: dayFromDate, sessionFromTime: sessionFromTime, isMyTimeCalc: isMyTimeCalc,
      computeDuration: computeDuration, emptyTrade: emptyTrade, defaultState: defaultState,
      App: App, Dashboard: Dashboard, TradesTab: TradesTab, AccountBookTab: AccountBookTab,
      SettingsTab: SettingsTab, TradeForm: TradeForm, cloneOptions: cloneOptions,
      defaultSettings: defaultSettings, seedTrades: seedTrades,
    };
  }
})();
