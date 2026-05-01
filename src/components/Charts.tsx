import * as React from "react";

/* ----------------- Sparkline (small inline trend) ----------------- */
export function Sparkline({ data, color = "#27ae60", height = 32, width = 110 }:
  { data: number[]; color?: string; height?: number; width?: number }) {
  if (data.length === 0) data = [0, 0];
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = width / (data.length - 1 || 1);
  const points = data.map((v, i) => `${i * stepX},${height - ((v - min) / range) * height}`);
  const path = `M ${points.join(" L ")}`;
  const area = `${path} L ${width},${height} L 0,${height} Z`;
  const id = React.useId();
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`}/>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

/* ----------------- LineChart (Statistics card) ----------------- */
export function LineChart({ data, labels, color = "#27ae60", height = 230 }:
  { data: number[]; labels: (string | number)[]; color?: string; height?: number }) {
  const w = 720;
  const h = height;
  const padL = 36, padR = 12, padT = 12, padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const max = Math.max(...data, 1);
  const min = 0;
  const range = max - min || 1;
  // Y ticks at 0, 5, 10, 15, 20, 25 (or similar nice steps)
  const niceMax = niceCeil(max);
  const ticks = 5;
  const stepY = niceMax / ticks;
  const stepX = innerW / Math.max(data.length - 1, 1);
  const points = data.map((v, i) => [padL + i * stepX, padT + innerH - (v / niceMax) * innerH] as const);
  const linePath = `M ${points.map((p) => p.join(",")).join(" L ")}`;
  const areaPath = `${linePath} L ${padL + innerW},${padT + innerH} L ${padL},${padT + innerH} Z`;
  const id = React.useId();
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[230px]">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Y grid + labels */}
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const y = padT + innerH - (i * stepY / niceMax) * innerH;
        return (
          <g key={i}>
            <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="#eef2f6" strokeWidth="1"/>
            <text x={padL - 8} y={y + 3} fontSize="10" fill="#8a98a5" textAnchor="end">{Math.round(i * stepY)}</text>
          </g>
        );
      })}
      {/* X axis labels */}
      {labels.map((lab, i) => (
        <text key={i} x={padL + i * stepX} y={h - 8} fontSize="10" fill="#8a98a5" textAnchor="middle">{lab}</text>
      ))}
      {/* Area + line */}
      <path d={areaPath} fill={`url(#${id})`}/>
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      {/* Points */}
      {points.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3.5" fill="#fff" stroke={color} strokeWidth="2"/>
        </g>
      ))}
    </svg>
  );
}

function niceCeil(n: number) {
  if (n <= 5) return 5;
  if (n <= 10) return 10;
  if (n <= 25) return 25;
  if (n <= 50) return 50;
  if (n <= 100) return 100;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  return Math.ceil(n / pow) * pow;
}

/* ----------------- BarChart (vertical bars for Data graph) ----------------- */
export function BarsVertical({ data, color = "#27ae60", height = 100 }:
  { data: number[]; color?: string; height?: number }) {
  const max = Math.max(...data, 1);
  const w = 240;
  const barW = w / data.length - 4;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
      {data.map((v, i) => {
        const bh = (v / max) * (height - 6);
        const x = i * (barW + 4) + 2;
        const y = height - bh;
        return <rect key={i} x={x} y={y} width={barW} height={bh} rx="2" fill={color} opacity={0.85}/>;
      })}
    </svg>
  );
}

/* ----------------- Horizontal Bars (legacy compat) ----------------- */
export function BarChart({ data, color = "#27ae60" }:
  { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
            <span className="font-medium text-ink-700">{d.label}</span>
            <span className="tabular-nums">{d.value}</span>
          </div>
          <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ----------------- Donut ----------------- */
export function Donut({ value, total, label, color = "#27ae60", size = 110 }:
  { value: number; total: number; label?: string; color?: string; size?: number }) {
  const pct = total === 0 ? 0 : Math.min(100, Math.round((value / total) * 100));
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="#eef2f6" strokeWidth="10" fill="none"/>
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth="10" fill="none"
                strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round"/>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-xl font-bold text-ink-900 tabular-nums">{pct}%</div>
          {label && <div className="text-[10px] uppercase tracking-wider text-ink-500">{label}</div>}
        </div>
      </div>
    </div>
  );
}

/* ----------------- Mini Calendar ----------------- */
export function MiniCalendar({ locale = "en", highlights = [] as number[] }: { locale?: "en" | "ar"; highlights?: number[] }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = today.toLocaleString(locale === "ar" ? "ar-SA" : "en-US", { month: "long", year: "numeric" });
  const dows = locale === "ar" ? ["ح", "ن", "ث", "ر", "خ", "ج", "س"] : ["S", "M", "T", "W", "T", "F", "S"];
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <button className="text-ink-400 hover:text-ink-700">‹</button>
        <div className="text-sm font-semibold text-ink-700">{monthName}</div>
        <button className="text-ink-400 hover:text-ink-700">›</button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-ink-400 font-semibold mb-1">
        {dows.map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 text-center text-[12px] gap-y-1">
        {cells.map((d, i) => {
          const isToday = d === today.getDate();
          const hl = d != null && highlights.includes(d);
          return (
            <div key={i} className="py-1">
              {d == null ? <span className="text-ink-200">·</span> : (
                <span className={
                  isToday ? "inline-grid place-items-center w-7 h-7 rounded-full bg-leaf-500 text-white font-semibold"
                  : hl ? "inline-grid place-items-center w-7 h-7 rounded-full bg-leaf-100 text-leaf-700 font-semibold"
                  : "text-ink-700"
                }>{d}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
