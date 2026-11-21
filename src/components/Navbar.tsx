import React from 'react';
import {
  FileText,
  History,
  Home,
  KeyRound,
  LockKeyhole,
  Receipt,
  Vault,
} from 'lucide-react';
import { NavTab } from '../types/budget';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenPdf: () => void;
}

const TABS: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'accueil', label: 'Accueil', icon: Home },
  { id: 'loyer', label: 'Loyer', icon: KeyRound },
  { id: 'fixes', label: 'Fixes', icon: LockKeyhole },
  { id: 'depenses', label: 'Dépenses', icon: Receipt },
  { id: 'caisses', label: 'Caisses', icon: Vault },
  { id: 'historique', label: 'Historique', icon: History },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenPdf,
}) => {
  return (
    <>
      <header className="sticky top-0 z-40 bg-[#075B2E] text-white border-b border-[#006B35]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => onSelectTab('accueil')}
            className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            BUDGESTY
          </button>

          <nav
            aria-label="Navigation principale"
            className="hidden md:flex items-center gap-6 overflow-x-auto"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  className={`relative py-4 text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? 'text-white font-semibold'
                      : 'text-[#DDEBD8] hover:text-white'
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-[#DDEBD8]" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onOpenPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#006B35] hover:bg-white hover:text-[#075B2E] text-white text-xs sm:text-sm font-semibold border border-[#DDEBD8]/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Bilan PDF</span>
            </button>
          </div>
        </div>
      </header>

      <nav
        aria-label="Navigation mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#075B2E] text-white border-t border-[#006B35]"
      >
        <div className="grid grid-cols-6 h-14">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#006B35] text-white font-semibold'
                    : 'text-[#DDEBD8] hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-full px-1">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
