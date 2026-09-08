import React, { useState } from 'react';
import {
  useFinancialSummary,
  useMonthlyAnalytics,
  useTopModels,
  useTopClients,
  useTopScrapModels,
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
  AlertTriangle,
  Sparkles,
  Calculator,
  Coins,
  Instagram,
  Laptop,
  Megaphone,
} from 'lucide-react';
import { ExpenseCategory } from '@printerp/shared';

const categoryLabels: Record<string, { label: string; icon: any; color: string }> = {
  FILAMENT: { label: 'Филамент', icon: Layers, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  ELECTRICITY: { label: 'Электричество', icon: Zap, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  PRINTER_PARTS: { label: 'Запчасти принтера', icon: Wrench, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  TOOLS: { label: 'Инструменты', icon: Wrench, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  SOFT: { label: 'Софт и подписки', icon: Laptop, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  DELIVERY: { label: 'Доставка', icon: Package, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  ADS: { label: 'Реклама', icon: Megaphone, color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
  OTHER: { label: 'Прочее', icon: Receipt, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
};

export const FinancePage: React.FC = () => {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  const { data: summary, isLoading: isSummaryLoading } = useFinancialSummary();
  const { data: monthly } = useMonthlyAnalytics();
  const { data: topModels } = useTopModels();
  const { data: topClients } = useTopClients();
  const { data: topScrapModels } = useTopScrapModels();
  const { data: transactions, isLoading: isTxLoading } = useTransactions({
    category: selectedCategory as ExpenseCategory | undefined,
  });

  const deleteTx = useDeleteTransaction();

  const handleDeleteTx = async (id: string) => {
    if (confirm('Вы действительно хотите удалить эту запись?')) {
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
            Финансы и аналитика
          </h2>
          <p className="text-xs text-slate-400 mt-1">Денежные потоки, маржинальность, себестоимость и расходы</p>
        </div>
        <button
          onClick={() => setIsExpenseModalOpen(true)}
          className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition shadow-md shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Записать расход</span>
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
              <span>Валовая выручка</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-base font-extrabold text-white">
              {summary.revenue.toLocaleString('ru-RU')} <span className="text-xs font-medium text-slate-400">сум</span>
            </p>
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <span>Долг клиентов:</span>
              <strong className={summary.unpaidBalance > 0 ? 'text-amber-400' : 'text-slate-400'}>
                {summary.unpaidBalance.toLocaleString('ru-RU')} сум
              </strong>
            </div>
          </div>

          {/* Net Profit & Margin % */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400 gap-1">
              <span >Чистая прибыль</span>
              <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                {summary.marginPercentage}% маржа
              </span>
            </div>
            <p className="text-base font-extrabold text-emerald-400">
              {summary.netProfit.toLocaleString('ru-RU')} <span className="text-xs font-medium text-slate-400">сум</span>
            </p>
            <div className="text-[10px] text-slate-500">
              За вычетом себестоимости и расходов
            </div>
          </div>

          {/* Cost of Goods Sold (COGS) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Себестоимость сырья</span>
              <Layers className="ml-2 w-4 h-4 text-blue-400" />
            </div>
            <p className="text-base font-bold text-slate-200">
              {summary.cogs.toLocaleString('ru-RU')} <span className="text-xs font-medium text-slate-400">сум</span>
            </p>
            <div className="text-[10px] text-slate-500">
              Филамент + доп. фурнитура
            </div>
          </div>

          {/* Operating Expenses (OpEx) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Операционные расходы</span>
              <TrendingDown className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-base font-bold text-rose-400">
              {summary.opex.toLocaleString('ru-RU')} <span className="text-xs font-medium text-slate-400">сум</span>
            </p>
            <div className="text-[10px] text-slate-500">
              Электричество, инструмент, аренда
            </div>
          </div>
        </div>
      )}

      {/* Filament Stock Yield & Revenue Potential Card */}
      {summary?.filamentYield && summary.filamentYield.totalStockG > 0 && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 space-y-3.5 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  Потенциал дохода из остатков пластика
                </h3>
                <p className="text-[10px] text-slate-400">
                  Прогноз выручки на основе каталога моделей и запасов филамента
                </p>
              </div>
            </div>

            {summary.filamentYield.potentialRoiMultiplier > 0 && (
              <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-lg shrink-0 whitespace-nowrap">
                {summary.filamentYield.potentialRoiMultiplier}x отдача сырья
              </span>
            )}
          </div>

          {/* Main 2 Highlight Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Coins className="w-3 h-3 text-emerald-400" />
                Потенциальная выручка:
              </span>
              <p className="text-base font-extrabold text-white">
                {summary.filamentYield.potentialRevenue.toLocaleString('ru-RU')}{' '}
                <span className="text-xs font-medium text-slate-400">сум</span>
              </p>
              <span className="text-[10px] text-slate-500 block">
                из расчёта ~{summary.filamentYield.potentialModelsCount} готовых моделей
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                Потенциальная прибыль:
              </span>
              <p className="text-base font-extrabold text-emerald-400">
                +{summary.filamentYield.potentialNetProfit.toLocaleString('ru-RU')}{' '}
                <span className="text-xs font-medium text-slate-400">сум</span>
              </p>
              <span className="text-[10px] text-slate-500 block">
                чистыми после вычета себестоимости пластика ({summary.filamentYield.inventoryValuation.toLocaleString('ru-RU')} сум)
              </span>
            </div>
          </div>

          {/* Transparent Formula Breakdown */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-2.5 text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <span className="text-[10px] text-slate-500 block">Запасы филамента:</span>
              <span className="font-semibold text-slate-200">
                {summary.filamentYield.totalStockG.toLocaleString('ru-RU')} г
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Ср. расход на модель:</span>
              <span className="font-semibold text-slate-200">
                {summary.filamentYield.avgCatalogWeightG} г
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Ср. цена модели:</span>
              <span className="font-semibold text-slate-200">
                {summary.filamentYield.avgCatalogPrice.toLocaleString('ru-RU')} сум
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Выручка с 1г пластика:</span>
              <span className="font-semibold text-emerald-400">
                {summary.filamentYield.avgRevenuePerGram.toLocaleString('ru-RU')} сум/г
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Scrap & Defect Losses Metric */}
      {summary?.scrapLoss && summary.scrapLoss.totalScrapCost > 0 && (
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  Потери от брака и отходов
                  <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                    {summary.scrapLoss.incidentsCount} {summary.scrapLoss.incidentsCount === 1 ? 'запись' : 'записей'}
                  </span>
                </h4>
                {summary.scrapLoss.scrapRatePercentage > 0 && (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {summary.scrapLoss.scrapRatePercentage}% уровень брака
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Списано {summary.scrapLoss.totalScrapG.toLocaleString('ru-RU')} г пластика (продувка Bambu Lab, брак печати, тесты)
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-sm font-extrabold text-rose-400 font-mono block">
              -{summary.scrapLoss.totalScrapCost.toLocaleString('ru-RU')} сум
            </span>
            <span className="text-[10px] text-slate-500">
              себестоимость потерь
            </span>
          </div>
        </div>
      )}

      {/* Monthly Financial Performance List */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-blue-400" />
          Финансовая динамика по месяцам (сум)
        </h3>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1 text-xs">
          {/* Table Header Row */}
          <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-500 pb-2 border-b border-slate-300/80 px-1">
            <span className="col-span-3 text-left">Месяц</span>
            <span className="col-span-3 text-right">Выручка</span>
            <span className="col-span-3 text-right">Расход</span>
            <span className="col-span-3 text-right">Прибыль</span>
          </div>

          {/* Table Data Rows */}
          <div className="divide-y divide-slate-300/50">
            {monthly?.map((m) => (
              <div
                key={m.month}
                className="grid grid-cols-12 gap-2 py-2.5 px-1 items-center text-xs tabular-nums"
              >
                <span className="col-span-3 font-semibold text-slate-300 text-left font-mono text-[11px]">
                  {m.month}
                </span>
                <span className="col-span-3 font-medium text-white text-right">
                  {m.revenue.toLocaleString('ru-RU')}
                </span>
                <span className="col-span-3 font-medium text-rose-400 text-right">
                  {m.opex > 0 ? '-' : ''}
                  {m.opex.toLocaleString('ru-RU')}
                </span>
                <span
                  className={`col-span-3 font-bold text-right ${
                    m.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {m.netProfit > 0 ? '+' : ''}
                  {m.netProfit.toLocaleString('ru-RU')}{' '}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Rankings: Defective Models, Top Models & Top Clients */}
      <div className="space-y-3">
        {/* Row: Top Defective Models (shown only if defects exist) */}
        {topScrapModels && topScrapModels.length > 0 && (
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-4 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Топ моделей с наибольшим браком
              </h4>
              <span className="text-[10px] text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                По числу брака
              </span>
            </div>

            <div className="space-y-1.5">
              {topScrapModels.map((tm, idx) => (
                <div
                  key={tm.id}
                  className="flex items-center justify-between text-xs bg-rose-950/20 p-2.5 rounded-xl border border-rose-900/30 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-extrabold text-rose-400 w-5 shrink-0 text-center">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="font-semibold text-white block truncate">
                        {tm.name}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 flex-wrap">
                        <span className="text-rose-300 font-bold">{tm.defectsCount} {tm.defectsCount === 1 ? 'брак' : (tm.defectsCount >= 2 && tm.defectsCount <= 4 ? 'брака' : 'браков')}</span>
                        <span>&bull;</span>
                        <span>{tm.totalGrams} г списано</span>
                        {tm.topReason && (
                          <>
                            <span>&bull;</span>
                            <span className="text-amber-300/90 truncate font-medium">Часто: {tm.topReason}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="font-bold text-rose-400 block font-mono">
                      -{tm.totalCost.toLocaleString('ru-RU')} сум
                    </span>
                    <span className="text-[9px] text-slate-500 uppercase font-semibold">Убыток</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Row 1: Top Profitable Models */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Box className="w-4 h-4 text-indigo-400" />
              Топ прибыльных моделей
            </h4>
            <span className="text-[10px] text-slate-500 font-medium">По чистой прибыли</span>
          </div>

          <div className="space-y-1.5">
            {(!topModels || topModels.length === 0) ? (
              <p className="text-xs text-slate-500 italic py-1">Нет данных по моделям</p>
            ) : (
              topModels.map((tm, idx) => (
                <div
                  key={tm.id}
                  className="flex items-center justify-between text-xs bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-slate-400 w-5 shrink-0 text-center">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="font-semibold text-white block truncate">
                        {tm.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {tm.totalQuantity} шт. &bull; Выручка: {tm.totalRevenue.toLocaleString('ru-RU')} сум
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="font-bold text-emerald-400 block">
                      +{tm.netProfit.toLocaleString('ru-RU')} сум
                    </span>
                    <span className="text-[9px] text-slate-500 uppercase font-semibold">Прибыль</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Row 2: Top Clients by Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-400" />
              Топ клиентов по выручке
            </h4>
            <span className="text-[10px] text-slate-500 font-medium">По общей сумме</span>
          </div>

          <div className="space-y-1.5">
            {(!topClients || topClients.length === 0) ? (
              <p className="text-xs text-slate-500 italic py-1">Нет данных по клиентам</p>
            ) : (
              topClients.map((tc, idx) => {
                const instagramHandle = tc.instagramUsername
                  ? (tc.instagramUsername.startsWith('@') ? tc.instagramUsername : `@${tc.instagramUsername}`)
                  : null;
                const displayName = instagramHandle || tc.name || 'Клиент';

                return (
                  <div
                    key={tc.id}
                    className="flex items-center justify-between text-xs bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-slate-400 w-5 shrink-0 text-center">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`font-semibold block truncate text-white`}>
                            {displayName}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {tc.totalOrders} {tc.totalOrders === 1 ? 'заказ' : (tc.totalOrders >= 2 && tc.totalOrders <= 4 ? 'заказа' : 'заказов')}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="font-bold text-emerald-400 block">
                        {tc.totalSpent.toLocaleString('ru-RU')} сум
                      </span>
                      <span className="text-[9px] text-slate-500 font-semibold uppercase">Выручка</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Expenses Ledger Transactions List */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-emerald-400" />
            Журнал расходов и доходов
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
            Все категории
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
            Записей расходов пока нет.
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
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between text-xs transition"
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
                            Заказ #100{tx.order.orderNumber}
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
                      title="Удалить запись"
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
