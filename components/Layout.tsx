
import React from 'react';
import { LayoutDashboard, Trophy, ClipboardPen, Settings, ContactRound, BookOpen } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  title?: string;
  subtitle?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate, title = "嘉嘉來了", subtitle = "KIDS RUN BIKE" }) => {
  const handleManualClick = () => {
      window.open('https://pyltlobngdnoqjnrxefn.supabase.co/storage/v1/object/public/runbike/title/info_ccmd.txt', '_blank');
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full relative font-sans text-zinc-200 bg-transparent overflow-hidden">
      
      <header className="flex-none fixed top-0 left-0 right-0 z-40 pt-[calc(env(safe-area-inset-top)+8px)] pb-3 nav-glass border-b border-white/10 shadow-glass backdrop-blur-xl">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-chiachia-green/50 to-transparent"></div>
        
        <div className="max-w-md mx-auto px-5 flex items-center justify-between h-12">
          <div className="flex items-center gap-4">
            {/* Logo Container */}
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shadow-lg border border-chiachia-green/30 shrink-0 relative overflow-hidden group">
               <img src="https://pyltlobngdnoqjnrxefn.supabase.co/storage/v1/object/public/runbike/title/cccm.png" alt="Logo" className="w-full h-full object-contain p-0.5" onError={(e) => {
                   // Fallback if image missing
                   e.currentTarget.style.display = 'none';
                   e.currentTarget.parentElement!.innerHTML = '<span style="color:#39e75f; font-weight:900;">C.C</span>';
               }}/>
            </div>
            
            <div className="flex flex-col justify-center">
              <h1 className="text-2xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-chiachia-green via-white to-amber-400 leading-none transform -skew-x-6 drop-shadow-sm logo-text-glow">
                嘉嘉來了
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="h-0.5 w-6 rounded-full bg-chiachia-green shadow-[0_0_5px_#39e75f]"></div>
                <span className="text-xs text-zinc-400 font-bold tracking-[0.25em] uppercase leading-none">{subtitle}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end justify-center gap-1">
              <button 
                onClick={handleManualClick}
                className="flex items-center gap-1 text-xs text-zinc-600 font-bold hover:text-chiachia-green transition-colors active:scale-95"
              >
                  <BookOpen size={14} />
                  <span>說明書</span>
              </button>
              <span className="text-[10px] font-mono text-zinc-700 tracking-wider">v20260125</span>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto relative overflow-hidden flex flex-col pt-[calc(env(safe-area-inset-top)+68px)] pb-[calc(60px+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 nav-glass border-t border-white/10 shadow-glass backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-chiachia-green/50 to-transparent"></div>
        <div className="max-w-md mx-auto grid grid-cols-5 h-[65px] px-2 pb-1">
            <NavButton active={currentPage === 'dashboard'} onClick={() => onNavigate('dashboard')} icon={<LayoutDashboard size={24} />} label="總覽" />
            <NavButton active={currentPage === 'personal'} onClick={() => onNavigate('personal')} icon={<ContactRound size={24} />} label="個人" />
            <NavButton active={currentPage === 'races'} onClick={() => onNavigate('races')} icon={<Trophy size={24} />} label="賽事" />
            <NavButton active={currentPage === 'training'} onClick={() => onNavigate('training')} icon={<ClipboardPen size={24} />} label="紀錄" />
            <NavButton active={currentPage === 'settings'} onClick={() => onNavigate('settings')} icon={<Settings size={24} />} label="設定" />
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
  <button onClick={onClick} className="w-full h-full flex flex-col items-center justify-center gap-1 transition-all active:bg-white/5 relative group">
    {active && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-10 bg-gradient-to-t from-chiachia-green/20 to-transparent blur-xl rounded-t-full pointer-events-none"></div>}
    <div className={`transition-all duration-300 ${active ? 'transform -translate-y-0.5 scale-110' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
       {active ? (
         <div className="relative">
            {/* Neon Green Gradient for Icons */}
            <svg width="0" height="0"><linearGradient id="icon-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#39e75f" /><stop offset="100%" stopColor="#22c55e" /></linearGradient></svg>
            {React.cloneElement(icon, { stroke: "url(#icon-grad)", strokeWidth: 2.5, className: 'drop-shadow-[0_0_8px_rgba(57,231,95,0.6)]' } as any)}
         </div>
       ) : React.cloneElement(icon, { strokeWidth: 2 } as any)}
    </div>
    <span className={`text-xs font-bold ${active ? 'text-white opacity-100' : 'text-zinc-600 opacity-80'}`}>{label}</span>
    {active && <div className="absolute top-0 inset-x-4 h-[2px] bg-gradient-to-r from-transparent via-chiachia-green to-transparent shadow-[0_2px_8px_#39e75f]" />}
  </button>
);

export default Layout;
