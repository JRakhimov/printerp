import React from 'react';
import { useOrders, OrderStatus } from '../hooks/useOrders';
import { useFinancialSummary } from '../hooks/useFinance';
import { usePrinters } from '../hooks/usePrinters';
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
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { data: orders } = useOrders();
  const { data: summary } = useFinancialSummary();
  const { data: printers } = usePrinters();

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

  // Upcoming deadlines (next active orders with deadline sorted ascending)
  const upcomingDeadlines = activeOrders
    .filter((o) => !!o.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());

  return (
    <div className="space-y-4 pb-20">
      {/* Quick Dashboard Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-blue-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Orders</span>
            <Package className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-white">
            {printingCount}/{activeOrders.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {printingCount} printing / {activeOrders.length} active
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Net Profit</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-emerald-400">{netProfit.toLocaleString('ru-RU')} сум</p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Rev: {revenue.toLocaleString('ru-RU')}</span>
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
                Orders Created Today
              </span>
              <span className="text-sm font-bold text-white">
                {todayOrdersCount} {todayOrdersCount === 1 ? 'order created' : 'orders created'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Stock Asset Block */}
      {summary && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                Inventory Assets Stock
              </span>
              <span className="text-sm font-bold text-white">
                {summary.inventoryValuation.toLocaleString('ru-RU')} сум
              </span>
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
                Unpaid Client Balance
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
            Bambu Lab Fleet
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">
            {printers?.filter((p) => p.lastStatus === 'RUNNING' || p.lastStatus === 'PRINTING').length || 0} printing / {printers?.length || 0} total
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
              const timeString = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

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
                      {printer.lastStatus || 'IDLE'}
                    </span>
                  </div>

                  {isPrinting && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span className="truncate max-w-[180px] flex items-center gap-1">
                          <FileCode className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{printer.currentFile || 'Printing...'}</span>
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
                        {timeString} left
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No Bambu Lab printers connected yet.</p>
        )}
      </div>

      {/* Deadlines Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Upcoming Deadlines
        </h2>
        {upcomingDeadlines.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No upcoming deadlines.</p>
        ) : (
          <div className="space-y-2">
            {upcomingDeadlines.slice(0, 3).map((order) => {
              const daysLeft = Math.ceil(
                (new Date(order.deadline!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );
              return (
                <div key={order.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">#100{order.orderNumber}</span>
                    <p className="text-xs font-semibold text-slate-200">
                      {order.client?.name} — {order.items.length} items
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-amber-400">
                      {new Date(order.deadline!).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                    <p className="text-[10px] text-slate-400">{daysLeft} days remaining</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
