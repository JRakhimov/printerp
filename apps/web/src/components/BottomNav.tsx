import React from 'react';
import { Home, Package, Box, MoreHorizontal } from 'lucide-react';

export type TabType = 'home' | 'orders' | 'projects' | 'more';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const navItems = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'orders' as TabType, label: 'Orders', icon: Package },
    { id: 'projects' as TabType, label: 'Projects', icon: Box },
    { id: 'more' as TabType, label: 'More', icon: MoreHorizontal },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-2 py-1.5 shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'text-blue-400 font-semibold bg-blue-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'scale-110 text-blue-400' : ''}`} />
              <span className="text-[11px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
