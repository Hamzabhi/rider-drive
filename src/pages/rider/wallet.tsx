import { createSignal, For, Show, onMount } from 'solid-js';
import { MainLayout } from '@/layouts/main-layout';
import { Button, Card, Input } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { mockTransactions, mockApiCall } from '@/api/mock-data';
import { walletStore } from '@/store';
import { formatCurrency } from '@/utils/helpers';
import { useToast } from '@/components/ui/toast';

export default function WalletPage() {
  const toast = useToast();
  const [showTopUp, setShowTopUp] = createSignal(false);
  const [topUpAmount, setTopUpAmount] = createSignal(50);
  const [loading, setLoading] = createSignal(false);

  // Initialize store from mock data on first load. In production this would
  // be replaced with a `walletApi.getWallet()` call.
  onMount(() => {
    if (walletStore.balance() === 0) {
      walletStore.setBalance(150);
      walletStore.setTransactions(mockTransactions);
    }
  });

  const handleTopUp = async () => {
    setLoading(true);
    await mockApiCall(null, 1500);
    walletStore.setBalance(walletStore.balance() + topUpAmount());
    walletStore.addTransaction({
      id: `tx-${Date.now()}`, walletId: 'wr1', type: 'credit', amount: topUpAmount(),
      balance: walletStore.balance(), reference: `TOPUP-${Date.now()}`,
      description: 'Wallet top-up', status: 'completed',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    setLoading(false);
    setShowTopUp(false);
    toast.add(`Added ${formatCurrency(topUpAmount())} to your wallet`, 'success');
  };

  const quickAmounts = [10, 25, 50, 100];

  return (
    <MainLayout>
      <div class="max-w-2xl mx-auto space-y-6">
        {/* Balance Card */}
        <Card class="bg-gradient-to-r from-primary-500 to-primary-700 text-text-inverse border-none">
          <p class="text-sm opacity-80">Available Balance</p>
          <p class="text-4xl font-bold mt-1">{formatCurrency(walletStore.balance())}</p>
          <div class="flex gap-3 mt-4">
            <Button variant="outline" class="flex-1 border-white/30 text-text-inverse hover:bg-white/10" onClick={() => setShowTopUp(true)}>
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Top Up
            </Button>
            <Button variant="outline" class="flex-1 border-white/30 text-text-inverse hover:bg-white/10">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
              </svg>
              Transfer
            </Button>
          </div>
        </Card>

        {/* Top Up Modal */}
        <Show when={showTopUp()}>
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-overlay" onClick={() => setShowTopUp(false)}>
            <div class="w-full max-w-md mx-4 bg-surface rounded-xl shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
              <h2 class="text-lg font-semibold text-text-primary mb-4">Top Up Wallet</h2>
              <div class="grid grid-cols-4 gap-2 mb-4">
                <For each={quickAmounts}>{(amount) => (
                  <button
                    onClick={() => setTopUpAmount(amount)}
                    class={`p-3 rounded-lg border text-center font-medium transition-colors ${
                      topUpAmount() === amount ? 'border-primary bg-primary-50 dark:bg-primary-900/20 text-primary' : 'border-border text-text-primary hover:border-primary'
                    }`}
                  >
                    {formatCurrency(amount)}
                  </button>
                )}</For>
              </div>
              <Input
                label="Custom amount"
                type="number"
                value={String(topUpAmount())}
                onInput={(e) => setTopUpAmount(Number(e.currentTarget.value))}
                leftIcon={<span class="text-text-secondary font-medium text-sm">$</span>}
              />
              <div class="flex gap-2 mt-4">
                <Button variant="outline" class="flex-1" onClick={() => setShowTopUp(false)}>Cancel</Button>
                <Button class="flex-1" onClick={handleTopUp} isLoading={loading()}>Add {formatCurrency(topUpAmount())}</Button>
              </div>
            </div>
          </div>
        </Show>

        {/* Loyalty Points */}
        <Card>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-text-secondary">Loyalty Points</p>
              <p class="text-2xl font-bold text-text-primary">{(2450).toLocaleString()}</p>
            </div>
            <Button variant="outline" size="sm">Redeem</Button>
          </div>
        </Card>

        {/* Payment Methods */}
        <div>
          <h2 class="text-lg font-semibold text-text-primary mb-3">Payment Methods</h2>
          <Card class="flex items-center gap-4">
            <div class="w-12 h-8 bg-gradient-to-r from-primary-600 to-primary-800 rounded flex items-center justify-center">
              <span class="text-text-inverse text-xs font-bold">VISA</span>
            </div>
            <div class="flex-1">
              <p class="font-medium text-text-primary">Visa ending in 4242</p>
              <p class="text-sm text-text-secondary">Expires 12/25</p>
            </div>
            <Badge variant="primary" size="sm">Default</Badge>
          </Card>
        </div>

        {/* Transaction History */}
        <div>
          <h2 class="text-lg font-semibold text-text-primary mb-3">Recent Transactions</h2>
          <div class="space-y-2">
            <For each={walletStore.transactions()}>{(tx) => (
              <Card class="flex items-center gap-4">
                <div class={`w-10 h-10 rounded-full flex items-center justify-center ${
                  tx.type === 'credit' ? 'bg-success-100 dark:bg-success/20' : 'bg-danger-100 dark:bg-danger/20'
                }`}>
                  <Show when={tx.type === 'credit'} fallback={
                    <svg class="w-5 h-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                    </svg>
                  }>
                    <svg class="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                  </Show>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-text-primary">{tx.description}</p>
                  <p class="text-sm text-text-secondary">{new Date(tx.createdAt).toLocaleDateString()}</p>
                </div>
                <p class={`font-semibold ${tx.type === 'credit' ? 'text-success' : 'text-danger'}`}>
                  {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                </p>
              </Card>
            )}</For>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
