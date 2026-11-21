import React from 'react';
import { motion } from 'motion/react';
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
import { PWAInstallButton } from './PWAInstallButton';

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
      <header className="sticky top-0 z-40 relative overflow-hidden bg-gradient-to-r from-[#9A3412]/96 via-[#C2410C]/95 to-[#EA580C]/96 text-[#FAF0DF] border-b border-[#FAF0DF]/20 shadow-[0_12px_34px_-8px_rgba(124,45,18,0.45)] backdrop-blur-xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-44 bg-gradient-to-r from-transparent via-white/16 to-transparent animate-sheen"
        />
        <div className="relative z-10 max-w-7xl mx-auto px-3.5 sm:px-6 h-12 md:h-14 flex items-center justify-between gap-2.5 md:gap-6">
          <button
            type="button"
            onClick={() => onSelectTab('accueil')}
            className="inline-flex items-center gap-2 font-display text-lg sm:text-xl font-extrabold tracking-tight text-[#FAF0DF] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDBA74] rounded-md px-1"
          >
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FAF0DF] via-[#F4E3CA] to-[#FDBA74] text-[#9A3412] font-extrabold text-sm flex items-center justify-center shadow-sm">
              B
            </span>
            <span>BUDGESTY</span>
          </button>

          <nav
            aria-label="Navigation principale"
            className="hidden md:flex items-center gap-5 lg:gap-6 overflow-x-auto"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  className={`relative py-4 text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDBA74] ${
                    isActive
                      ? 'text-white font-semibold'
                      : 'text-[#FAF0DF]/85 hover:text-white'
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <motion.span
                      layoutId="desktop-nav-underline"
                      transition={{ type: 'spring', stiffness: 460, damping: 32 }}
                      className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t-full bg-gradient-to-r from-[#FAF0DF] via-[#FDE2C4] to-[#FDBA74] shadow-[0_-2px_12px_rgba(253,186,116,0.85)]"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />

            <motion.button
              type="button"
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.96 }}
              onClick={onOpenPdf}
              className="inline-flex items-center gap-1.5 min-h-[36px] md:min-h-[38px] px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FAF0DF] via-[#F6EAD6] to-[#FDE2C4] text-[#9A3412] text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDBA74]"
            >
              <FileText className="w-4 h-4 shrink-0 text-[#15803D]" />
              <span>Bilan PDF</span>
            </motion.button>
          </div>
        </div>
      </header>

      <nav
        aria-label="Navigation mobile"
        className="md:hidden fixed bottom-2 left-2.5 right-2.5 z-40 rounded-2xl bg-gradient-to-r from-[#9A3412]/96 via-[#C2410C]/96 to-[#EA580C]/96 backdrop-blur-2xl text-[#FAF0DF] border border-[#FAF0DF]/25 shadow-[0_18px_42px_-8px_rgba(124,45,18,0.55)] pb-safe"
      >
        <div className="grid grid-cols-6 h-14 px-1 items-center">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[46px] rounded-xl text-[10px] font-medium transition-colors cursor-pointer focus-visible:outline-none ${
                  isActive ? 'text-[#9A3412] font-bold' : 'text-[#FAF0DF]/90 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="mobile-nav-indicator"
                    transition={{ type: 'spring', stiffness: 460, damping: 32 }}
                    className="absolute inset-1 rounded-xl bg-gradient-to-br from-[#FAF0DF] via-[#F4E3CA] to-[#FDE2C4] shadow-md -z-10"
                  />
                )}
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#15803D]' : ''}`} />
                <span className="truncate max-w-full px-0.5 leading-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
