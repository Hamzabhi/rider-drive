import { For, createSignal, Show } from 'solid-js';
import { MainLayout } from '@/layouts/main-layout';
import { Button, Card, Input } from '@/components/ui';
import { Badge, Avatar } from '@/components/ui/badge';
import { mockDrivers, mockRides, mockRider } from '@/api/mock-data';
import { formatCurrency } from '@/utils/helpers';

export default function AdminDashboardPage() {
  const [timeRange, setTimeRange] = createSignal<'day' | 'week' | 'month'>('day');

  const stats = {
    day: { rides: 1245, revenue: 15250, activeDrivers: 89, newUsers: 34 },
    week: { rides: 8750, revenue: 98750, activeDrivers: 156, newUsers: 189 },
    month: { rides: 35420, revenue: 425000, activeDrivers: 312, newUsers: 756 },
  };

  const recentRides = mockRides.slice(0, 5);
  const topDrivers = mockDrivers.slice(0, 3);

  const statCards = [
    { label: 'Total Rides', value: stats[timeRange()].rides, change: '+12%', color: 'primary' },
    { label: 'Revenue', value: formatCurrency(stats[timeRange()].revenue), change: '+8.5%', color: 'success' },
    { label: 'Active Drivers', value: stats[timeRange()].activeDrivers, change: '+5', color: 'warning' },
    { label: 'New Users', value: stats[timeRange()].newUsers, change: '+23%', color: 'primary' },
  ];

  return (
    <MainLayout>
      <div class="space-y-6">
        {/* Header */}
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
            <p class="text-text-secondary">Monitor platform performance and manage operations</p>
          </div>
          <div class="flex gap-2">
            <For each={['day', 'week', 'month'] as const}>{(range) => (
              <Button
                variant={timeRange() === range ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </Button>
            )}</For>
          </div>
        </div>

        {/* Stats Grid */}
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <For each={statCards}>{(stat) => (
            <Card>
              <p class="text-sm text-text-secondary">{stat.label}</p>
              <p class="text-2xl font-bold text-text-primary mt-1">{stat.value}</p>
              <Badge variant="success" size="sm" class="mt-2">{stat.change}</Badge>
            </Card>
          )}</For>
        </div>

        {/* Charts placeholder */}
        <Card>
          <h2 class="text-lg font-semibold text-text-primary mb-4">Revenue Overview</h2>
          <div class="h-48 flex items-center justify-center bg-surface-variant rounded-lg">
            <div class="text-center">
              <svg class="w-12 h-12 text-text-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              <p class="text-text-secondary">Interactive charts coming soon</p>
            </div>
          </div>
        </Card>

        <div class="grid lg:grid-cols-2 gap-6">
          {/* Recent Rides */}
          <Card>
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-text-primary">Recent Rides</h2>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            <div class="space-y-3">
              <For each={recentRides}>{(ride) => (
                <div class="flex items-center gap-3 p-3 rounded-lg bg-surface-variant">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-text-primary truncate">{ride.pickup.address.split(',')[0]} to {ride.dropoff.address.split(',')[0]}</p>
                    <p class="text-xs text-text-secondary">{ride.driver?.firstName} {ride.driver?.lastName}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-semibold text-text-primary">{formatCurrency(ride.fare.total)}</p>
                    <Badge variant={ride.status === 'completed' ? 'success' : ride.status === 'in_progress' ? 'warning' : 'ghost'} size="xs">
                      {ride.status}
                    </Badge>
                  </div>
                </div>
              )}</For>
            </div>
          </Card>

          {/* Top Drivers */}
          <Card>
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-text-primary">Top Drivers</h2>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            <div class="space-y-3">
              <For each={topDrivers}>{(driver, index) => (
                <div class="flex items-center gap-3 p-3 rounded-lg bg-surface-variant">
                  <div class="w-6 h-6 rounded-full bg-primary text-text-inverse text-xs font-bold flex items-center justify-center">
                    {index() + 1}
                  </div>
                  <Avatar src={driver.avatar} name={`${driver.firstName} ${driver.lastName}`} size="sm" />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-text-primary">{driver.firstName} {driver.lastName}</p>
                    <div class="flex items-center gap-1 text-xs text-text-secondary">
                      <svg class="w-3 h-3 text-warning" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      {driver.rating}
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-semibold text-text-primary">{driver.totalRides.toLocaleString()}</p>
                    <p class="text-xs text-text-secondary">rides</p>
                  </div>
                </div>
              )}</For>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <h2 class="text-lg font-semibold text-text-primary mb-4">Quick Actions</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Manage Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
              { label: 'Driver Approval', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
              { label: 'View Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
              { label: 'System Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
            ].map((action) => (
              <button class="flex flex-col items-center gap-2 p-4 rounded-lg bg-surface-variant hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={action.icon}/>
                </svg>
                <span class="text-sm font-medium text-text-primary">{action.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
