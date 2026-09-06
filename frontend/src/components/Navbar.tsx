import {
  Eye, Grid, Search, FileSpreadsheet, Bell,
  LogOut, ShieldCheck
} from 'lucide-react';
import { UserSession } from '../types';
import { tacticalAudio } from '../utils/audio';

interface NavbarProps {
  currentView: number;
  onSelectView: (view: number) => void;
  userSession: UserSession;
  onLogout: () => void;
  unacknowledgedAlertsCount: number;
}

export function Navbar({
  currentView,
  onSelectView,
  userSession,
  onLogout,
  unacknowledgedAlertsCount
}: NavbarProps) {
  const navItems = [
    { id: 1, label: 'Camera Grid', icon: Grid },
    { id: 2, label: 'Search & Trace', icon: Search },
    { id: 3, label: 'Live Events', icon: FileSpreadsheet },
    {
      id: 4,
      label: 'Alerts',
      icon: Bell,
      count: unacknowledgedAlertsCount
    }
  ];

  return (
    <header className="w-full bg-[#111826] border-b border-[#233046] sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Brand */}
        <div
          onClick={() => onSelectView(1)}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-[#3FD6A6]/10 border border-[#3FD6A6]/30 flex items-center justify-center text-[#3FD6A6]">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-[#E7ECF3] tracking-wide">
                PROJECT BIG EYE
              </span>
              <span className="w-2 h-2 rounded-full bg-[#3FD6A6] animate-pulse" />
            </div>
            <div className="text-[10px] text-[#8996A8]">
              Gujarat Statewide CCTV Grid
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-[#0A0F16] p-1 rounded-xl border border-[#233046]">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  tacticalAudio.playClickBeep();
                  onSelectView(item.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${isActive
                    ? 'bg-[#1A2436] text-[#3FD6A6] shadow-sm font-semibold'
                    : 'text-[#8996A8] hover:text-[#E7ECF3] hover:bg-[#151E2E]/60'
                  }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#3FD6A6]' : 'text-[#8996A8]'}`} />
                <span>{item.label}</span>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#E85D5D] text-white animate-pulse">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* User Sign Out */}
          <button
            type="button"
            onClick={onLogout}
            title={`Sign out (${userSession.badgeNumber || 'Admin'})`}
            className="p-1.5 rounded-lg text-[#8996A8] hover:text-[#E85D5D] hover:bg-[#151E2E] border border-transparent hover:border-[#233046] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
