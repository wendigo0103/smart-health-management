import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Timer, TrendingUp, Percent } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Mock KPIs for demo */
const STAT_TOTAL_PATIENTS_TODAY = 47;
const STAT_AVG_WAIT_MINS = 12;
const STAT_PEAK_HOUR = "11 AM – 1 PM";
const STAT_COMPLETION_RATE = 86;

/** One row per hour, 9 AM through 5 PM */
const PATIENTS_PER_HOUR = [
  { label: "9a", hour: "9 AM", count: 4 },
  { label: "10a", hour: "10 AM", count: 9 },
  { label: "11a", hour: "11 AM", count: 14 },
  { label: "12p", hour: "12 PM", count: 12 },
  { label: "1p", hour: "1 PM", count: 13 },
  { label: "2p", hour: "2 PM", count: 8 },
  { label: "3p", hour: "3 PM", count: 6 },
  { label: "4p", hour: "4 PM", count: 5 },
  { label: "5p", hour: "5 PM", count: 2 },
];

const STATUS_DISTRIBUTION = [
  { status: "Confirmed", count: 142, percentage: 52, color: "#2563EB" },
  { status: "Pending", count: 78, percentage: 28, color: "#64748B" },
  { status: "Cancelled", count: 55, percentage: 20, color: "#DC2626" },
] as const;

const CHART_W = 400;
const CHART_H = 200;
const CHART_PAD_L = 36;
const CHART_PAD_R = 12;
const CHART_PAD_T = 12;
const CHART_PAD_B = 28;

function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  iconBg: string;
}) {
  return (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-slate-600 text-sm font-medium mb-1">{label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">{value}</p>
          </div>
          <div className={iconBg + " p-3 rounded-lg shrink-0"}>
            <Icon className="h-6 w-6 text-primary" aria-hidden />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PatientsPerHourBarChart() {
  const max = Math.max(...PATIENTS_PER_HOUR.map((d) => d.count), 1);
  const innerW = CHART_W - CHART_PAD_L - CHART_PAD_R;
  const innerH = CHART_H - CHART_PAD_T - CHART_PAD_B;
  const barCount = PATIENTS_PER_HOUR.length;
  const gap = 6;
  const barW = (innerW - gap * (barCount - 1)) / barCount;

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full h-48 max-h-52"
      role="img"
      aria-label="Bar chart of patients per hour from 9 AM to 5 PM"
    >
      <line
        x1={CHART_PAD_L}
        y1={CHART_H - CHART_PAD_B}
        x2={CHART_W - CHART_PAD_R}
        y2={CHART_H - CHART_PAD_B}
        stroke="#94a3b8"
        strokeWidth={2}
      />
      <line
        x1={CHART_PAD_L}
        y1={CHART_PAD_T}
        x2={CHART_PAD_L}
        y2={CHART_H - CHART_PAD_B}
        stroke="#94a3b8"
        strokeWidth={2}
      />
      <text x={4} y={CHART_PAD_T + 6} className="fill-slate-500 text-[10px]">
        {max}
      </text>
      <text x={4} y={CHART_H - CHART_PAD_B - 4} className="fill-slate-500 text-[10px]">
        0
      </text>
      {PATIENTS_PER_HOUR.map((d, i) => {
        const x = CHART_PAD_L + i * (barW + gap);
        const h = (d.count / max) * innerH;
        const y = CHART_H - CHART_PAD_B - h;
        return (
          <rect
            key={d.label}
            x={x}
            y={y}
            width={barW}
            height={h}
            rx={4}
            fill="#2563EB"
            className="opacity-90"
          />
        );
      })}
      {PATIENTS_PER_HOUR.map((d, i) => {
        const x = CHART_PAD_L + i * (barW + gap) + barW / 2;
        return (
          <text
            key={`lbl-${d.label}`}
            x={x}
            y={CHART_H - 6}
            textAnchor="middle"
            className="fill-slate-600 text-[9px]"
          >
            {d.hour.replace(" ", "\u00A0")}
          </text>
        );
      })}
    </svg>
  );
}

function StatusPieChart() {
  let startAngle = -90;
  const cx = 100;
  const cy = 100;
  const r = 80;

  return (
    <svg width={200} height={200} viewBox="0 0 200 200" role="img" aria-label="Appointment status distribution">
      {STATUS_DISTRIBUTION.map((item, idx) => {
        const angle = (item.percentage / 100) * 360;
        const endAngle = startAngle + angle;
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);
        const largeArc = angle > 180 ? 1 : 0;
        const pathData = [`M ${cx} ${cy}`, `L ${x1} ${y1}`, `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`, `Z`].join(
          " "
        );
        const el = <path key={idx} d={pathData} fill={item.color} stroke="white" strokeWidth={2} />;
        startAngle = endAngle;
        return el;
      })}
      <circle cx={cx} cy={cy} r={48} fill="white" />
    </svg>
  );
}

export function AnalyticsScreen() {
  return (
    <div className="space-y-8">
      <p className="text-slate-600">Data insights for today&apos;s queue and appointments.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Patients Today"
          value={String(STAT_TOTAL_PATIENTS_TODAY)}
          icon={Users}
          iconBg="bg-blue-100"
        />
        <StatCard
          label="Avg. Wait Time (mins)"
          value={String(STAT_AVG_WAIT_MINS)}
          icon={Timer}
          iconBg="bg-slate-100"
        />
        <StatCard
          label="Peak Hour"
          value={STAT_PEAK_HOUR}
          icon={TrendingUp}
          iconBg="bg-blue-100"
        />
        <StatCard
          label="Completion Rate %"
          value={`${STAT_COMPLETION_RATE}%`}
          icon={Percent}
          iconBg="bg-slate-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader>
            <CardTitle>Patients per Hour</CardTitle>
            <CardDescription>Check-ins by hour (9 AM – 5 PM)</CardDescription>
          </CardHeader>
          <CardContent>
            <PatientsPerHourBarChart />
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader>
            <CardTitle>Appointment Status Distribution</CardTitle>
            <CardDescription>Confirmed, pending, and cancelled share</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start justify-center">
              <div className="shrink-0">
                <StatusPieChart />
              </div>
              <ul className="flex flex-col gap-4 w-full max-w-xs" aria-label="Legend">
                {STATUS_DISTRIBUTION.map((item) => (
                  <li key={item.status} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                        aria-hidden
                      />
                      <span className="text-sm font-medium text-slate-800 truncate">{item.status}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-slate-900">{item.count}</span>
                      <span className="text-xs text-slate-500 ml-2">{item.percentage}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
