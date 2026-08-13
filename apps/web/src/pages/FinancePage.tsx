import React, { useState } from 'react';
import {
  useFinancialSummary,
  useMonthlyAnalytics,
  useTopModels,
  useTopClients,
  useTransactions,
  useDeleteTransaction,
} from '../hooks/useFinance';
import { CreateExpenseModal } from '../components/CreateExpenseModal';
import {
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  Percent,
  Layers,
  ShoppingBag,
  Users,
  Box,
  Trash2,
  Loader2,
  Tag,
  Calendar,
  Zap,
  Wrench,
  Package,
  Receipt,
  AlertCircle,
} from 'lucide-react';
import { ExpenseCategory } from '@printerp/shared';

const categoryLabels: Record<string, { label: string; icon: any; color: string }> = {
  FILAMENT: { label: 'Filament', icon: Layers, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  ELECTRICITY: { label: 'Electricity', icon: Zap, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  PRINTER_PARTS: { label: 'Printer Parts', icon: Wrench, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  TOOLS: { label: 'Tools', icon: Wrench, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  DELIVERY: { label: 'Delivery', icon: Package, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  OTHER: { label: 'Other', icon: Receipt, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
};

export const FinancePage: React.FC = () => {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  const { data: summary, isLoading: isSummaryLoading } = useFinancialSummary();
  const { data: monthly } = useMonthlyAnalytics();
  const { data: topModels } = useTopModels();
  const { data: topClients } = useTopClients();
  const { data: transactions, isLoading: isTxLoading } = useTransactions({
    category: selectedCategory as ExpenseCategory | undefined,
  });

  const deleteTx = useDeleteTransaction();

  const handleDeleteTx = async (id: string) => {
    if (confirm('Are you sure you want to delete this transaction entry?')) {
      await deleteTx.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Finance & Workshop Analytics
          </h2>
          <p className="text-xs text-slate-400">Cash flow, margins, COGS & operating expense ledger</p>
        </div>
        <button
          onClick={() => setIsExpenseModalOpen(true)}
          className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition shadow-md shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      {isSummaryLoading || !summary ? (
        <div className="py-8 flex justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* Gross Revenue */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Gross Revenue</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-base font-extrabold text-white">
              {summary.revenue.toLocaleString('ru-RU')} <span className="text-xs font-medium text-slate-400">сум</span>
            </p>
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <span>Unpaid Debt:</span>
              <strong className={summary.unpaidBalance > 0 ? 'text-amber-400' : 'text-slate-400'}>
                {summary.unpaidBalance.toLocaleString('ru-RU')} сум
              </strong>
            </div>
          </div>

          {/* Net Profit & Margin % */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Net Profit</span>
              <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                {summary.marginPercentage}% margin
              </span>
            </div>
            <p className="text-base font-extrabold text-emerald-400">
              {summary.netProfit.toLocaleString('ru-RU')} <span className="text-xs font-medium text-slate-400">сум</span>
            </p>
            <div className="text-[10px] text-slate-500">
              After COGS & OpEx deductions
            </div>
          </div>

          {/* Cost of Goods Sold (COGS) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Material COGS</span>
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-base font-bold text-slate-200">
              {summary.cogs.toLocaleString('ru-RU')} <span className="text-xs font-medium text-slate-400">сум</span>
            </p>
            <div className="text-[10px] text-slate-500">
              Filament + extra hardware cost
            </div>
          </div>

          {/* Operating Expenses (OpEx) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>OpEx Expenses</span>
              <TrendingDown className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-base font-bold text-rose-400">
              {summary.opex.toLocaleString('ru-RU')} <span className="text-xs font-medium text-slate-400">сум</span>
            </p>
            <div className="text-[10px] text-slate-500">
              Electricity, tools & maintenance
            </div>
          </div>
        </div>
      )}

      {/* Inventory Stock Valuation Banner */}
      {summary && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Filament Inventory Valuation</span>
              <span className="font-bold text-white text-sm">
                {summary.inventoryValuation.toLocaleString('ru-RU')} сум
              </span>
            </div>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-xl border border-slate-700">
            Stock Assets
          </span>
        </div>
      )}

      {/* Monthly Financial Performance List */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-blue-400" />
          Monthly Financial Breakdown
        </h3>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2 text-xs">
          {monthly?.map((m) => (
            <div key={m.month} className="flex items-center justify-between py-1 border-b border-slate-800/60 last:border-0">
              <span className="font-semibold text-slate-300 text-xs w-20">{m.month}</span>
              <div className="flex items-center space-x-4 text-right">
                <div>
                  <span className="text-[10px] text-slate-500 block">Rev</span>
                  <span className="font-semibold text-white">{m.revenue.toLocaleString('ru-RU')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">OpEx</span>
                  <span className="font-semibold text-rose-400">-{m.opex.toLocaleString('ru-RU')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Profit</span>
                  <span className={`font-bold ${m.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {m.netProfit.toLocaleString('ru-RU')} сум
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Rankings: Top Models & Top Clients */}
      <div className="grid grid-cols-2 gap-3">
        {/* Top Models */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2">
          <h4 className="text-xs font-bold text-white flex items-center gap-1">
            <Box className="w-3.5 h-3.5 text-indigo-400" />
            Top Profitable Models
          </h4>
          <div className="space-y-1.5">
            {topModels?.map((tm, idx) => (
              <div key={tm.id} className="flex items-center justify-between text-[11px] bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                <div>
                  <span className="font-semibold text-white block line-clamp-1">
                    {idx + 1}. {tm.name}
                  </span>
                  <span className="text-[10px] text-slate-500">{tm.totalQuantity} printed</span>
                </div>
                <span className="font-bold text-emerald-400 shrink-0">
                  +{tm.netProfit.toLocaleString('ru-RU')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Clients */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2">
          <h4 className="text-xs font-bold text-white flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            Top Clients by Revenue
          </h4>
          <div className="space-y-1.5">
            {topClients?.map((tc, idx) => (
              <div key={tc.id} className="flex items-center justify-between text-[11px] bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                <div>
                  <span className="font-semibold text-white block line-clamp-1">
                    {idx + 1}. {tc.name}
                  </span>
                  <span className="text-[10px] text-slate-500">{tc.totalOrders} orders</span>
                </div>
                <span className="font-bold text-white shrink-0">
                  {tc.totalSpent.toLocaleString('ru-RU')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expenses Ledger Transactions List */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-emerald-400" />
            Expense & Income Ledger
          </h3>
        </div>

        {/* Category Pills Filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedCategory(undefined)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition ${
              selectedCategory === undefined
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            All Categories
          </button>
          {Object.entries(categoryLabels).map(([catKey, catVal]) => (
            <button
              key={catKey}
              onClick={() => setSelectedCategory(catKey)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition ${
                selectedCategory === catKey
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {catVal.label}
            </button>
          ))}
        </div>

        {/* Transactions Table List */}
        {isTxLoading ? (
          <div className="py-8 flex justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
          </div>
        ) : transactions?.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-xs">
            No transaction records found.
          </div>
        ) : (
          <div className="space-y-2">
            {transactions?.map((tx) => {
              const catInfo = categoryLabels[tx.category] || categoryLabels.OTHER;
              const Icon = catInfo.icon;
              const isExpense = tx.type === 'EXPENSE';

              return (
                <div
                  key={tx.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between text-xs hover:border-slate-700 transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${catInfo.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{catInfo.label}</span>
                        {tx.order && (
                          <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                            Order #{tx.order.orderNumber}
                          </span>
                        )}
                      </div>
                      {tx.comment && <p className="text-[11px] text-slate-400">{tx.comment}</p>}
                      <span className="text-[10px] text-slate-500">
                        {new Date(tx.date).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`font-bold ${isExpense ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isExpense ? '-' : '+'}{tx.amount.toLocaleString('ru-RU')} сум
                    </span>
                    <button
                      onClick={() => handleDeleteTx(tx.id)}
                      className="text-slate-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateExpenseModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} />
    </div>
  );
};
