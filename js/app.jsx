/**
 * Heritage Lake Advisors — Market Timing Simulator
 * React UI Components
 *
 * Dependencies (loaded via CDN in index.html):
 *   React 18, ReactDOM, Recharts, prop-types, react-is
 *
 * Data dependencies (loaded in index.html before this file):
 *   window.RAW_DAILY, window.DY (from data.json)
 *   simulation.js (simulate, rollingAnalysis, buildDaily, etc.)
 */

const {useState, useMemo, useEffect} = React;
const {Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine, Legend, ComposedChart} = Recharts;

// ─── UI Components ──────────────────────────────────────────

function Sld({label, value, onChange, min, max, step, color, suffix, format, T}) {
  return (
    <div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6}}>
        <label style={{fontSize:12.5, fontWeight:600, color:T.text, fontFamily:FA}}>{label}</label>
        <span style={{fontFamily:FM, fontSize:14, fontWeight:700, color, minWidth:44, textAlign:"right"}}>
          {format ? format(value) : value + (suffix || "")}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
             onChange={e => onChange(+e.target.value)} style={{background:T.slider}}/>
      <div style={{display:"flex", justifyContent:"space-between", fontSize:9.5, color:T.textMuted, marginTop:3}}>
        <span>{min}{suffix}</span><span>{max}{suffix}</span>
      </div>
    </div>
  );
}

function Tog({label, checked, onChange, color, T}) {
  const c = color || T.gold;
  return (
    <label style={{display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:12.5, fontWeight:500, color:T.text, fontFamily:FA}}>
      <div onClick={() => onChange(!checked)}
           style={{width:36, height:20, borderRadius:10, position:"relative",
                   background:checked ? c : T.navyDark, transition:"background 0.2s",
                   flexShrink:0, border:`1px solid ${checked ? c : T.navyDark}`}}>
        <div style={{width:16, height:16, borderRadius:8, background:T.thumbBg,
                     position:"absolute", top:1, left:checked ? 17 : 1,
                     transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
      </div>
      {label}
    </label>
  );
}

function Rad({label, options, value, onChange, color, T}) {
  return (
    <div>
      <div style={{fontSize:12.5, fontWeight:600, color:T.text, fontFamily:FA, marginBottom:8}}>{label}</div>
      <div style={{display:"flex", gap:6}}>
        {options.map(o => (
          <button key={o.value} onClick={() => onChange(o.value)}
                  style={{padding:"6px 14px", borderRadius:6, fontSize:13, fontFamily:FM,
                          fontWeight:600, cursor:"pointer", border:"1px solid",
                          background:value === o.value ? color + "22" : "transparent",
                          color:value === o.value ? color : T.textMuted,
                          borderColor:value === o.value ? color + "66" : T.navyDark,
                          transition:"all 0.15s"}}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CTip({active, payload, T}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{background:T.bgCard + "f5", border:`1px solid ${T.gold}33`,
                 borderRadius:8, padding:"8px 12px", fontSize:12.5, lineHeight:1.7, color:T.text}}>
      <div style={{fontWeight:600, color:T.gold, marginBottom:2, fontFamily:FS, fontSize:12}}>{fmD(d.date)}</div>
      {payload.filter(p => p.dataKey !== "sellMark" && p.dataKey !== "buyMark").map((p, i) => (
        <div key={i} style={{display:"flex", gap:6, alignItems:"center"}}>
          <span style={{width:8, height:8, borderRadius:2, background:p.color, display:"inline-block"}}/>
          <span style={{color:T.textSec}}>{p.name}:</span>
          <span style={{fontWeight:700, color:p.color, fontFamily:FM}}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function rDot(props, type, T) {
  const {cx, cy, payload} = props;
  const val = type === "sell" ? payload.sellMark : payload.buyMark;
  if (val == null || cx == null || cy == null) return null;
  const s = type === "sell";
  return (
    <g key={`${type}-${payload.date}`}>
      <polygon
        points={s ? `${cx},${cy+10} ${cx-6},${cy} ${cx+6},${cy}` : `${cx},${cy-10} ${cx-6},${cy} ${cx+6},${cy}`}
        fill={s ? T.red : T.green}
        stroke={s ? "#8b3a30" : "#3d7a5a"}
        strokeWidth={1} opacity={0.9}/>
    </g>
  );
}

// ─── Main Application ───────────────────────────────────────

function App() {
  // Theme
  const [dark, setDark] = useState(true);
  const T = dark ? THEMES.dark : THEMES.light;

  // Strategy parameters
  const [sellPct, sSP]   = useState(10);
  const [buyPct, sBP]    = useState(8);
  const [minDays, sMD]   = useState(60);
  const [cashRate, sCR]  = useState(2);
  const [buyStrategy, setBuyStrategy] = useState("pctOffLow"); // "pctOffLow" | "backToExit" | "newHigh"

  // Tax rates
  const [stRate, sST]    = useState(37);
  const [ltRate, sLT]    = useState(20);
  const [niit, sN]       = useState(true);

  // Display options
  const [reinvestDivs, sRD] = useState(true);
  const [logScale, sLS]     = useState(true);
  const [startYear, sSY]    = useState(1975);

  // Build daily data (only changes when start year changes)
  const daily = useMemo(() => buildDaily(RAW_DAILY, startYear), [startYear]);

  // Run simulation — recalculates on every parameter change
  const sim = useMemo(
    () => simulate(daily, {
      sellPct, buyPct, minDays, cashRate, stRate, ltRate, niit, reinvestDivs, buyStrategy
    }),
    [daily, sellPct, buyPct, minDays, cashRate, stRate, ltRate, niit, reinvestDivs, buyStrategy]
  );

  const {dayResults, events, taxPaid, basis, unrealized,
         bhPostTax, bhTax, pPostTax, pTax, pUnrealizedTax,
         totalDaysOut, avgDaysOut, bhMaxDD, pMaxDD,
         missed10, missed20, missed30, missedList, avoided20} = sim;

  // Rolling analysis state
  const [rollingYrs, sRY]       = useState(20);
  const allDaily                = useMemo(() => buildDaily(RAW_DAILY, 1975), []);
  const [rolling, setRolling]   = useState(null);
  const [rollingStale, setRollingStale] = useState(true);

  const runRolling = (yrs) => {
    const y = yrs || rollingYrs;
    setRolling(rollingAnalysis(allDaily, {
      sellPct, buyPct, minDays, cashRate, stRate, ltRate, niit, reinvestDivs, buyStrategy
    }, y));
    setRollingStale(false);
  };

  const changeRollingYrs = (y) => {
    sRY(y);
    setRolling(rollingAnalysis(allDaily, {
      sellPct, buyPct, minDays, cashRate, stRate, ltRate, niit, reinvestDivs, buyStrategy
    }, y));
    setRollingStale(false);
  };

  useEffect(() => { setRollingStale(true); },
    [sellPct, buyPct, minDays, cashRate, stRate, ltRate, niit, reinvestDivs, buyStrategy]);

  // Chart data: sample monthly + overlay buy/sell markers
  const chartData = useMemo(() => {
    const mo = samMo(dayResults);
    const sM = new Map(), bM = new Map();
    events.forEach(e => {
      const k = e.date.slice(0, 7);
      (e.type === "sell" ? sM : bM).set(k, e.val);
    });
    return mo.map(d => {
      const k = d.date.slice(0, 7);
      return {...d, sellMark:sM.get(k) || null, buyMark:bM.get(k) || null};
    });
  }, [dayResults, events]);

  // Map recessions to actual chart dates
  const recBands = useMemo(() => mapRecessions(chartData, startYear), [chartData, startYear]);

  // Derived stats
  const last    = dayResults[dayResults.length - 1];
  const years   = (new Date(daily[daily.length-1].date) - new Date(daily[0].date)) / 31557600000;
  const bhCagr  = Math.pow(last.bh / INI, 1 / years) - 1;
  const pCagr   = Math.pow(last.portfolio / INI, 1 / years) - 1;
  const diff    = pPostTax - bhPostTax;
  const sells   = events.filter(e => e.type === "sell").length;
  const buys    = events.filter(e => e.type === "buy").length;
  const pC      = diff >= 0 ? T.green : T.red;
  const eLt     = ltRate + (niit ? 3.8 : 0);
  const ms      = {color:T.textMuted, fontSize:11};
  const vs      = c => ({fontFamily:FM, fontWeight:600, fontSize:12, color:c});
  const pO      = daily.length > 0 ? (totalDaysOut / daily.length * 100).toFixed(1) : "0.0";

  // ─── Render ─────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh", background:T.bg, color:T.text, fontFamily:FA,
                 padding:"20px 16px", transition:"background 0.3s,color 0.3s"}}>
      <div style={{maxWidth:960, margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:"flex", alignItems:"center", gap:14, marginBottom:6}}>
          <img src={T.logo} alt="Heritage Lake Advisors" style={{height:48, width:"auto"}}/>
          <div style={{flex:1}}>
            <h1 style={{fontSize:18, fontWeight:700, margin:0, fontFamily:FS, color:T.text}}>
              Growth of $100K — Market Timing Analysis
            </h1>
          </div>
          <button onClick={() => setDark(!dark)}
                  style={{display:"flex", alignItems:"center", gap:6, padding:"5px 12px",
                          borderRadius:20, border:`1px solid ${T.border}`, background:T.bgCard,
                          cursor:"pointer", fontSize:12, color:T.textSec, fontFamily:FA}}>
            <span style={{fontSize:15}}>{dark ? "☀️" : "🌙"}</span>{dark ? "Light" : "Dark"}
          </button>
        </div>

        {/* Subtitle bar */}
        <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:20, paddingBottom:14,
                     borderBottom:`1px solid ${T.border}`, flexWrap:"wrap"}}>
          <span style={{fontSize:12, color:T.textSec}}>
            S&P 500 · {startYear} – {daily[daily.length-1].date.slice(0,4)} · {daily.length.toLocaleString()} trading days
            {reinvestDivs ? " · Dividends reinvested" : ""}
          </span>
          <div style={{marginLeft:"auto", display:"flex", alignItems:"center", gap:6}}>
            <span style={{fontSize:11, color:T.textMuted, fontWeight:600}}>Start:</span>
            <select value={startYear} onChange={e => sSY(+e.target.value)}
                    style={{background:T.bgCard, color:T.gold, border:`1px solid ${T.gold}44`,
                            borderRadius:6, padding:"4px 8px", fontSize:13, fontFamily:FM, cursor:"pointer"}}>
              {SYS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10}}>
          {/* Buy & Hold Card */}
          <div style={{background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:12, padding:"14px 16px"}}>
            <div style={{fontSize:10.5, textTransform:"uppercase", letterSpacing:"0.08em", color:T.gold, fontWeight:600, marginBottom:6, fontFamily:FA}}>Buy & Hold</div>
            <div style={{fontFamily:FM, fontSize:24, fontWeight:700, color:T.text, lineHeight:1.1}}>{fmt(last.bh)}</div>
            <div style={{display:"flex", gap:12, marginTop:8, flexWrap:"wrap"}}>
              <span><span style={ms}>Total </span><span style={vs(T.gold)}>{pct((last.bh-INI)/INI)}</span></span>
              <span><span style={ms}>CAGR </span><span style={vs(T.gold)}>{pct(bhCagr)}</span></span>
              <span><span style={ms}>Max DD </span><span style={vs(T.red)}>{(bhMaxDD*100).toFixed(1)}%</span></span>
            </div>
            <div style={{marginTop:8, paddingTop:8, borderTop:`1px solid ${T.borderSub}`}}>
              <div style={{display:"flex", gap:12, flexWrap:"wrap"}}>
                <span><span style={ms}>If sold </span><span style={vs(T.goldBright)}>{fmt(bhPostTax)}</span></span>
                <span><span style={ms}>Tax </span><span style={vs(T.red)}>{fmt(bhTax)}</span></span>
                <span><span style={ms}>Rate </span><span style={vs(T.textSec)}>{eLt.toFixed(1)}%</span></span>
              </div>
            </div>
          </div>

          {/* Timing Portfolio Card */}
          <div style={{background:T.bgCard, border:`1px solid ${diff >= 0 ? T.green + "22" : T.red + "22"}`, borderRadius:12, padding:"14px 16px"}}>
            <div style={{fontSize:10.5, textTransform:"uppercase", letterSpacing:"0.08em", color:pC, fontWeight:600, marginBottom:6, fontFamily:FA}}>Your Portfolio</div>
            <div style={{fontFamily:FM, fontSize:24, fontWeight:700, color:T.text, lineHeight:1.1}}>{fmt(last.portfolio)}</div>
            <div style={{display:"flex", gap:12, marginTop:8, flexWrap:"wrap"}}>
              <span><span style={ms}>Total </span><span style={vs(pC)}>{pct((last.portfolio-INI)/INI)}</span></span>
              <span><span style={ms}>CAGR </span><span style={vs(pC)}>{pct(pCagr)}</span></span>
              <span><span style={ms}>Max DD </span><span style={vs(pMaxDD < bhMaxDD ? T.sage : T.red)}>{(pMaxDD*100).toFixed(1)}%</span></span>
            </div>
            <div style={{marginTop:8, paddingTop:8, borderTop:`1px solid ${T.borderSub}`}}>
              <div style={{display:"flex", gap:12, flexWrap:"wrap"}}>
                <span><span style={ms}>If sold </span><span style={vs(pC)}>{fmt(pPostTax)}</span></span>
                <span><span style={ms}>Tax </span><span style={vs(T.red)}>{fmt(pTax)}</span></span>
                <span><span style={ms}>Rate </span><span style={vs(T.textSec)}>{eLt.toFixed(1)}%</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison bar */}
        <div style={{textAlign:"center", padding:"6px 0 12px", fontSize:12, fontFamily:FM,
                     display:"flex", justifyContent:"center", gap:6, flexWrap:"wrap"}}>
          <span style={{color:pC}}>{diff >= 0 ? "▲" : "▼"} {fmt(Math.abs(diff))} {diff >= 0 ? "ahead" : "behind"} after tax</span>
          <span style={{color:T.navyDark}}>·</span>
          <span style={{color:T.textSec}}>{sells} sells, {buys} buys</span>
          <span style={{color:T.navyDark}}>·</span>
          <span style={{color:T.goldDim}}>{totalDaysOut.toLocaleString()} days out ({pO}%)</span>
          <span style={{color:T.navyDark}}>·</span>
          <span style={{color:T.goldDim}}>avg {avgDaysOut} days/exit</span>
        </div>

        {/* Best/Worst days bar */}
        <div style={{textAlign:"center", padding:"0 0 14px", fontSize:11.5, fontFamily:FM,
                     display:"flex", justifyContent:"center", gap:6, flexWrap:"wrap"}}>
          <span style={{color:T.red}}>Missed {missed10} of 10 best days</span>
          <span style={{color:T.navyDark}}>·</span>
          <span style={{color:T.red}}>Missed {missed20} of 20 best</span>
          <span style={{color:T.navyDark}}>·</span>
          <span style={{color:T.sage}}>Avoided {avoided20} of 20 worst</span>
        </div>

        {/* ═══ Main Chart ═══ */}
        <div style={{background:T.bgPanel, border:`1px solid ${T.border}`, borderRadius:12, padding:"14px 4px 6px 0", marginBottom:16}}>
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart data={chartData} margin={{top:8, right:14, bottom:4, left:6}}>
              {recBands.map(([s,e], i) => (
                <ReferenceArea key={"rec"+i} x1={s} x2={e} fill={T.recFill} fillOpacity={T.recOp}
                               stroke={T.recFill} strokeOpacity={0.2} ifOverflow="visible"/>
              ))}
              <XAxis dataKey="date" tick={{fontSize:10.5, fill:T.textMuted}}
                     tickFormatter={d => d.slice(0,4)}
                     interval={Math.max(1, Math.round(chartData.length/10))}
                     axisLine={{stroke:T.axLine}} tickLine={false}/>
              <YAxis tick={{fontSize:10.5, fill:T.textMuted}} tickLine={false}
                     axisLine={{stroke:T.axLine}} width={68}
                     tickFormatter={v => v >= 1e6 ? (v/1e6).toFixed(1)+"M" : v >= 1e3 ? (v/1e3).toFixed(0)+"K" : v}
                     {...(logScale ? {scale:"log", domain:["auto","auto"]} : {})}/>
              <Tooltip content={<CTip T={T}/>}/>
              <ReferenceLine y={INI} stroke={T.gold} strokeDasharray="4 4" strokeOpacity={0.3}/>
              <Line type="monotone" dataKey="bh" name="Buy & Hold" stroke={T.gold}
                    strokeWidth={2.2} dot={false} isAnimationActive={false}/>
              <Line type="monotone" dataKey="portfolio" name="Your Portfolio" stroke={pC}
                    strokeWidth={2.2} dot={false} isAnimationActive={false}/>
              <Line type="monotone" dataKey="sellMark" stroke="none" legendType="none"
                    isAnimationActive={false} dot={p => rDot(p,"sell",T)} activeDot={false}/>
              <Line type="monotone" dataKey="buyMark" stroke="none" legendType="none"
                    isAnimationActive={false} dot={p => rDot(p,"buy",T)} activeDot={false}/>
              <Legend wrapperStyle={{fontSize:11, paddingTop:6, fontFamily:FA}} iconType="line"
                     payload={[
                       {value:"Buy & Hold", type:"line", color:T.gold},
                       {value:"Your Portfolio", type:"line", color:pC},
                       {value:"Sell", type:"triangle", color:T.red},
                       {value:"Buy", type:"triangle", color:T.green},
                       {value:"Recession", type:"square", color:T.recFill}
                     ]}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* ═══ Controls Panel ═══ */}
        <div style={{background:T.bgPanel, border:`1px solid ${T.border}`, borderRadius:12, padding:"16px 20px"}}>
          <div style={{display:"flex", gap:24, marginBottom:16, flexWrap:"wrap"}}>
            <Tog label="Reinvest Dividends" checked={reinvestDivs} onChange={sRD} color={T.sage} T={T}/>
            <Tog label="Log Scale" checked={logScale} onChange={sLS} color={T.gold} T={T}/>
          </div>

          <div style={{fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", color:T.textMuted,
                       fontWeight:600, marginBottom:12, paddingTop:8, borderTop:`1px solid ${T.borderSub}`}}>
            Strategy Parameters
          </div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px 28px", marginBottom:20}}>
            <Sld label="Sell: % Off Highs"          value={sellPct}  onChange={sSP} min={1}   max={50}  step={1}   color={T.red}        suffix="%" T={T}/>
            <div>
              <Rad label="Re-Entry Strategy" options={[
                {label:"% Off Low", value:"pctOffLow"},
                {label:"Back to Exit", value:"backToExit"},
                {label:"New High", value:"newHigh"}
              ]} value={buyStrategy} onChange={setBuyStrategy} color={T.green} T={T}/>
              {buyStrategy === "pctOffLow" && (
                <div style={{marginTop:14}}>
                  <Sld label="Buy: % Off Post-Sale Low" value={buyPct} onChange={sBP} min={1} max={50} step={1} color={T.green} suffix="%" T={T}/>
                </div>
              )}
              {buyStrategy === "backToExit" && (
                <div style={{marginTop:10, fontSize:11, color:T.textMuted, fontStyle:"italic", lineHeight:1.5}}>
                  Re-enters when price recovers to the sell price
                </div>
              )}
              {buyStrategy === "newHigh" && (
                <div style={{marginTop:10, fontSize:11, color:T.textMuted, fontStyle:"italic", lineHeight:1.5}}>
                  Re-enters when market makes a new all-time high
                </div>
              )}
            </div>
            <Sld label="Min Days Before Re-Entry"    value={minDays}  onChange={sMD} min={0}   max={365} step={5}   color={T.sage}       suffix="d" T={T}/>
            <Sld label="Cash Interest Rate"          value={cashRate} onChange={sCR} min={0}   max={5}   step={0.1} color={T.goldBright} suffix="%" format={v => v.toFixed(1)+"%"} T={T}/>
          </div>

          <div style={{fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", color:T.textMuted,
                       fontWeight:600, marginBottom:12, paddingTop:8, borderTop:`1px solid ${T.borderSub}`}}>
            Tax Rates
          </div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px 28px"}}>
            <Sld label="Short-Term Cap Gains (<1yr)" value={stRate} onChange={sST} min={0} max={50} step={1} color={T.red} suffix="%" T={T}/>
            <div>
              <Rad label="Long-Term Cap Gains (≥1yr)"
                   options={[{label:"0%",value:0},{label:"15%",value:15},{label:"20%",value:20}]}
                   value={ltRate} onChange={sLT} color={T.gold} T={T}/>
              <div style={{marginTop:10}}>
                <Tog label={<span>+3.8% NIIT <span style={{fontSize:10, color:T.textMuted}}>(net investment income)</span></span>}
                     checked={niit} onChange={sN} color={T.gold} T={T}/>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Insights Panel ═══ */}
        <div style={{background:T.bgPanel, border:`1px solid ${T.border}`, borderRadius:12, padding:"16px 20px", marginTop:16}}>
          <div style={{fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", color:T.gold, fontWeight:600, marginBottom:14}}>
            Market Timing Insights
          </div>

          {/* Best/Worst Days */}
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16}}>
            {/* Best Days Missed */}
            <div style={{background:T.bgCard, borderRadius:10, padding:"12px 14px", border:`1px solid ${T.border}`}}>
              <div style={{fontSize:11, fontWeight:600, color:T.red, marginBottom:8, fontFamily:FA}}>Best Days Missed While in Cash</div>
              <div style={{display:"flex", gap:16, marginBottom:8}}>
                <div><div style={{fontSize:22, fontWeight:700, fontFamily:FM, color:T.text}}>{missed10}<span style={{fontSize:13, color:T.textMuted}}>/{10}</span></div><div style={{fontSize:9.5, color:T.textMuted}}>Top 10 days</div></div>
                <div><div style={{fontSize:22, fontWeight:700, fontFamily:FM, color:T.text}}>{missed20}<span style={{fontSize:13, color:T.textMuted}}>/{20}</span></div><div style={{fontSize:9.5, color:T.textMuted}}>Top 20 days</div></div>
                <div><div style={{fontSize:22, fontWeight:700, fontFamily:FM, color:T.text}}>{missed30}<span style={{fontSize:13, color:T.textMuted}}>/{30}</span></div><div style={{fontSize:9.5, color:T.textMuted}}>Top 30 days</div></div>
              </div>
              {missedList.length > 0 && (
                <div style={{borderTop:`1px solid ${T.borderSub}`, paddingTop:8, maxHeight:120, overflowY:"auto"}}>
                  <div style={{fontSize:9.5, color:T.textMuted, marginBottom:4}}>Missed best days:</div>
                  {missedList.map((d, i) => (
                    <div key={i} style={{display:"flex", justifyContent:"space-between", fontSize:11, fontFamily:FM, padding:"1px 0"}}>
                      <span style={{color:T.textSec}}>{fmD(d.date)}</span>
                      <span style={{color:T.green, fontWeight:600}}>+{(d.ret*100).toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              )}
              {missedList.length === 0 && (
                <div style={{fontSize:11, color:T.sage, fontStyle:"italic"}}>No top-20 days missed — strategy was invested</div>
              )}
            </div>

            {/* Worst Days Avoided */}
            <div style={{background:T.bgCard, borderRadius:10, padding:"12px 14px", border:`1px solid ${T.border}`}}>
              <div style={{fontSize:11, fontWeight:600, color:T.sage, marginBottom:8, fontFamily:FA}}>Worst Days Avoided While in Cash</div>
              <div>
                <div style={{fontSize:22, fontWeight:700, fontFamily:FM, color:T.text}}>
                  {avoided20}<span style={{fontSize:13, color:T.textMuted}}>/{20}</span>
                </div>
                <div style={{fontSize:9.5, color:T.textMuted, marginBottom:10}}>of 20 worst days avoided</div>
              </div>
              <div style={{borderTop:`1px solid ${T.borderSub}`, paddingTop:8}}>
                <div style={{fontSize:11, color:T.textSec, lineHeight:1.7}}>
                  <div><span style={{fontWeight:600, color:T.gold}}>Max Drawdown Comparison</span></div>
                  <div style={{display:"flex", gap:16, marginTop:6}}>
                    <div><div style={{fontSize:18, fontWeight:700, fontFamily:FM, color:T.red}}>{(bhMaxDD*100).toFixed(1)}%</div><div style={{fontSize:9.5, color:T.textMuted}}>Buy & Hold</div></div>
                    <div><div style={{fontSize:18, fontWeight:700, fontFamily:FM, color:pMaxDD < bhMaxDD ? T.sage : T.red}}>{(pMaxDD*100).toFixed(1)}%</div><div style={{fontSize:9.5, color:T.textMuted}}>Timing Strategy</div></div>
                    <div><div style={{fontSize:18, fontWeight:700, fontFamily:FM, color:bhMaxDD > pMaxDD ? T.sage : T.red}}>{((bhMaxDD-pMaxDD)*100).toFixed(1)}pp</div><div style={{fontSize:9.5, color:T.textMuted}}>{bhMaxDD > pMaxDD ? "reduction" : "increase"}</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rolling Analysis */}
          <div style={{borderTop:`1px solid ${T.borderSub}`, paddingTop:14}}>
            <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:12}}>
              <span style={{fontSize:11, fontWeight:600, color:T.gold, fontFamily:FA}}>Rolling Period Analysis</span>
              <div style={{display:"flex", gap:4}}>
                {[10,15,20,25,30].map(y => (
                  <button key={y} onClick={() => changeRollingYrs(y)}
                          style={{padding:"3px 10px", borderRadius:5, fontSize:11, fontFamily:FM, fontWeight:600,
                                  cursor:"pointer", border:"1px solid",
                                  background:rollingYrs === y ? T.gold + "22" : "transparent",
                                  color:rollingYrs === y ? T.gold : T.textMuted,
                                  borderColor:rollingYrs === y ? T.gold + "66" : T.navyDark,
                                  transition:"all 0.15s"}}>
                    {y}yr
                  </button>
                ))}
              </div>
              {rollingStale && (
                <button onClick={() => runRolling()}
                        style={{padding:"4px 14px", borderRadius:6, fontSize:11, fontFamily:FA, fontWeight:700,
                                cursor:"pointer", border:`1px solid ${T.gold}`, background:T.gold + "33",
                                color:T.gold, transition:"all 0.15s"}}>
                  Run Analysis
                </button>
              )}
            </div>

            {rolling && !rollingStale && (
              <div>
                <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:12}}>
                  <div style={{textAlign:"center", background:T.bgCard, borderRadius:8, padding:"10px 8px", border:`1px solid ${T.border}`}}>
                    <div style={{fontSize:9.5, color:T.textMuted, marginBottom:4}}>{rollingYrs}-Year Windows</div>
                    <div style={{fontSize:20, fontWeight:700, fontFamily:FM, color:T.gold}}>{rolling.total}</div>
                  </div>
                  <div style={{textAlign:"center", background:T.bgCard, borderRadius:8, padding:"10px 8px", border:`1px solid ${T.border}`}}>
                    <div style={{fontSize:9.5, color:T.textMuted, marginBottom:4}}>Timing Won</div>
                    <div style={{fontSize:20, fontWeight:700, fontFamily:FM, color:rolling.winRate > 50 ? T.sage : T.red}}>{rolling.winRate.toFixed(1)}%</div>
                    <div style={{fontSize:9, color:T.textMuted}}>{rolling.timingWins} of {rolling.total}</div>
                  </div>
                  <div style={{textAlign:"center", background:T.bgCard, borderRadius:8, padding:"10px 8px", border:`1px solid ${T.border}`}}>
                    <div style={{fontSize:9.5, color:T.textMuted, marginBottom:4}}>Best Edge</div>
                    <div style={{fontSize:20, fontWeight:700, fontFamily:FM, color:T.sage}}>+{(rolling.bestTiming*100).toFixed(2)}%</div>
                    <div style={{fontSize:9, color:T.textMuted}}>CAGR vs B&H</div>
                  </div>
                  <div style={{textAlign:"center", background:T.bgCard, borderRadius:8, padding:"10px 8px", border:`1px solid ${T.border}`}}>
                    <div style={{fontSize:9.5, color:T.textMuted, marginBottom:4}}>Worst Drag</div>
                    <div style={{fontSize:20, fontWeight:700, fontFamily:FM, color:T.red}}>{(rolling.worstTiming*100).toFixed(2)}%</div>
                    <div style={{fontSize:9, color:T.textMuted}}>CAGR vs B&H</div>
                  </div>
                </div>

                {/* Distribution chart */}
                <div style={{background:T.bgCard, borderRadius:8, padding:"10px 14px", border:`1px solid ${T.border}`}}>
                  <div style={{fontSize:9.5, color:T.textMuted, marginBottom:8}}>
                    Distribution: Timing CAGR minus B&H CAGR across all {rollingYrs}-year windows (each bar = one start month)
                  </div>
                  <div style={{display:"flex", alignItems:"flex-end", height:60, gap:1, overflow:"hidden"}}>
                    {rolling.results.map((r, i) => {
                      const h = Math.min(Math.abs(r.diff) * 100 / 5 * 60, 60);
                      return (
                        <div key={i} style={{flex:1, minWidth:1, height:Math.max(h,1),
                                             background:r.diff >= 0 ? T.sage : T.red,
                                             opacity:0.7, borderRadius:"1px 1px 0 0",
                                             alignSelf:"flex-end"}}
                             title={`${r.startDate}: ${r.diff >= 0 ? "+" : ""}${(r.diff*100).toFixed(2)}%`}/>
                      );
                    })}
                  </div>
                  <div style={{display:"flex", justifyContent:"space-between", fontSize:9, color:T.textMuted, marginTop:3}}>
                    <span>{rolling.results[0]?.startDate.slice(0,4)}</span>
                    <span style={{color:T.sage}}>Green = timing wins</span>
                    <span style={{color:T.red}}>Red = B&H wins</span>
                    <span>{rolling.results[rolling.results.length-1]?.startDate.slice(0,4)}</span>
                  </div>
                </div>
              </div>
            )}

            {!rolling && !rollingStale && (
              <div style={{fontSize:11, color:T.textMuted, fontStyle:"italic"}}>Insufficient data for {rollingYrs}-year rolling analysis</div>
            )}
            {rolling && rollingStale && (
              <div style={{fontSize:11, color:T.goldDim, fontStyle:"italic", opacity:0.7}}>Parameters changed — click "Run Analysis" to refresh</div>
            )}
            {!rolling && rollingStale && (
              <div style={{fontSize:11, color:T.goldDim, fontStyle:"italic"}}>Click "Run Analysis" to compute rolling {rollingYrs}-year windows</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{marginTop:16, textAlign:"center", lineHeight:1.8}}>
          <div style={{fontSize:10, color:T.textMuted}}>
            S&P 500 daily closing prices (Yahoo Finance, Jan 1975–Mar 2026). Historical dividend yields by year.<br/>
            Taxes on realized gains per sell cycle (calendar-day holding period). Both strategies show "if sold" terminal values at current tax rates. No wash sale modeling. Dividends reinvested pre-tax.
          </div>
          <div style={{marginTop:10, fontSize:9, color:T.textMuted, opacity:0.6}}>
            © Heritage Lake Advisors & Partners · For educational purposes only · Not investment advice
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Bootstrap ──────────────────────────────────────────────
// Wait for data.json to load, then render
window.APP_DATA_READY.then(function() {
  ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
});
