import React, { useState } from 'react';
import { useOrders, OrderStatus } from '../hooks/useOrders';
import { useFinancialSummary } from '../hooks/useFinance';
import { usePrinters } from '../hooks/usePrinters';
import { getClientDisplayName } from '@printerp/shared';
import { OrderDetailModal } from '../components/OrderDetailModal';
import {
  Package,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Layers,
  CalendarPlus,
  Flame,
  Zap,
  FileCode,
  ShoppingBag,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { data: orders } = useOrders();
  const { data: summary } = useFinancialSummary();
  const { data: printers } = usePrinters();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Active orders count & printing status count
  const activeOrders = orders?.filter((o) => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED) || [];
  const printingCount = orders?.filter((o) => o.status === OrderStatus.PRINTING).length || 0;

  // Orders created today count
  const todayOrdersCount = orders?.filter((o) => {
    const createdDate = new Date(o.createdAt);
    const now = new Date();
    return (
      createdDate.getFullYear() === now.getFullYear() &&
      createdDate.getMonth() === now.getMonth() &&
      createdDate.getDate() === now.getDate()
    );
  }).length || 0;

  // Revenue & Net profit from live finance summary
  const revenue = summary?.revenue ?? 0;
  const netProfit = summary?.netProfit ?? 0;
  const marginPercentage = summary?.marginPercentage ?? 0;

  // 3 Most recently added orders
  const recentOrders = [...(orders || [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  // Upcoming deadlines (next active orders with deadline sorted ascending)
  const upcomingDeadlines = activeOrders
    .filter((o) => !!o.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.CREATED:
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case OrderStatus.DESIGN:
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case OrderStatus.PRINTING:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case OrderStatus.PRINTED:
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case OrderStatus.COMPLETED:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case OrderStatus.CANCELLED:
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Quick Dashboard Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-blue-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Активные заказы</span>
            <Package className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-white">
            {printingCount}/{activeOrders.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {printingCount} в печати / {activeOrders.length} активных
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Чистая прибыль</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-emerald-400">{netProfit.toLocaleString('ru-RU')} сум</p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Выручка: {revenue.toLocaleString('ru-RU')}</span>
            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              {marginPercentage}%
            </span>
          </p>
        </div>
      </div>

      {/* Orders Created Today Block (Shown ONLY if todayOrdersCount > 0) */}
      {todayOrdersCount > 0 && (
        <div className="bg-slate-900 border border-sky-500/30 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <CalendarPlus className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-sky-400/90 tracking-wider block">
                Заказов создано сегодня
              </span>
              <span className="text-sm font-bold text-white">
                {todayOrdersCount} {todayOrdersCount === 1 ? 'заказ' : todayOrdersCount <= 4 ? 'заказа' : 'заказов'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Stock Asset Block */}
      {summary && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                Запасы сырья на складе
              </span>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-sm font-bold text-white">
                  {summary.inventoryValuation.toLocaleString('ru-RU')} сум
                </span>
                {summary.filamentYield && summary.filamentYield.potentialNetProfit > 0 && (
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <span className="text-slate-500 font-normal">≈</span>
                    <span className="text-emerald-400 font-bold">
                      {summary.filamentYield.potentialNetProfit.toLocaleString('ru-RU')} сум
                    </span>
                    <span className="text-[10px] text-emerald-500/80 font-normal">
                      (пот. прибыль)
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unpaid Client Balance Block (Shown ONLY if unpaidBalance > 0) */}
      {summary && summary.unpaidBalance > 0 && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <DollarSign className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-amber-400/90 tracking-wider block">
                Остаток долга клиентов
              </span>
              <span className="text-sm font-bold text-amber-400">
                {summary.unpaidBalance.toLocaleString('ru-RU')} сум
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bambu Lab Fleet Live Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-400" />
            3D-Принтеры
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">
            {printers?.filter((p) => p.lastStatus === 'RUNNING' || p.lastStatus === 'PRINTING').length || 0} в печати / {printers?.length || 0} всего
          </span>
        </div>

        {printers && printers.length > 0 ? (
          <div className="space-y-2.5">
            {printers.map((printer) => {
              const isPrinting = printer.lastStatus === 'RUNNING' || printer.lastStatus === 'PRINTING';
              const isPaused = printer.lastStatus === 'PAUSED';
              const progress = printer.printProgress ?? 0;
              const remainingMins = printer.remainingMinutes ?? 0;
              const hours = Math.floor(remainingMins / 60);
              const mins = remainingMins % 60;
              const timeString = hours > 0 ? `${hours}ч ${mins}м` : `${mins}м`;

              const statusText = isPrinting
                ? 'ПЕЧАТЬ'
                : isPaused
                ? 'ПАУЗА'
                : printer.lastStatus === 'OFFLINE'
                ? 'ОФФЛАЙН'
                : printer.lastStatus || 'ГОТОВ';

              return (
                <div
                  key={printer.id}
                  className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 space-y-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white">{printer.name}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                        {printer.model}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        isPrinting
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : isPaused
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isPrinting ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      {statusText}
                    </span>
                  </div>

                  {isPrinting && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span className="truncate max-w-[180px] flex items-center gap-1">
                          <FileCode className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{printer.currentFile || 'Печать...'}</span>
                        </span>
                        <span className="font-bold text-emerald-400">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-rose-400" />
                        {printer.nozzleTemp !== null && printer.nozzleTemp !== undefined
                          ? `${Math.round(printer.nozzleTemp)}°C`
                          : '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        {printer.bedTemp !== null && printer.bedTemp !== undefined
                          ? `${Math.round(printer.bedTemp)}°C`
                          : '—'}
                      </span>
                    </div>

                    {isPrinting && remainingMins > 0 && (
                      <span className="flex items-center gap-1 text-sky-400 font-medium">
                        <Clock className="w-3 h-3" />
                        {timeString} осталось
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">Принтеры Bambu Lab пока не подключены.</p>
        )}
      </div>

      {/* 3 Most Recently Added Orders */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            Последние добавленные заказы
          </h2>
          <span className="text-[10px] text-slate-500 font-medium">Топ 3</span>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Заказов пока нет</p>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order) => {
              const price = order.finalPrice > 0 ? order.finalPrice : order.calculatedPrice;
              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between hover:border-slate-700 cursor-pointer transition"
                >
                  <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        #100{order.orderNumber}
                      </span>
                      <span className="text-xs font-bold text-white truncate">
                        {getClientDisplayName(order.client)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {order.items?.map((i) => `${i.projectNameSnapshot} (${i.quantity}x)`).join(', ') || 'Без моделей'}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-white block">
                      {price.toLocaleString('ru-RU')} сум
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border inline-block mt-0.5 ${getStatusBadge(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deadlines Overview (Shown ONLY if there are active deadlines) */}
      {upcomingDeadlines.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Ближайшие дедлайны
            </h2>
            <span className="text-[10px] text-amber-400/80 font-medium">
              {upcomingDeadlines.length} {upcomingDeadlines.length === 1 ? 'заказ' : 'заказа'}
            </span>
          </div>

          <div className="space-y-2">
            {upcomingDeadlines.slice(0, 3).map((order) => {
              const daysLeft = Math.ceil(
                (new Date(order.deadline!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );
              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between hover:border-slate-700 cursor-pointer transition"
                >
                  <div>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">#100{order.orderNumber}</span>
                    <p className="text-xs font-semibold text-slate-200">
                      {getClientDisplayName(order.client)} &bull; {order.items.length} {order.items.length === 1 ? 'модель' : 'моделей'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-400 block">
                      {new Date(order.deadline!).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                    <p className={`text-[10px] ${daysLeft <= 1 ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                      {daysLeft <= 0 ? 'Сегодня / Просрочен' : `${daysLeft} дн. осталось`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      <OrderDetailModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
    </div>
  );
};
