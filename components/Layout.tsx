
import React from 'react';
import { LayoutDashboard, Trophy, ClipboardPen, Settings } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  return (
    <div className="flex flex-col h-[100dvh] w-full relative font-sans text-zinc-200 bg-transparent overflow-hidden">
      
      <header className="flex-none fixed top-0 left-0 right-0 z-40 pt-[calc(env(safe-area-inset-top)+8px)] pb-3 nav-glass border-b border-white/10 shadow-glass backdrop-blur-xl">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        
        <div className="max-w-md mx-auto px-5 flex items-center justify-between h-12">
          <div className="flex items-center gap-4 w-full">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center shadow-inner border border-white/5 shrink-0 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-tr from-sunset-rose/20 via-transparent to-sunset-gold/20 opacity-80"></div>
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#logo-gradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">
                  <defs>
                    <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f43f5e" />
                    </linearGradient>
                  </defs>
                  <circle cx="5.5" cy="17.5" r="3.5"/>
                  <circle cx="18.5" cy="17.5" r="3.5"/>
                  <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/>
               </svg>
            </div>
            
            <div className="flex flex-col justify-center flex-1">
              <h1 className="text-xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 leading-none transform -skew-x-6 drop-shadow-sm">
                睿睿滑步車
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="h-0.5 w-6 rounded-full bg-gradient-to-r from-sunset-rose to-sunset-gold"></div>
                <span className="text-[10px] text-zinc-400 font-bold tracking-[0.25em] uppercase leading-none">LOUIE RUNBIKE</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto relative overflow-hidden flex flex-col pt-[calc(env(safe-area-inset-top)+68px)] pb-[calc(60px+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 nav-glass border-t border-white/10 shadow-glass backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-sunset-rose/40 to-transparent"></div>
        <div className="max-w-md mx-auto grid grid-cols-4 h-[60px] px-2">
            <NavButton active={currentPage === 'dashboard'} onClick={() => onNavigate('dashboard')} icon={<LayoutDashboard size={22} />} label="總覽" />
            <NavButton active={currentPage === 'races'} onClick={() => onNavigate('races')} icon={<Trophy size={22} />} label="賽事" />
            <NavButton active={currentPage === 'training'} onClick={() => onNavigate('training')} icon={<ClipboardPen size={22} />} label="紀錄" />
            <NavButton active={currentPage === 'settings'} onClick={() => onNavigate('settings')} icon={<Settings size={22} />} label="設定" />
        </div>
      </nav>
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactElement<any>;
  label: string;
}

const NavButton = ({ active, onClick, icon, label }: NavButtonProps) => (
  <button onClick={onClick} className="w-full h-full flex flex-col items-center justify-center gap-1 transition-all active:bg-white/5 relative">
    {active && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-12 bg-gradient-to-t from-sunset-rose/10 to-transparent blur-xl rounded-t-full pointer-events-none"></div>}
    <div className={`transition-all duration-300 ${active ? 'transform -translate-y-0.5 scale-110' : 'text-zinc-500'}`}>
       {active ? (
         <div className="relative">
            <svg width="0" height="0"><linearGradient id="icon-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#f43f5e" /></linearGradient></svg>
            {React.cloneElement(icon, { stroke: "url(#icon-grad)", strokeWidth: 2.5, className: 'drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]' } as any)}
         </div>
       ) : React.cloneElement(icon, { strokeWidth: 2 } as any)}
    </div>
    <span className={`text-[10px] font-bold ${active ? 'text-white opacity-100' : 'text-zinc-600 opacity-80'}`}>{label}</span>
    {active && <div className="absolute top-0 inset-x-4 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_2px_8px_#f43f5e]" />}
  </button>
);

export default Layout;
