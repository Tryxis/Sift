import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUSES, STATUS_META } from "@/lib/status";
import { hoursLeftToBeat, totalHours } from "@/lib/format";

function StatCard({ title, value, detail, className }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-3xl font-light tracking-tight sm:text-4xl">{value}</p>
        <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function StatsPanel({ games }) {
  const stats = useMemo(() => {
    const counts = STATUSES.map((s) => ({ status: s, count: games.filter((g) => g.status === s).length }));
    const completed = counts.find((c) => c.status === "Completed").count;
    const played = games.filter((g) => g.playtimeForeverMinutes > 0).length;
    return {
      counts,
      completed,
      played,
      unplayed: games.length - played,
      hours: totalHours(games),
      completionRate: games.length ? Math.round((completed / games.length) * 100) : 0,
      leftToBeat: hoursLeftToBeat(games),
    };
  }, [games]);

  const chartData = stats.counts.filter((c) => c.count > 0);

  return (
    <section className="relative z-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr]" aria-label="Library stats">
      <Card className="col-span-2 md:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle>Status breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="relative h-28 w-28 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="count" nameKey="status" innerRadius="70%" outerRadius="100%" paddingAngle={3} stroke="none" isAnimationActive={false}>
                  {chartData.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_META[entry.status].hex} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl font-light">{games.length}</span>
              <span className="text-[11px] text-muted-foreground">games</span>
            </div>
          </div>
          <ul className="grid flex-1 gap-1.5 text-sm">
            {stats.counts.map(({ status, count }) => (
              <li key={status} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${STATUS_META[status].dotClass}`} />
                  {STATUS_META[status].label}
                </span>
                <span className="tabular-nums text-muted-foreground">{count}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <StatCard
        title="Hours logged"
        value={stats.hours.toLocaleString()}
        detail={`${stats.played} played, ${stats.unplayed} never launched`}
      />
      <StatCard title="Completed" value={`${stats.completionRate}%`} detail={`${stats.completed} of ${games.length} games`} />
      <StatCard
        className="col-span-2 md:col-span-1"
        title="Left to beat"
        value={stats.leftToBeat.gameCount ? `${stats.leftToBeat.hours.toLocaleString()} hrs` : "Not yet"}
        detail={
          stats.leftToBeat.gameCount
            ? `Main stories across ${stats.leftToBeat.gameCount} unfinished games`
            : "Completion times arrive with the daily update"
        }
      />

    </section>
  );
}
