import { createSignal, For, onMount } from 'solid-js';
import { MainLayout } from '@/layouts/main-layout';
import { Button, Card } from '@/components/ui';
import { driverStore } from '@/store';
import { formatCurrency, formatDate } from '@/utils/helpers';

type Period = 'today' | 'week' | 'month';

export default function DriverEarningsPage() {
  const [period, setPeriod] = createSignal<Period>('week');

  const periods: { label: string; value: Period }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
  ];

  onMount(() => driverStore.loadEarnings());

  const earnings = () => {
    const e = driverStore.earnings();
    return { today: e.today, week: e.week, month: e.month }[period()];
  };

  const breakdown = [
    { label: 'Base Fares', pct: 0.78 },
    { label: 'Tips', pct: 0.12 },
    { label: 'Bonuses', pct: 0.10 },
  ];

  const rides = () => driverStore.rides().filter(r => r.status === 'completed');

  return (
    <MainLayout>
      <div class="page-section max-w-2xl">
        <div>
          <h1 class="heading-page text-2xl font-bold text-text-primary">Earnings</h1>
          <p class="text-text-secondary mt-2 leading-relaxed">Track your income and payouts</p>
        </div>

        {/* Period selector */}
        <div class="flex gap-2">
          <For each={periods}>{(p) => (
            <button
              onClick={() => setPeriod(p.value)}
              class={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                period() === p.value
                  ? 'bg-primary text-text-inverse'
                  : 'bg-surface border border-border text-text-secondary hover:border-primary'
              }`}
            >{p.label}</button>
          )}</For>
        </div>

        {/* Total Earnings */}
        <Card class="bg-gradient-to-r from-success-600 to-success-800 text-text-inverse border-none">
          <p class="text-sm opacity-80">Total Earnings</p>
          <p class="text-4xl font-bold mt-1">{formatCurrency(earnings())}</p>
          <div class="flex items-center gap-2 mt-2">
            <svg class="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
            <span class="text-sm opacity-80">+12% vs last period</span>
          </div>
        </Card>

        {/* Breakdown */}
        <Card>
          <h2 class="text-lg font-semibold text-text-primary mb-4">Earnings Breakdown</h2>
          <div class="space-y-3">
            <For each={breakdown}>{(item) => (
              <div class="flex items-center justify-between">
                <p class="text-text-secondary">{item.label}</p>
                <div class="flex items-center gap-3">
                  <div class="w-24 h-2 bg-surface-variant rounded-full overflow-hidden">
                    <div class="h-full bg-success rounded-full" style={{ width: `${item.pct * 100}%` }} />
                  </div>
                  <p class="font-medium text-text-primary w-20 text-right">{formatCurrency(earnings() * item.pct)}</p>
                </div>
              </div>
            )}</For>
          </div>
        </Card>

        {/* Daily Goal */}
        <Card>
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-semibold text-text-primary">Daily Goal</h2>
            <span class="text-sm text-text-secondary">{formatCurrency(driverStore.earnings().today)} / {formatCurrency(200)}</span>
          </div>
          <div class="h-3 bg-surface-variant rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-primary to-primary-600 rounded-full transition-all"
              style={{ width: `${Math.min((driverStore.earnings().today / 200) * 100, 100)}%` }}
            />
          </div>
          <p class="text-sm text-text-muted mt-2">
            {formatCurrency(Math.max(200 - driverStore.earnings().today, 0))} more to reach your daily goal
          </p>
        </Card>

        {/* Transaction History */}
        <div>
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-semibold text-text-primary">Transaction History</h2>
            <Button variant="ghost" size="sm">Export</Button>
          </div>
          <div class="space-y-2">
            <For each={rides()} fallback={
              <p class="text-text-muted text-center py-8">No completed rides yet</p>
            }>{(ride) => (
              <Card padding="sm" class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-success-100 dark:bg-success/20 flex items-center justify-center flex-shrink-0">
                  <svg class="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-text-primary capitalize truncate">{ride.vehicle?.model ?? 'Ride'} {ride.id.slice(-4)}</p>
                  <p class="text-xs text-text-secondary">{formatDate(ride.createdAt)}</p>
                </div>
                <div class="text-right">
                  <p class="font-semibold text-success">+{formatCurrency(ride.fare.total)}</p>
                </div>
              </Card>
            )}</For>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
