
import React, { useState } from 'react';
import { Trash2, Plus, Star, User, Activity, Settings as SettingsIcon, Edit2, Save, X, Flag, Loader2, AlertTriangle, Lock, Unlock } from 'lucide-react';
import { LookupItem } from '../types';
import { api } from '../services/api';

interface SettingsProps {
  trainingTypes: LookupItem[];
  raceGroups: LookupItem[];
  defaultType: string;
  personName: string;
  people: LookupItem[];
  refreshData: () => Promise<void>;
  onUpdateDefault: (type: string) => void;
  onUpdateName: (name: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ trainingTypes, raceGroups, defaultType, personName, people, refreshData, onUpdateDefault, onUpdateName }) => {
  const [newType, setNewType] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [editingType, setEditingType] = useState<LookupItem | null>(null);
  const [editingGroup, setEditingGroup] = useState<LookupItem | null>(null);

  // 選手名單管理狀態
  const [isPeopleUnlocked, setIsPeopleUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [newPerson, setNewPerson] = useState('');
  const [editingPerson, setEditingPerson] = useState<LookupItem | null>(null);

  // 用於自定義刪除確認視窗
  const [deleteTarget, setDeleteTarget] = useState<{table: 'training-types' | 'races' | 'people', id: number | string, name: string} | null>(null);

  const handleAction = async (action: () => Promise<boolean>) => {
    setIsSyncing(true);
    const success = await action();
    if (success) await refreshData();
    else alert('同步操作失敗');
    setIsSyncing(false);
  };

  const handleAddType = () => handleAction(() => api.manageLookup('training-types', newType).then(res => { setNewType(''); return res; }));
  
  const handleToggleDefault = async (type: LookupItem) => {
    // 呼叫 API 更新後端的 is_default
    await handleAction(() => api.manageLookup('training-types', type.name, type.id, false, true));
    onUpdateDefault(type.name); // 更新本地 App state
  };

  const handleUpdateType = () => editingType && handleAction(() => api.manageLookup('training-types', editingType.name, editingType.id, false, editingType.is_default).then(res => { setEditingType(null); return res; }));
  
  const handleAddGroup = () => handleAction(() => api.manageLookup('races', newGroup).then(res => { setNewGroup(''); return res; }));
  const handleUpdateGroup = () => editingGroup && handleAction(() => api.manageLookup('races', editingGroup.name, editingGroup.id).then(res => { setEditingGroup(null); return res; }));

  // 選手操作
  const handleUnlock = () => {
    if (passwordInput === 'chiachiacm') {
      setIsPeopleUnlocked(true);
      setShowPasswordModal(false);
      setPasswordInput('');
    } else {
      alert('密碼錯誤');
    }
  };

  const handleAddPerson = () => handleAction(() => api.manageLookup('people', newPerson).then(res => { setNewPerson(''); return res; }));
  const handleUpdatePerson = () => editingPerson && handleAction(() => api.manageLookup('people', editingPerson.name, editingPerson.id).then(res => { setEditingPerson(null); return res; }));

  const executeDelete = async () => {
    if (!deleteTarget) return;
    await handleAction(() => api.manageLookup(deleteTarget.table, '', deleteTarget.id, true));
    setDeleteTarget(null);
  };

  return (
    <div className="h-full overflow-y-auto px-3 pt-4 pb-20 space-y-6 animate-fade-in no-scrollbar">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center border border-white/5 shadow-inner">
            <SettingsIcon size={20} className="text-zinc-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">系統設定</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">D1 Strategic Configuration</p>
          </div>
        </div>
        {isSyncing && <Loader2 size={16} className="animate-spin text-rose-500" />}
      </div>

      <section className="glass-card rounded-2xl p-5 border border-white/5">
        <div className="flex items-center justify-between mb-4">
           <h3 className="text-xs font-bold text-zinc-500 flex items-center tracking-widest uppercase gap-2"><User size={14} className="text-rose-500" /> 選手名單管理</h3>
           <button 
             onClick={() => isPeopleUnlocked ? setIsPeopleUnlocked(false) : setShowPasswordModal(true)} 
             className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${isPeopleUnlocked ? 'text-green-500 bg-green-500/10' : 'text-zinc-500 bg-zinc-800'}`}
           >
              {isPeopleUnlocked ? <Unlock size={14} /> : <Lock size={14} />}
           </button>
        </div>

        {isPeopleUnlocked ? (
          <>
            <div className="flex gap-3 mb-5">
              <input type="text" value={newPerson} onChange={(e) => setNewPerson(e.target.value)} placeholder="新增選手姓名..." className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-rose-500/50 shadow-inner" />
              <button onClick={handleAddPerson} disabled={!newPerson || isSyncing} className="bg-zinc-800 text-white rounded-xl px-4 border border-white/5 shadow-lg"><Plus size={20} /></button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar pr-1">
              {people.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-zinc-900/40 p-3 rounded-xl border border-white/5">
                  {editingPerson?.id === p.id ? (
                    <div className="flex-1 flex gap-2 mr-2">
                      <input autoFocus className="w-full bg-black/60 text-white text-xs px-2 py-1 rounded border border-rose-500/50 outline-none" value={editingPerson.name} onChange={(e) => setEditingPerson({...editingPerson, name: e.target.value})} />
                      <button onClick={handleUpdatePerson} className="text-green-500"><Save size={16}/></button>
                      <button onClick={() => setEditingPerson(null)} className="text-zinc-500"><X size={16}/></button>
                    </div>
                  ) : (
                    <span className="text-xs font-black text-zinc-300 tracking-wider pl-2">{p.name}</span>
                  )}
                  <div className="flex items-center gap-1">
                     {!editingPerson && (
                       <>
                        <button onClick={() => setEditingPerson({id: p.id, name: p.name})} className="p-2 text-zinc-600 hover:text-blue-400"><Edit2 size={16} /></button>
                        <button onClick={() => setDeleteTarget({table: 'people', id: p.id, name: p.name})} className="p-2 text-zinc-600 hover:text-rose-500"><Trash2 size={16} /></button>
                       </>
                     )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            {people.map(p => (
               <div key={p.id} className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl px-4 py-2 text-white text-xs font-black tracking-wider shadow-sm">
                 {p.name}
               </div>
            ))}
            {people.length === 0 && <span className="text-zinc-600 text-[10px] italic">暫無名單</span>}
          </div>
        )}
      </section>

      <section className="glass-card rounded-2xl p-5 border border-white/5">
        <h3 className="text-xs font-bold text-zinc-500 mb-4 flex items-center tracking-widest uppercase gap-2"><Activity size={14} className="text-amber-500" /> 訓練項目管理</h3>
        <div className="flex gap-3 mb-5">
          <input type="text" value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="新增訓練項目..." className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50 shadow-inner" />
          <button onClick={handleAddType} disabled={!newType || isSyncing} className="bg-zinc-800 text-white rounded-xl px-4 border border-white/5 shadow-lg"><Plus size={20} /></button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar pr-1">
          {trainingTypes.map((t) => (
            <div key={t.id} className="flex items-center justify-between bg-zinc-900/40 p-3 rounded-xl border border-white/5">
              {editingType?.id === t.id ? (
                <div className="flex-1 flex gap-2 mr-2">
                  <input autoFocus className="w-full bg-black/60 text-white text-xs px-2 py-1 rounded border border-amber-500/50 outline-none" value={editingType.name} onChange={(e) => setEditingType({...editingType, name: e.target.value})} />
                  <button onClick={handleUpdateType} className="text-green-500"><Save size={16}/></button>
                  <button onClick={() => setEditingType(null)} className="text-zinc-500"><X size={16}/></button>
                </div>
              ) : (
                <span className="text-xs font-black text-zinc-300 tracking-wider pl-2">{t.name}</span>
              )}
              <div className="flex items-center gap-1">
                 {!editingType && (
                   <>
                    <button onClick={() => handleToggleDefault(t)} className={`p-2 rounded-lg transition-colors ${t.is_default ? 'text-amber-500 bg-amber-500/10' : 'text-zinc-600 hover:text-amber-500'}`}><Star size={16} fill={t.is_default ? "currentColor" : "none"} /></button>
                    <button onClick={() => setEditingType({id: t.id, name: t.name, is_default: t.is_default})} className="p-2 text-zinc-600 hover:text-blue-400"><Edit2 size={16} /></button>
                    <button onClick={() => setDeleteTarget({table: 'training-types', id: t.id, name: t.name})} className="p-2 text-zinc-600 hover:text-rose-500"><Trash2 size={16} /></button>
                   </>
                 )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5 border border-white/5">
        <h3 className="text-xs font-bold text-zinc-500 mb-4 flex items-center tracking-widest uppercase gap-2"><Flag size={14} className="text-cyan-500" /> 賽事系列管理</h3>
        <div className="flex gap-3 mb-5">
          <input type="text" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="新增賽事系列..." className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 shadow-inner" />
          <button onClick={handleAddGroup} disabled={!newGroup || isSyncing} className="bg-zinc-800 text-white rounded-xl px-4 border border-white/5 shadow-lg"><Plus size={20} /></button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar pr-1">
          {raceGroups.map((g) => (
            <div key={g.id} className="flex items-center justify-between bg-zinc-900/40 p-3 rounded-xl border border-white/5">
              {editingGroup?.id === g.id ? (
                <div className="flex-1 flex gap-2 mr-2">
                  <input autoFocus className="w-full bg-black/60 text-white text-xs px-2 py-1 rounded border border-cyan-500/50 outline-none" value={editingGroup.name} onChange={(e) => setEditingGroup({...editingGroup, name: e.target.value})} />
                  <button onClick={handleUpdateGroup} className="text-green-500"><Save size={16}/></button>
                  <button onClick={() => setEditingGroup(null)} className="text-zinc-500"><X size={16}/></button>
                </div>
              ) : (
                <span className="text-xs font-black text-zinc-300 tracking-wider pl-2">{g.name}</span>
              )}
              <div className="flex items-center gap-1">
                 {!editingGroup && (
                   <>
                    <button onClick={() => setEditingGroup({id: g.id, name: g.name})} className="p-2 text-zinc-600 hover:text-blue-400"><Edit2 size={16} /></button>
                    <button onClick={() => setDeleteTarget({table: 'races', id: g.id, name: g.name})} className="p-2 text-zinc-600 hover:text-rose-500"><Trash2 size={16} /></button>
                   </>
                 )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 自定義美化確認視窗 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-xs rounded-3xl p-6 shadow-2xl border-rose-500/30 text-center animate-scale-in">
            <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
               <AlertTriangle size={32} className="text-rose-500" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">確認移除項目？</h3>
            <p className="text-[10px] text-zinc-400 mb-6 leading-relaxed uppercase tracking-wider font-bold">
              項目「{deleteTarget.name}」的所有相關數據與關聯將會失效。
            </p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button onClick={() => setDeleteTarget(null)} className="py-3 bg-zinc-900 text-zinc-400 font-bold text-xs rounded-xl active:bg-zinc-800 transition-colors border border-white/5">取消</button>
              <button onClick={executeDelete} className="py-3 bg-rose-600 text-white font-bold text-xs rounded-xl active:scale-95 transition-all shadow-glow-rose">
                確定刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 密碼驗證 Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-xs rounded-3xl p-6 shadow-2xl border-white/10 animate-scale-in">
            <div className="text-center mb-6">
               <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                 <Lock size={20} className="text-white" />
               </div>
               <h3 className="text-lg font-black text-white">管理員驗證</h3>
               <p className="text-[10px] text-zinc-500 mt-1">請輸入密碼以編輯選手名單</p>
            </div>
            <input 
              autoFocus
              type="password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-center tracking-widest mb-4 outline-none focus:border-rose-500/50"
            />
            <div className="grid grid-cols-2 gap-3">
               <button onClick={() => { setShowPasswordModal(false); setPasswordInput(''); }} className="py-3 bg-zinc-900 text-zinc-400 font-bold text-xs rounded-xl">取消</button>
               <button onClick={handleUnlock} className="py-3 bg-rose-600 text-white font-bold text-xs rounded-xl">解鎖</button>
            </div>
          </div>
        </div>
      )}

      <section className="text-center pt-8 opacity-30">
        <div className="text-[10px] font-black text-zinc-500 tracking-[0.4em] uppercase">Louie Professional</div>
        <div className="text-[8px] text-zinc-600 mt-2 font-mono italic">Performance Core v3.2 (D1 Engine)</div>
      </section>
    </div>
  );
};

export default Settings;
