import { createSignal, For } from 'solid-js';
import { MainLayout } from '@/layouts/main-layout';
import { Button, Card } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { mockDriverEarnings, mockRides, mockDrivers } from '@/api/mock-data';
import { formatCurrency } from '@/utils/helpers';

type Period = 'day' | 'week' | 'month' | 'year';

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = createSignal<Period>('week');

  const periods: { label: string; value: Period }[] = [
    { label: 'Today', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Year', value: 'year' },
  ];

  const metrics = {
    day: { rides: 248, revenue: 3120, newUsers: 34, activeDrivers: 89, avgFare: 12.58, satisfaction: 4.7 },
    week: { rides: 1750, revenue: 22400, newUsers: 189, activeDrivers: 156, avgFare: 12.80, satisfaction: 4.8 },
    month: { rides: 7200, revenue: 91250, newUsers: 756, activeDrivers: 312, avgFare: 12.67, satisfaction: 4.75 },
    year: { rides: 85000, revenue: 1072500, newUsers: 8900, activeDrivers: 450, avgFare: 12.62, satisfaction: 4.72 },
  };

  const current = () => metrics[period()];
  const prev = () => ({ ...current(), rides: current().rides * 0.88, revenue: current().revenue * 0.91 });

  const growth = (curr: number, previous: number) => {
    const pct = ((curr - previous) / previous * 100).toFixed(1);
    return { value: pct, positive: curr >= previous };
  };

  const topStats = [
    { label: 'Total Rides', value: current().rides.toLocaleString(), growth: growth(current().rides, prev().rides) },
    { label: 'Revenue', value: formatCurrency(current().revenue), growth: growth(current().revenue, prev().revenue) },
    { label: 'New Users', value: current().newUsers.toString(), growth: { value: '+23%', positive: true } },
    { label: 'Active Drivers', value: current().activeDrivers.toString(), growth: { value: '+5', positive: true } },
    { label: 'Avg Fare', value: formatCurrency(current().avgFare), growth: { value: '0%', positive: true } },
    { label: 'Satisfaction', value: `${current().satisfaction}/5`, growth: { value: '+0.1', positive: true } },
  ];

  const barData = [
    { label: 'Mon', value: 0.65 }, { label: 'Tue', value: 0.78 }, { label: 'Wed', value: 0.85 },
    { label: 'Thu', value: 0.92 }, { label: 'Fri', value: 1.0 }, { label: 'Sat', value: 0.88 },
    { label: 'Sun', value: 0.72 },
  ];

  const vehicleBreakdown = [
    { type: 'Sedan', pct: 45, color: 'bg-primary' },
    { type: 'SUV', pct: 28, color: 'bg-success' },
    { type: 'Luxury', pct: 15, color: 'bg-warning' },
    { type: 'Van', pct: 8, color: 'bg-secondary' },
    { type: 'Motorcycle', pct: 4, color: 'bg-danger' },
  ];

  const topAreas = [
    { name: 'Manhattan', rides: 3420, revenue: 43500 },
    { name: 'Brooklyn', rides: 1850, revenue: 22100 },
    { name: 'Queens', rides: 1240, revenue: 15600 },
    { name: 'Bronx', rides: 780, revenue: 9400 },
    { name: 'Staten Island', rides: 290, revenue: 3650 },
  ];

  return (
    <MainLayout>
      <div class="space-y-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-text-primary">Analytics</h1>
            <p class="text-text-secondary">Platform performance and insights</p>
          </div>
          <div class="flex gap-2">
            <For each={periods}>{(p) => (
              <Button
                variant={period() === p.value ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </Button>
            )}</For>
          </div>
        </div>

        {/* Key Metrics */}
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <For each={topStats}>{(stat) => (
            <Card>
              <p class="text-sm text-text-secondary">{stat.label}</p>
              <p class="text-2xl font-bold text-text-primary mt-1">{stat.value}</p>
              <div class={`flex items-center gap-1 mt-2 text-sm ${stat.growth.positive ? 'text-success' : 'text-danger'}`}>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={stat.growth.positive ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' : 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'}/>
                </svg>
                {stat.growth.value}
              </div>
            </Card>
          )}</For>
        </div>

        {/* Ride Volume Chart */}
        <Card>
          <h2 class="text-lg font-semibold text-text-primary mb-6">Ride Volume</h2>
          <div class="flex items-end gap-3 h-40">
            <For each={barData}>{(bar) => (
              <div class="flex-1 flex flex-col items-center gap-2">
                <div class="w-full bg-primary rounded-t-md transition-all hover:bg-primary-600" style={{ height: `${bar.value * 100}%` }} />
                <span class="text-xs text-text-muted">{bar.label}</span>
              </div>
            )}</For>
          </div>
        </Card>

        <div class="grid lg:grid-cols-2 gap-6">
          {/* Vehicle Type Breakdown */}
          <Card>
            <h2 class="text-lg font-semibold text-text-primary mb-4">Vehicle Types</h2>
            <div class="space-y-3">
              <For each={vehicleBreakdown}>{(v) => (
                <div class="space-y-1">
                  <div class="flex justify-between text-sm">
                    <span class="text-text-secondary">{v.type}</span>
                    <span class="font-medium text-text-primary">{v.pct}%</span>
                  </div>
                  <div class="h-2 bg-surface-variant rounded-full overflow-hidden">
                    <div class={`h-full ${v.color} rounded-full transition-all`} style={{ width: `${v.pct}%` }} />
                  </div>
                </div>
              )}</For>
            </div>
          </Card>

          {/* Top Areas */}
          <Card>
            <h2 class="text-lg font-semibold text-text-primary mb-4">Top Areas</h2>
            <div class="space-y-3">
              <For each={topAreas}>{(area, i) => (
                <div class="flex items-center gap-3">
                  <div class="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary">
                    {i() + 1}
                  </div>
                  <div class="flex-1">
                    <p class="text-sm font-medium text-text-primary">{area.name}</p>
                    <p class="text-xs text-text-secondary">{area.rides.toLocaleString()} rides</p>
                  </div>
                  <p class="font-semibold text-text-primary">{formatCurrency(area.revenue)}</p>
                </div>
              )}</For>
            </div>
          </Card>
        </div>

        {/* Driver Performance */}
        <Card>
          <h2 class="text-lg font-semibold text-text-primary mb-4">Driver Performance</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border text-left">
                  <th class="pb-3 text-text-secondary font-medium">Driver</th>
                  <th class="pb-3 text-text-secondary font-medium">Rides</th>
                  <th class="pb-3 text-text-secondary font-medium">Earnings</th>
                  <th class="pb-3 text-text-secondary font-medium">Rating</th>
                  <th class="pb-3 text-text-secondary font-medium">Level</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <For each={mockDrivers}>{(driver) => (
                  <tr>
                    <td class="py-3 pr-4 font-medium text-text-primary">{driver.firstName} {driver.lastName}</td>
                    <td class="py-3 pr-4 text-text-secondary">{driver.totalRides.toLocaleString()}</td>
                    <td class="py-3 pr-4 text-text-primary">{formatCurrency(driver.wallet.balance)}</td>
                    <td class="py-3 pr-4">
                      <div class="flex items-center gap-1">
                        <svg class="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        <span>{driver.rating}</span>
                      </div>
                    </td>
                    <td class="py-3">
                      <Badge variant={driver.level === 'platinum' ? 'primary' : driver.level === 'gold' ? 'warning' : 'ghost'} size="xs">
                        {driver.level}
                      </Badge>
                    </td>
                  </tr>
                )}</For>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
