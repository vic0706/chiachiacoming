
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DataRecord, LookupItem } from '../types';
import { api } from '../services/api';
import { Trophy, Zap, Calendar, Activity, X, Trash2, Edit2, Check, ArrowRight, ChevronLeft, ChevronRight, Star, Users, Lock, Unlock, KeyRound, Loader2, MessageCircle, ChevronDown, MapPin, Plus, Save, Key, Settings, Camera, Link as LinkIcon, ExternalLink, Maximize, Image as ImageIcon, Filter, LogIn, LogOut, UploadCloud, UserCircle2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { uploadImage } from '../services/supabase';

interface PersonalProps {
  data: DataRecord[];
  people: LookupItem[];
  trainingTypes: LookupItem[];
  refreshData: () => Promise<void>;
  activePersonId: string | number;
  onSelectPerson: (id: string | number) => void;
  raceGroups: LookupItem[]; 
  targetDate?: string | null;
  onClearTargetDate?: () => void;
}

interface RiderListItemProps {
  person: LookupItem;
  isActive: boolean;
  onClick: () => void;
}

// Local Helper for Image Cropping in Personal Modal
const ImageCropperInput = ({ 
    label, 
    urlValue, 
    onChange, 
    ratioClass = 'h-32 w-full',
    personId,
    typeSuffix
}: { 
    label: string, 
    urlValue: string, 
    onChange: (val: string) => void, 
    ratioClass?: string,
    personId?: string | number,
    typeSuffix: 's' | 'b'
}) => {
  const [baseUrl, fragment] = urlValue.split('#');
  const [z, setZ] = useState(1);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [error, setError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const [, frag] = urlValue.split('#');
      const params = new URLSearchParams(frag || '');
      setZ(parseFloat(params.get('z') || '1'));
      setX(parseFloat(params.get('x') || '50'));
      setY(parseFloat(params.get('y') || '50'));
  }, [urlValue]);

  useEffect(() => { setError(false); }, [baseUrl]);
  
  const cropperRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });

  const updateUrl = (newZ: number, newX: number, newY: number) => {
      if (!baseUrl) return;
      onChange(`${baseUrl}#z=${newZ}&x=${newX}&y=${newY}`);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setIsUploading(true);
          const file = e.target.files[0];
          const customName = personId ? `${personId}_${typeSuffix}` : undefined;
          
          const result = await uploadImage(file, 'people', customName);
          
          if (result.url) {
              const timestampUrl = `${result.url}?t=${Date.now()}`;
              onChange(`${timestampUrl}#z=1&x=50&y=50`); 
          } else {
              alert(`上傳失敗: ${result.error}`);
          }
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
      isDragging.current = true;
      const point = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
      lastPoint.current = { x: point.clientX, y: point.clientY };
  };
  
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDragging.current || !cropperRef.current) return;
      if(e.cancelable) e.preventDefault();
      
      const point = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
      const dx = point.clientX - lastPoint.current.x;
      const dy = point.clientY - lastPoint.current.y;
      
      const rect = cropperRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
          const sensitivity = 0.8; 
          const deltaX = (dx / rect.width) * 100 * sensitivity;
          const deltaY = (dy / rect.height) * 100 * sensitivity;
          const newX = Math.min(100, Math.max(0, x + deltaX));
          const newY = Math.min(100, Math.max(0, y + deltaY));
          
          setX(newX);
          setY(newY);
          updateUrl(z, newX, newY);
      }
      lastPoint.current = { x: point.clientX, y: point.clientY };
  };
  const handleDragEnd = () => isDragging.current = false;

  return (
      <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1"><ImageIcon size={12}/> {label}</label>
          <div className="flex gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect}/>
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full px-4 py-3 bg-zinc-800 rounded-xl text-white active:scale-95 border border-white/5 flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all shadow-lg text-xs font-bold tracking-wider">
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                {isUploading ? '選擇照片並上傳' : '選擇照片並上傳'}
            </button>
          </div>

          {baseUrl && (
               <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10 shadow-lg mt-2 animate-fade-in">
                  <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1"><Maximize size={10}/> 縮放與位置調整</div>
                  <div className="flex justify-center bg-black rounded-xl border border-white/5 p-2">
                    <div ref={cropperRef} className={`relative overflow-hidden bg-zinc-900 border border-white/10 shadow-inner group cursor-move touch-none ${ratioClass}`} style={{ touchAction: 'none' }} onMouseDown={handleDragStart} onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd} onTouchStart={handleDragStart} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}>
                        {!error ? (
                            <img src={baseUrl} className="w-full h-full object-contain pointer-events-none select-none" style={{ transform: `translate(${(x - 50) * 1.5}%, ${(y - 50) * 1.5}%) scale(${z})` }} onError={() => setError(true)} />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-600 space-y-2"><ImageIcon size={24} className="opacity-30"/></div>
                        )}
                        <div className="absolute inset-0 pointer-events-none opacity-20"><div className="w-full h-full border border-white/30 flex"><div className="flex-1 border-r border-white/30"></div><div className="flex-1 border-r border-white/30"></div><div className="flex-1"></div></div><div className="absolute inset-0 flex flex-col"><div className="flex-1 border-b border-white/30"></div><div className="flex-1 border-b border-white/30"></div><div className="flex-1"></div></div></div>
                    </div>
                  </div>
                  <div className="px-1">
                      <div className="flex justify-between text-[8px] text-zinc-500 font-mono mb-1"><span>ZOOM: {z.toFixed(2)}x</span><span>POS: {x.toFixed(0)},{y.toFixed(0)}</span></div>
                      <input type="range" min="0.1" max="5" step="0.01" value={z} onChange={e => { const val = parseFloat(e.target.value); setZ(val); updateUrl(val, x, y); }} className="w-full accent-sunset-rose h-1.5 bg-zinc-800 rounded-full appearance-none shadow-inner" />
                  </div>
              </div>
          )}
      </div>
  );
};

const RiderListItem: React.FC<RiderListItemProps> = ({ person, isActive, onClick }) => {
    const [error, setError] = useState(false);
    const dbUrl = person.s_url || '';
    const [baseUrl, fragment] = dbUrl.split('#');
    const src = baseUrl || `/riders/${person.id}_s.jpg`;
    
    let sz=1, sx=50, sy=50;
    if(fragment) {
        const sp = new URLSearchParams(fragment);
        sz = parseFloat(sp.get('z')||'1');
        sx = parseFloat(sp.get('x')||'50');
        sy = parseFloat(sp.get('y')||'50');
    }

    useEffect(() => { setError(false); }, [src]);

    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98] ${isActive ? 'bg-white/10 border-sunset-rose/50 shadow-glow-rose' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
        >
            <div className={`w-10 h-10 rounded-full flex-none overflow-hidden flex items-center justify-center border ${isActive ? 'border-sunset-rose' : 'border-white/10 bg-zinc-900'}`}>
                {!error ? (
                    <img 
                        src={src} 
                        className="w-full h-full object-cover" 
                        style={{transform: `translate(${(sx - 50) * 1.5}%, ${(sy - 50) * 1.5}%) scale(${sz})`}} 
                        onError={() => setError(true)}
                        alt={person.name}
                    />
                ) : (
                    <span className={`text-sm font-black ${isActive ? 'text-white' : 'text-zinc-500'}`}>{person.name.charAt(0)}</span>
                )}
            </div>
            <span className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-zinc-400'}`}>{person.name}</span>
            {isActive && <Check size={16} className="ml-auto text-sunset-rose" />}
        </button>
    );
};

const Personal: React.FC<PersonalProps> = ({ data, people, trainingTypes, refreshData, activePersonId, onSelectPerson, raceGroups, targetDate, onClearTargetDate }) => {
  const [selectedType, setSelectedType] = useState<string>(trainingTypes[0]?.name || '');
  
  const [raceFilterStatus, setRaceFilterStatus] = useState<'all' | 'registered' | 'available' | 'finished'>('registered');
  const [raceFilterSeries, setRaceFilterSeries] = useState<string>('');

  const [expandedRaceId, setExpandedRaceId] = useState<string | number | null>(null);

  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | number | null>(null);
  const [editValue, setEditValue] = useState('');
  
  const [isEditUnlocked, setIsEditUnlocked] = useState(false);

  const [showPlayerList, setShowPlayerList] = useState(false);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInput, setAuthInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [authTitle, setAuthTitle] = useState('權限驗證');
  const [authPlaceholder, setAuthPlaceholder] = useState('Password / OTP');

  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [showSettingsMode, setShowSettingsMode] = useState(false); 
  
  const [wordFeedback, setWordFeedback] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [passFeedback, setPassFeedback] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const [isAddingRace, setIsAddingRace] = useState(false); 
  const [editingRaceId, setEditingRaceId] = useState<string | number | null>(null); 
  
  const [editMyWord, setEditMyWord] = useState('');
  const [tempSUrl, setTempSUrl] = useState('');
  const [tempBUrl, setTempBUrl] = useState('');
  
  const [raceForm, setRaceForm] = useState({
      id: '' as string | number,
      date: format(new Date(), 'yyyy-MM-dd'),
      name: '',
      race_id: '', 
      address: '',
      rank: '',
      note: '',
      url: '',
      event_id: '' as string | number
  });

  const [zoomScale, setZoomScale] = useState(1);
  const [posX, setPosX] = useState(50); 
  const [posY, setPosY] = useState(50); 
  const cropperRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [myWordImgError, setMyWordImgError] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
      if (targetDate) {
          setDetailDate(targetDate);
          setShowDetailModal(true);
          if (onClearTargetDate) onClearTargetDate();
      }
  }, [targetDate, onClearTargetDate]);

  useEffect(() => {
    if (!showDetailModal) {
        setIsEditUnlocked(false);
        setEditingRecordId(null);
    }
  }, [showDetailModal]);

  useEffect(() => {
      if(!showPersonalInfoModal) {
          setIsAddingRace(false);
          setEditingRaceId(null);
          setShowSettingsMode(false);
          setWordFeedback(null);
          setPassFeedback(null);
      }
  }, [showPersonalInfoModal]);

  useEffect(() => {
    if (!selectedType && trainingTypes.length > 0) {
        setSelectedType(trainingTypes[0].name);
    }
  }, [trainingTypes, selectedType]);

  const activePeople = useMemo(() => {
    const list = people.filter(p => !p.is_hidden);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [people]);

  useEffect(() => {
    if (activePeople.length > 0) {
        const exists = activePeople.find(p => String(p.id) === String(activePersonId));
        if (!exists) {
            onSelectPerson(activePeople[0].id);
        }
    }
  }, [activePeople, activePersonId, onSelectPerson]);

  const currentIndex = activePeople.findIndex(p => String(p.id) === String(activePersonId));
  const person = activePeople[currentIndex >= 0 ? currentIndex : 0] || activePeople[0];

  useEffect(() => {
    if (activePeople.length > 0) {
        const randomIndex = Math.floor(Math.random() * activePeople.length);
        onSelectPerson(activePeople[randomIndex].id);
    }
  }, []);

  useEffect(() => {
      setImgError(false);
      setMyWordImgError(false);
      setEditMyWord(person?.myword || '');
      setTempSUrl(person?.s_url || '');
      setTempBUrl(person?.b_url || '');
  }, [person?.id, person?.myword, person?.s_url, person?.b_url]);

  const [bUrlBase, bUrlFragment] = useMemo(() => {
      if (!person) return ['', ''];
      const dbUrl = person.b_url || '';
      const [base, frag] = dbUrl.split('#');
      const finalUrl = base || `/riders/${person.id}_b.jpg`;
      return [finalUrl, frag || ''];
  }, [person]);

  let bz=1, bx=50, by=50;
  if(bUrlFragment) {
     const sp = new URLSearchParams(bUrlFragment);
     bz = parseFloat(sp.get('z')||'1');
     bx = parseFloat(sp.get('x')||'50');
     by = parseFloat(sp.get('y')||'50');
  }

  const [sUrlBase, sUrlFragment] = useMemo(() => {
      if (!person) return ['', ''];
      const dbUrl = person.s_url || '';
      const [base, frag] = dbUrl.split('#');
      const finalUrl = base || `/riders/${person.id}_s.jpg`;
      return [finalUrl, frag || ''];
  }, [person]);
  let sz=1, sx=50, sy=50;
  if(sUrlFragment) {
      const sp = new URLSearchParams(sUrlFragment);
      sz = parseFloat(sp.get('z')||'1');
      sx = parseFloat(sp.get('x')||'50');
      sy = parseFloat(sp.get('y')||'50');
  }

  // Navigation Logic
  const handlePrevPerson = () => {
      const newIndex = currentIndex > 0 ? currentIndex - 1 : activePeople.length - 1;
      onSelectPerson(activePeople[newIndex].id);
  };
  const handleNextPerson = () => {
      const newIndex = currentIndex < activePeople.length - 1 ? currentIndex + 1 : 0;
      onSelectPerson(activePeople[newIndex].id);
  };

  const personRecords = useMemo(() => {
    if (!person) return [];
    return data.filter(d => 
        String(d.people_id) === String(person.id) && 
        d.item === 'training' && 
        (!selectedType || d.name === selectedType)
    );
  }, [data, person, selectedType]);

  const displayedRaces = useMemo(() => {
      if (!person) return [];
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      
      const myRaces = data.filter(d => d.item === 'race' && String(d.people_id) === String(person.id) && d.value !== 'PREVIEW');
      const myEventIds = new Set(myRaces.map(r => String(r.event_id)));

      const availablePreviews = data.filter(d => 
          d.item === 'race' && 
          d.value === 'PREVIEW' && 
          !myEventIds.has(String(d.event_id)) &&
          d.date >= todayStr 
      );

      let result: DataRecord[] = [];

      if (raceFilterStatus === 'registered') {
          result = myRaces.filter(r => r.date >= todayStr);
      } else if (raceFilterStatus === 'finished') {
          result = myRaces.filter(r => r.date < todayStr);
      } else if (raceFilterStatus === 'available') {
          result = availablePreviews;
      } else {
          result = [...myRaces, ...availablePreviews];
      }

      if (raceFilterSeries) {
          result = result.filter(r => r.race_group === raceFilterSeries || r.race_id === raceFilterSeries); 
      }

      return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data, person, raceFilterStatus, raceFilterSeries]);

  const dailyStats = useMemo(() => {
    const grouped = new Map<string, number[]>();
    personRecords.forEach(r => {
        if (!grouped.has(r.date)) grouped.set(r.date, []);
        grouped.get(r.date)!.push(parseFloat(r.value));
    });

    const stats: { date: string, avg: number, best: number, stability: number, count: number }[] = [];
    grouped.forEach((values, date) => {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const best = Math.min(...values);

        const squareDiffs = values.map(v => Math.pow(v - avg, 2));
        const variance = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(variance);
        const stability = Math.max(0, 100 - (stdDev * 40));

        stats.push({ date, avg, best, stability, count: values.length });
    });

    return stats.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [personRecords]);

  const allTimeBest = useMemo(() => {
     if (personRecords.length === 0) return null;
     return Math.min(...personRecords.map(r => parseFloat(r.value)));
  }, [personRecords]);

  const detailRecords = useMemo(() => {
      if (!detailDate) return [];
      return personRecords
        .filter(r => r.date === detailDate)
        .sort((a, b) => parseFloat(a.value) - parseFloat(b.value));
  }, [personRecords, detailDate]);

  const checkAuth = (action: () => void, isPersonalInfo = false) => {
      if (isPersonalInfo) {
          setAuthTitle('個人身份驗證');
          setAuthPlaceholder('請輸入個人密碼'); 
          setPendingAction(() => action);
          setShowAuthModal(true);
      } else {
          setAuthTitle('權限驗證');
          setAuthPlaceholder('Password / OTP');
          const stored = api.getOtp();
          if (stored) {
             action();
          } else {
              setPendingAction(() => action);
              setShowAuthModal(true);
          }
      }
  };

  const handleAuthSubmit = async () => {
      if (!authInput) return;
      setIsVerifying(true);
      
      if (authTitle === '個人身份驗證') {
          const isSuccess = await api.loginPerson(person.id, authInput);
          if (isSuccess) {
              setShowAuthModal(false);
              setAuthInput('');
              if (pendingAction) pendingAction();
          } else {
              alert('驗證失敗：密碼錯誤');
              setAuthInput('');
          }
      } else {
          const adminResult = await api.authenticate(authInput);
          if (adminResult.success && adminResult.otp) {
              api.setOtp(adminResult.otp);
              setShowAuthModal(false);
              setAuthInput('');
              if (pendingAction) pendingAction();
          } else {
              const isValidOtp = await api.verifyOtp(authInput);
              if (isValidOtp) {
                  api.setOtp(authInput);
                  setShowAuthModal(false);
                  setAuthInput('');
                  if (pendingAction) pendingAction();
              } else {
                  alert('密碼錯誤');
                  setAuthInput(''); 
              }
          }
      }
      setIsVerifying(false);
  };

  const handleEditRace = (race: DataRecord) => {
      const [baseUrl, fragment] = (race.url || '').split('#');
      let z = 1, x = 50, y = 50;
      if (fragment) {
        const params = new URLSearchParams(fragment);
        z = parseFloat(params.get('z') || '1');
        x = parseFloat(params.get('x') || '50');
        y = parseFloat(params.get('y') || '50');
      }

      setRaceForm({
          id: race.id || '',
          date: race.date,
          name: race.name,
          race_id: race.race_group, 
          address: race.address,
          rank: race.value === 'PREVIEW' ? '' : race.value,
          note: race.note,
          url: baseUrl,
          event_id: race.event_id || ''
      });
      setZoomScale(z);
      setPosX(x);
      setPosY(y);
      setEditingRaceId(race.id!);
      setIsAddingRace(true);
  };

  const handleJoinRace = (race: DataRecord) => {
      const [baseUrl] = (race.url || '').split('#');
      
      setRaceForm({
          id: '', 
          date: race.date,
          name: race.name,
          race_id: race.race_group,
          address: race.address,
          rank: '', 
          note: '',
          url: baseUrl, 
          event_id: race.event_id || '' 
      });
      setZoomScale(1);
      setPosX(50);
      setPosY(50);
      setEditingRaceId(null);
      setIsAddingRace(true);
  };

  const handleWithdrawRace = async (id: string | number) => {
      if (!confirm('確定要退出此場賽事嗎？\n這將刪除您的報名紀錄。')) return;
      const success = await api.deleteRecord(id, 'race');
      if (success) {
          refreshData();
          alert('已成功退出賽事');
      } else {
          alert('退出失敗，請稍後再試');
      }
  };

  const handleSubmitRace = async () => {
      if (!raceForm.event_id) {
          alert('錯誤：無效的賽事 ID');
          return;
      }

      const finalUrl = raceForm.url ? `${raceForm.url}#z=${zoomScale}&x=${posX}&y=${posY}` : '';

      const success = await api.submitRecord({
          id: editingRaceId ? editingRaceId : undefined,
          item: 'race',
          people_id: person.id,
          event_id: raceForm.event_id, 
          value: raceForm.rank,
          note: raceForm.note,
          url: finalUrl, 
      });

      if (success) {
          setIsAddingRace(false);
          setEditingRaceId(null);
          refreshData();
          alert(editingRaceId ? '賽事紀錄已更新' : '已成功加入賽事');
      } else {
          alert("操作失敗，請確認資料正確");
      }
  };

  const handleUpdateProfile = async () => {
      // Updates My Word AND Photos
      const success = await api.manageLookup('people', person.name, person.id, false, false, {
          birthday: person.birthday,
          is_hidden: person.is_hidden, 
          s_url: tempSUrl,
          b_url: tempBUrl,
          myword: editMyWord
      });
      if (success) {
          setWordFeedback({ msg: '更新成功', type: 'success' });
          refreshData(); 
      } else {
          setWordFeedback({ msg: '更新失敗', type: 'error' });
      }
      setTimeout(() => setWordFeedback(null), 3000);
  };

  const handleChangePassword = async () => {
      const p1 = prompt("請輸入新密碼");
      if (p1 === null) return;
      if (!p1 || p1.length < 4) { alert("密碼長度不足"); return; }
      
      const p2 = prompt("請再次輸入新密碼以確認");
      if (p2 === null) return;
      if (p1 !== p2) { alert("兩次輸入的密碼不一致"); return; }
      
      const success = await api.manageLookup('people', person.name, person.id, false, false, {
          birthday: person.birthday,
          is_hidden: person.is_hidden, 
          s_url: tempSUrl,
          b_url: tempBUrl,
          myword: person.myword,
          password: p1
      });
      if (success) {
          setPassFeedback({ msg: '密碼更新成功', type: 'success' });
      } else {
          setPassFeedback({ msg: '密碼更新失敗', type: 'error' });
      }
      setTimeout(() => setPassFeedback(null), 3000);
  };

  const handleUpdateRecord = async (id: string | number) => {
      const val = parseFloat(editValue);
      if (isNaN(val) || val <= 0) return;
      
      const rec = detailRecords.find(r => r.id === id);
      if (!rec) return;

      const success = await api.submitRecord({ 
          ...rec, 
          value: val.toFixed(3)
      });
      
      if (success) {
          setEditingRecordId(null);
          refreshData();
      }
  };

  const handleDeleteRecord = async (id: string | number) => {
      if (!confirm('確定刪除此筆數據？')) return;
      const success = await api.deleteRecord(id, 'training');
      if (success) refreshData();
  };
  
  const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val === '' || /^\d*\.?\d{0,3}$/.test(val)) {
          setEditValue(val);
      }
  };

  const getAge = (birthday?: string) => {
    if (!birthday) return 'PRO';
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return `${age} Years`;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setIsUploading(true);
          const file = e.target.files[0];
          
          const customName = `race_record_${person.id}_${raceForm.event_id}`;

          const result = await uploadImage(file, 'race', customName); 
          if (result.url) {
              const timestampUrl = `${result.url}?t=${Date.now()}`;
              setRaceForm({...raceForm, url: timestampUrl});
              setZoomScale(1);
              setPosX(50);
              setPosY(50);
          } else {
              alert(`上傳失敗: ${result.error}`);
          }
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    const point = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
    lastPoint.current = { x: point.clientX, y: point.clientY };
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging.current || !cropperRef.current) return;
    if(e.cancelable) e.preventDefault();
    
    const point = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
    const dx = point.clientX - lastPoint.current.x;
    const dy = point.clientY - lastPoint.current.y;
    
    const rect = cropperRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
        const sensitivity = 0.8; 
        const deltaX = (dx / rect.width) * 100 * sensitivity;
        const deltaY = (dy / rect.height) * 100 * sensitivity;
        setPosX(prev => Math.min(100, Math.max(0, prev + deltaX)));
        setPosY(prev => Math.min(100, Math.max(0, prev + deltaY)));
    }
    lastPoint.current = { x: point.clientX, y: point.clientY };
  };
  const handleDragEnd = () => isDragging.current = false;

  if (!person) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-10 opacity-50 bg-[#0a0508]">
           <Users size={48} className="mb-4 text-zinc-600"/>
           <div className="text-center text-xs font-bold text-zinc-500 tracking-widest uppercase">
              {people.length === 0 ? '載入選手資料中...' : '無可顯示的選手'}
           </div>
        </div>
      );
  }

  return (
    <div className="h-full overflow-y-auto animate-fade-in no-scrollbar pb-24 relative bg-[#0a0508] overflow-x-hidden">
        
        <div className="relative w-full h-[80vh] z-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-[#1c1016] to-[#0a0508] z-0"></div>

            <div className="absolute inset-0 z-10 w-full h-full flex justify-center">
               {!imgError && bUrlBase ? (
                   <img 
                   key={person.id}
                   src={bUrlBase} 
                   onError={() => setImgError(true)}
                   className="h-full w-auto max-w-none object-cover" 
                   style={{ 
                       aspectRatio: '2/3',
                       transform: `translate(${(bx - 50) * 1.0}%, ${(by - 50) * 1.0}%) scale(${bz})`,
                       maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                       WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
                   }}
                 />
               ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-800 text-9xl font-black opacity-30">
                      {person.name.charAt(0)}
                  </div>
               )}
            </div>

            <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-zinc-900/90 via-zinc-900/40 to-transparent z-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[140%] h-[60%] bg-gradient-to-t from-sunset-gold/30 via-sunset-rose/10 to-transparent blur-3xl z-20 pointer-events-none mix-blend-screen"></div>
            <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[80%] h-[40%] bg-radial-gradient from-sunset-gold/40 to-transparent blur-2xl z-20 pointer-events-none"></div>

            <div className="absolute top-0 left-0 right-0 p-4 pt-safe-top z-30 flex items-center justify-between mt-4 pointer-events-none">
                <button onClick={handlePrevPerson} className="w-12 h-12 flex items-center justify-center pointer-events-auto active:scale-90 transition-transform opacity-50 hover:opacity-100"><ChevronLeft size={24} className="text-white drop-shadow-md" /></button>
                
                <div 
                    onClick={() => setShowPlayerList(true)}
                    className="flex-1 flex flex-col items-center justify-center relative select-none z-40 px-2 min-w-0 cursor-pointer pointer-events-auto active:scale-95 transition-transform"
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-sunset-gold/50 blur-3xl rounded-full pointer-events-none mix-blend-screen animate-pulse-slow"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-black/20 blur-xl rounded-full pointer-events-none"></div>
                    
                    <div className="w-full flex justify-center overflow-visible">
                        <h1 className="relative text-center text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-sunset-gold/90 drop-shadow-[0_4px_12px_rgba(0,0,0,1)] filter z-10 break-keep whitespace-nowrap overflow-visible p-2">
                            {person.name}
                        </h1>
                    </div>
                    
                    <div className="flex items-center gap-1.5 -mt-1 bg-black/50 backdrop-blur-md px-3 py-0.5 rounded-full border border-white/15 shadow-lg relative z-10 shrink-0">
                        <Star size={10} className="text-sunset-gold fill-sunset-gold animate-pulse" />
                        <span className="text-[9px] font-bold text-sunset-gold tracking-[0.2em] uppercase shadow-black drop-shadow-md">{getAge(person.birthday)}</span>
                        <Star size={10} className="text-sunset-gold fill-sunset-gold animate-pulse" />
                    </div>
                </div>

                <button onClick={handleNextPerson} className="w-12 h-12 flex items-center justify-center pointer-events-auto active:scale-90 transition-transform opacity-50 hover:opacity-100"><ChevronRight size={24} className="text-white drop-shadow-md" /></button>
            </div>
        </div>

        {/* Content Section */}
        <div className="relative z-30 -mt-24 space-y-0">
            
            <div className="px-4 mb-6">
                <div className="grid grid-cols-5 gap-3 mb-6">
                    <button 
                        onClick={() => checkAuth(() => { 
                            setEditMyWord(person.myword || ''); 
                            setTempSUrl(person.s_url || '');
                            setTempBUrl(person.b_url || '');
                            setShowPersonalInfoModal(true); 
                        }, true)}
                        className="col-span-3 flex items-center gap-3 bg-zinc-900/60 backdrop-blur-lg border border-white/5 rounded-2xl p-2 active:scale-[0.98] transition-all hover:bg-zinc-800/60 shadow-lg group overflow-hidden relative"
                    >
                        <div className="w-12 h-12 rounded-full overflow-hidden flex-none border-2 border-white/10 shadow-inner bg-zinc-900 group-hover:border-sunset-rose/30 transition-colors z-10">
                            {!myWordImgError && sUrlBase ? (
                                <img 
                                    src={sUrlBase} 
                                    onError={() => setMyWordImgError(true)}
                                    className="w-full h-full object-cover" 
                                    style={{transform: `translate(${(sx - 50) * 1.5}%, ${(sy - 50) * 1.5}%) scale(${sz})`}}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                    <span className="text-sm font-black text-white">{person.name.charAt(0)}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center text-left z-10 overflow-hidden relative h-full">
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] font-black text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">個人中心</span>
                                <Edit2 size={10} className="text-zinc-500" />
                            </div>
                            <div className="text-sm font-medium text-white/90 whitespace-nowrap overflow-hidden">
                                <div className={`${(person.myword || '').length > 8 ? 'animate-marquee-infinite inline-block' : ''}`}>
                                    {person.myword || "編輯個人檔案..."}
                                    {(person.myword || '').length > 8 && <span className="inline-block w-8"></span>}
                                    {(person.myword || '').length > 8 && (person.myword || "編輯個人檔案...")}
                                </div>
                            </div>
                        </div>
                        <style>{`
                            @keyframes marquee {
                                0% { transform: translateX(0); }
                                100% { transform: translateX(-50%); }
                            }
                            .animate-marquee-infinite {
                                animation: marquee 10s linear infinite;
                            }
                        `}</style>
                    </button>

                    <div className="col-span-2 glass-card-gold rounded-2xl p-3 flex flex-col justify-center relative overflow-hidden shadow-[0_0_30px_rgba(251,191,36,0.2)]">
                        <div className="absolute -top-2 -right-2 p-2 opacity-20 rotate-12"><Trophy size={60} /></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-sunset-gold/10 to-transparent"></div>
                        <span className="text-[9px] text-sunset-gold uppercase tracking-wider font-black flex items-center gap-1 z-10"><Zap size={10} fill="currentColor"/> 最速紀錄</span>
                        <span className="text-2xl font-black text-white font-mono tracking-tighter z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] truncate">
                            {allTimeBest ? allTimeBest.toFixed(3) : '--'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="sticky top-0 z-40 py-3 px-4 -mx-4 bg-[#0a0508]/85 backdrop-blur-xl border-b border-white/5 shadow-2xl transition-all">
                <div className="relative h-12 group flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 rounded-2xl border border-sunset-gold/20 shadow-glow-gold pointer-events-none z-0"></div>
                    <select 
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                    >
                        {trainingTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                    <div className="relative z-10 flex items-center gap-2 pointer-events-none">
                        <span className="text-white font-black text-base tracking-wide">{selectedType}</span>
                        <ChevronDown size={14} className="text-sunset-gold" />
                    </div>
                </div>
            </div>

            <div className="px-4 space-y-3 pt-6">
                {dailyStats.map((stat, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => { setDetailDate(stat.date); setShowDetailModal(true); }}
                        className="glass-card rounded-2xl p-4 active:scale-[0.98] transition-all border border-white/5 hover:border-sunset-rose/40 group cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                        
                        <div className="flex justify-between items-start mb-3 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-zinc-900/60 flex flex-col items-center justify-center border border-white/10 shadow-inner backdrop-blur-sm">
                                    <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">{format(new Date(stat.date), 'MMM')}</span>
                                    <span className="text-lg font-black text-white font-mono leading-none">{format(new Date(stat.date), 'dd')}</span>
                                </div>
                                <div>
                                    <div className="text-[9px] text-zinc-500 font-black uppercase tracking-wider mb-0.5 flex items-center gap-1">Stability <Activity size={8}/></div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-16 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                                            <div 
                                                className={`h-full rounded-full ${stat.stability >= 80 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : stat.stability >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                                style={{width: `${stat.stability}%`}}
                                            ></div>
                                        </div>
                                        <span className={`text-sm font-black font-mono ${stat.stability >= 80 ? 'text-emerald-400' : stat.stability >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                                            {stat.stability.toFixed(0)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <ArrowRight size={18} className="text-zinc-600 group-hover:text-white transition-colors mt-1" />
                                <span className="text-[9px] font-mono text-zinc-500 mt-1 font-bold">{stat.count} Rounds</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 relative z-10">
                            <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col">
                                <span className="text-[8px] text-zinc-500 uppercase font-bold mb-0.5">Average</span>
                                <span className="text-sm font-mono font-bold text-zinc-300">{stat.avg.toFixed(3)}s</span>
                            </div>
                            <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col">
                                <span className="text-[8px] text-zinc-500 uppercase font-bold mb-0.5">Best</span>
                                <span className="text-sm font-mono font-black text-sunset-gold drop-shadow-sm">{stat.best.toFixed(3)}s</span>
                            </div>
                        </div>
                    </div>
                ))}
                {dailyStats.length === 0 && (
                    <div className="text-center py-6 opacity-30">
                        <Activity size={32} className="mx-auto mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">無訓練數據</p>
                    </div>
                )}
            </div>
        </div>

        {showDetailModal && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/85 backdrop-blur-md animate-fade-in" onClick={() => setShowDetailModal(false)}>
                <div className="glass-card w-full max-w-md rounded-t-[32px] p-6 shadow-2xl animate-slide-up bg-[#0f0508] border-white/10 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6 shrink-0">
                        <div className="flex items-center gap-3">
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight">{detailDate}</h3>
                                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-0.5">Detailed Records</p>
                            </div>
                            <button 
                                onClick={() => {
                                    if(isEditUnlocked) {
                                        setIsEditUnlocked(false);
                                    } else {
                                        checkAuth(() => setIsEditUnlocked(true));
                                    }
                                }}
                                className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${isEditUnlocked ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-white/5 text-zinc-500 border-white/5'}`}
                            >
                                {isEditUnlocked ? <Unlock size={16} /> : <Edit2 size={16} />}
                            </button>
                        </div>
                        <button onClick={() => setShowDetailModal(false)} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-zinc-500 active:scale-95"><X size={20} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar pb-6 space-y-2">
                        {detailRecords.map((rec, i) => (
                            <div key={rec.id} className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black font-mono ${i===0 ? 'bg-sunset-gold text-black shadow-glow-gold' : 'bg-zinc-800 text-zinc-500'}`}>
                                        {i + 1}
                                    </div>
                                    {editingRecordId === rec.id ? (
                                        <input 
                                            autoFocus
                                            type="text" 
                                            inputMode="decimal"
                                            value={editValue}
                                            onChange={handleScoreChange}
                                            className="w-24 bg-black border border-sunset-rose rounded px-2 py-1 text-white font-mono text-sm outline-none"
                                        />
                                    ) : (
                                        <span className={`text-lg font-mono font-bold ${i===0 ? 'text-sunset-gold' : 'text-zinc-300'}`}>
                                            {parseFloat(rec.value).toFixed(3)}
                                        </span>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    {editingRecordId === rec.id ? (
                                        <>
                                            <button onClick={() => handleUpdateRecord(rec.id!)} className="p-2 bg-green-500/20 text-green-500 rounded-lg active:scale-90"><Check size={16} /></button>
                                            <button onClick={() => setEditingRecordId(null)} className="p-2 bg-zinc-700/50 text-zinc-400 rounded-lg active:scale-90"><X size={16} /></button>
                                        </>
                                    ) : (
                                        isEditUnlocked && (
                                            <>
                                                <button onClick={() => { setEditingRecordId(rec.id!); setEditValue(rec.value); }} className="p-2 text-zinc-600 hover:text-white rounded-lg active:scale-90"><Edit2 size={16} /></button>
                                                <button onClick={() => handleDeleteRecord(rec.id!)} className="p-2 text-zinc-600 hover:text-rose-500 rounded-lg active:scale-90"><Trash2 size={16} /></button>
                                            </>
                                        )
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {showPersonalInfoModal && (
            <div 
                className="fixed inset-0 z-[100] animate-fade-in flex flex-col bg-[#0a0508] backdrop-blur-xl"
                onClick={() => { setShowPersonalInfoModal(false); }}
            >
                <div className="h-[env(safe-area-inset-top)] bg-transparent shrink-0" />
                
                <div className="flex-1 flex flex-col p-6 overflow-hidden max-w-md mx-auto w-full animate-slide-up" onClick={e => e.stopPropagation()}>
                    
                    <div className="flex justify-between items-center mb-6 shrink-0 pt-2">
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">{person.name}</h3>
                            <p className="text-[9px] text-rose-500 font-black uppercase tracking-[0.3em] mt-0.5">Personal Space</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowSettingsMode(!showSettingsMode)} className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all active:scale-95 ${showSettingsMode ? 'bg-rose-500 text-white border-rose-500' : 'bg-white/5 text-zinc-400 border-white/10'}`}>
                                <Settings size={20} />
                            </button>
                            <button onClick={() => { setShowPersonalInfoModal(false); }} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full text-zinc-400 active:scale-95"><X size={20} /></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar pb-[env(safe-area-inset-bottom)] space-y-3">
                        
                        {showSettingsMode ? (
                            <div className="space-y-4 animate-fade-in">
                                
                                <div className="space-y-4 p-4 bg-zinc-900/50 rounded-2xl border border-white/5">
                                    {/* 1. My Word */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1"><MessageCircle size={10}/> 我想說的話</label>
                                        <textarea value={editMyWord} onChange={e => setEditMyWord(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none resize-none h-20 shadow-inner" />
                                    </div>

                                    {/* 2. Profile Photos */}
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1 pt-2 border-t border-white/5"><UserCircle2 size={12}/> 選手照片管理</h4>
                                    
                                    <ImageCropperInput 
                                        label="更換頭像" 
                                        urlValue={tempSUrl} 
                                        onChange={setTempSUrl} 
                                        personId={person.id}
                                        typeSuffix="s"
                                        ratioClass="aspect-square w-32 mx-auto rounded-full border-2 border-white/10"
                                    />
                                    
                                    <ImageCropperInput 
                                        label="更換全身照" 
                                        urlValue={tempBUrl} 
                                        onChange={setTempBUrl} 
                                        personId={person.id}
                                        typeSuffix="b"
                                        ratioClass="aspect-[2/3] w-full mx-auto rounded-xl"
                                    />

                                    {/* 3. Save Button */}
                                    <button onClick={handleUpdateProfile} className="w-full py-3 bg-gradient-to-r from-rose-600 to-rose-800 text-white font-bold text-xs rounded-xl shadow-glow active:scale-95 transition-all mt-2">
                                        儲存個人檔案
                                    </button>
                                    {wordFeedback && (
                                        <div className={`text-center text-[10px] font-bold animate-fade-in ${wordFeedback.type === 'success' ? 'text-green-500' : 'text-rose-500'}`}>
                                            {wordFeedback.msg}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="pt-4 border-t border-white/10 space-y-1.5">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1"><Key size={10}/> 安全設定</label>
                                    <button onClick={handleChangePassword} className="w-full py-3 bg-rose-600 text-white font-bold text-xs rounded-xl border border-white/5 active:scale-95 transition-all shadow-lg hover:bg-rose-700">
                                        重設密碼
                                    </button>
                                    {passFeedback && (
                                        <div className={`text-center text-[10px] font-bold animate-fade-in ${passFeedback.type === 'success' ? 'text-green-500' : 'text-rose-500'}`}>
                                            {passFeedback.msg}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3 mb-2">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                            <Trophy size={14} className="text-rose-500"/> 
                                            賽事列表
                                        </h4>
                                    </div>

                                    <div className="flex gap-2 h-9">
                                        <div className="flex-1 bg-zinc-900 rounded-xl p-1 flex relative border border-white/5">
                                            {(['registered', 'available', 'finished'] as const).map((status) => (
                                                <button 
                                                    key={status}
                                                    onClick={() => setRaceFilterStatus(status)}
                                                    className={`flex-1 text-[9px] font-bold rounded-lg transition-all ${raceFilterStatus === status ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                >
                                                    {status === 'registered' ? '已報名' : status === 'available' ? '可報名' : '已結束'}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="relative w-1/3 h-full">
                                            <select 
                                                value={raceFilterSeries}
                                                onChange={(e) => setRaceFilterSeries(e.target.value)}
                                                className="w-full h-full bg-zinc-900 rounded-xl px-3 text-[9px] font-bold text-white appearance-none outline-none border border-white/5"
                                            >
                                                <option value="">全部系列</option>
                                                {raceGroups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                                            </select>
                                            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                {isAddingRace && (
                                    <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/10 mb-4 animate-fade-in relative">
                                        <button onClick={() => setIsAddingRace(false)} className="absolute top-2 right-2 text-zinc-500 p-2"><X size={16}/></button>
                                        <h4 className="text-xs font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                                            {editingRaceId ? <Edit2 size={12}/> : <Plus size={12}/>} 
                                            {editingRaceId ? '編輯比賽筆記' : '加入賽事'}
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="text-white font-bold text-sm bg-black/40 p-2 rounded-lg border border-white/5">
                                                {raceForm.name} 
                                                <span className="block text-[9px] text-zinc-500 mt-1 font-mono">{raceForm.date}</span>
                                            </div>
                                            
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1"><Camera size={12}/> 照片連結 (URL)</label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="file" 
                                                        ref={fileInputRef} 
                                                        className="hidden" 
                                                        accept="image/*"
                                                        onChange={handleFileSelect}
                                                    />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => fileInputRef.current?.click()}
                                                        disabled={isUploading}
                                                        className="w-full px-3 py-3 bg-zinc-800 rounded-xl text-white active:scale-95 border border-white/5 flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all shadow-lg text-xs font-bold"
                                                    >
                                                        {isUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                                                        {isUploading ? '上傳壓縮中...' : '上傳照片'}
                                                    </button>
                                                </div>
                                            </div>

                                            {raceForm.url && (
                                                <div className="space-y-2 bg-white/5 p-3 rounded-2xl border border-white/10 shadow-lg">
                                                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1"><Maximize size={10}/> 照片校準</label>
                                                    <div 
                                                        ref={cropperRef}
                                                        className="relative h-24 rounded-xl overflow-hidden bg-black border border-white/10 shadow-inner group cursor-move touch-none"
                                                        style={{ touchAction: 'none' }}
                                                        onMouseDown={handleDragStart}
                                                        onMouseMove={handleDragMove}
                                                        onMouseUp={handleDragEnd}
                                                        onMouseLeave={handleDragEnd}
                                                        onTouchStart={handleDragStart}
                                                        onTouchMove={handleDragMove}
                                                        onTouchEnd={handleDragEnd}
                                                    >
                                                        <img 
                                                        src={raceForm.url} 
                                                        className="w-full h-full object-contain pointer-events-none select-none"
                                                        style={{ 
                                                            transform: `translate(${(posX - 50) * 1.5}%, ${(posY - 50) * 1.5}%) scale(${zoomScale})`
                                                        }}
                                                        />
                                                    </div>
                                                    <input type="range" min="1" max="5" step="0.01" value={zoomScale} onChange={e => setZoomScale(parseFloat(e.target.value))} className="w-full accent-rose-500 h-1.5 bg-zinc-800 rounded-full appearance-none shadow-inner" />
                                                </div>
                                            )}
                                            
                                            {(raceFilterStatus === 'finished' || editingRaceId) && (
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">成績 / 名次</label>
                                                    <input type="text" placeholder="例: 冠軍 / 32.5s" value={raceForm.rank} onChange={e => setRaceForm({...raceForm, rank: e.target.value})} className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none w-full" />
                                                </div>
                                            )}

                                            <textarea placeholder="備註 / 心得..." value={raceForm.note} onChange={e => setRaceForm({...raceForm, note: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none h-20 resize-none" />
                                            <button onClick={handleSubmitRace} className="w-full bg-gradient-to-r from-rose-600 to-rose-800 text-white font-bold text-xs py-3 rounded-xl shadow-glow active:scale-95">
                                                {editingRaceId ? '更新紀錄' : '確認加入'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {displayedRaces.length > 0 ? displayedRaces.map((race) => {
                                    const isExpanded = expandedRaceId === race.id;
                                    const isUpcoming = race.date >= format(new Date(), 'yyyy-MM-dd');
                                    const isPreview = race.value === 'PREVIEW';
                                    
                                    const [imgUrl, fragment] = (race.url || '').split('#');
                                    let z = 1, x = 50, y = 50;
                                    if (fragment) {
                                        const params = new URLSearchParams(fragment);
                                        z = parseFloat(params.get('z') || '1');
                                        x = parseFloat(params.get('x') || '50');
                                        y = parseFloat(params.get('y') || '50');
                                    }
                                    
                                    return (
                                        <div 
                                            key={race.id} 
                                            onClick={() => setExpandedRaceId(isExpanded ? null : race.id!)}
                                            className={`${isPreview ? 'border-dashed border-zinc-700 bg-zinc-900/20' : isUpcoming ? 'glass-card-gold border-sunset-gold/40' : 'glass-card border-white/10'} rounded-2xl p-0 relative overflow-hidden group animate-slide-up transition-all shadow-xl active:scale-[0.99] mb-4 cursor-pointer`} 
                                        >
                                            {imgUrl && (
                                                <div className="absolute inset-0 z-0 overflow-hidden rounded-2xl">
                                                <div className={`absolute inset-0 z-10 transition-colors ${isUpcoming ? 'bg-black/20' : 'bg-black/70'}`} />
                                                <img 
                                                    src={imgUrl} 
                                                    alt={race.name} 
                                                    className="w-full h-full object-cover" 
                                                    style={{ 
                                                    transform: `translate(${(x - 50) * 1.5}%, ${(y - 50) * 1.5}%) scale(${z})`
                                                    }}
                                                />
                                                </div>
                                            )}
                                            
                                            <div className="relative z-10 p-5">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="min-w-0 flex-1">
                                                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-tighter mb-2 ${isUpcoming ? 'bg-sunset-gold text-amber-950 border-sunset-gold/50 shadow-glow-gold' : 'bg-white/10 text-white border-white/20 shadow-inner'}`}>
                                                        <Calendar size={10} />
                                                        <span className="font-mono">{race.date}</span>
                                                        </div>
                                                        <h3 className={`text-xl font-black italic tracking-tight ${isPreview ? 'text-zinc-400' : 'text-white'} drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] leading-tight truncate`}>{race.name}</h3>
                                                        <p className="text-[11px] font-black text-white/95 mt-1 uppercase tracking-[0.15em] drop-shadow-md">{race.race_group || 'BxB'}</p>
                                                    </div>
                                                    
                                                    <div className="flex flex-col items-end gap-1">
                                                        <div className="flex gap-2 mb-2 animate-fade-in" onClick={e => e.stopPropagation()}>
                                                            {isExpanded && !isPreview && <button onClick={() => handleEditRace(race)} className="p-2 rounded-xl bg-white/10 text-white border border-white/20 backdrop-blur-md active:scale-90 shadow-lg hover:bg-white/20"><Edit2 size={14} /></button>}
                                                            
                                                            {race.address && isExpanded && (
                                                                <button onClick={() => { if(race.address) window.open(race.address.startsWith('http') ? race.address : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(race.address)}`, '_blank'); }} className="p-2 rounded-xl bg-black/60 text-white border border-white/20 backdrop-blur-md active:scale-90 shadow-lg">
                                                                    {race.address.startsWith('http') ? <ExternalLink size={14} /> : <MapPin size={14} />}
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-col items-end">
                                                            {isPreview ? (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleJoinRace(race); }}
                                                                    className="flex flex-col items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 rounded-xl p-2.5 transition-all active:scale-95 group/join shadow-lg shadow-emerald-900/50 border border-white/10"
                                                                >
                                                                    <LogIn size={16} className="text-white group-hover/join:scale-110 transition-transform" />
                                                                    <span className="text-[9px] font-black text-white uppercase tracking-widest">加入</span>
                                                                </button>
                                                            ) : isUpcoming ? (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleWithdrawRace(race.id!); }}
                                                                    className="flex flex-col items-center justify-center gap-1 bg-rose-600 hover:bg-rose-700 rounded-xl p-2.5 transition-all active:scale-95 group/withdraw shadow-lg shadow-rose-900/50 border border-white/10"
                                                                >
                                                                    <LogOut size={16} className="text-white group-hover/withdraw:scale-110 transition-transform" />
                                                                    <span className="text-[9px] font-black text-white uppercase tracking-widest">退出</span>
                                                                </button>
                                                            ) : (
                                                                <>
                                                                    <span className="text-[8px] text-zinc-300 font-bold uppercase mb-0.5 drop-shadow-md">Rank</span>
                                                                    <span className="text-2xl font-black text-sunset-gold italic font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{race.value || '--'}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {isExpanded && !isPreview && (
                                                    <div className="mt-3 pt-3 border-t border-white/20 animate-fade-in relative">
                                                        <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap drop-shadow-md font-medium">{race.note || '無詳細內容'}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    !isAddingRace && (
                                        <div className="text-center py-10 opacity-30">
                                            <Trophy size={32} className="mx-auto mb-2" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">
                                                {raceFilterStatus === 'available' ? '無可報名的賽事' : raceFilterStatus === 'registered' ? '尚無報名紀錄' : '尚無完賽紀錄'}
                                            </p>
                                        </div>
                                    )
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}

        {showAuthModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md animate-fade-in" onClick={() => setShowAuthModal(false)}>
                <div className="glass-card w-full max-w-xs rounded-3xl p-8 shadow-2xl border-white/10 text-center" onClick={e => e.stopPropagation()}>
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Lock size={32} className="text-white opacity-80" />
                    </div>
                    <h3 className="text-xl font-black text-white tracking-tight mb-2">{authTitle}</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-6">{authPlaceholder}</p>
                    
                    <input 
                        autoFocus
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*" 
                        value={authInput}
                        onChange={(e) => setAuthInput(e.target.value)}
                        placeholder="Password"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-center tracking-widest mb-4 outline-none focus:border-rose-500/50 shadow-inner"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setShowAuthModal(false)} className="py-3 bg-zinc-900 text-zinc-400 font-bold text-xs rounded-xl border border-white/5">取消</button>
                        <button 
                            onClick={handleAuthSubmit}
                            disabled={!authInput || isVerifying}
                            className="py-3 bg-gradient-to-r from-rose-600 to-amber-500 text-white font-bold text-xs rounded-xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />} 
                            驗證
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Personal;
