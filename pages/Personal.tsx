
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DataRecord, LookupItem } from '../types';
import { api } from '../services/api';
import { Trophy, Zap, Calendar, Activity, X, Trash2, Edit2, Check, ArrowRight, ChevronLeft, ChevronRight, Star, Users, Lock, Unlock, KeyRound, Loader2, MessageCircle, ChevronDown, MapPin, Plus, Save, Key, Settings, Camera, Link as LinkIcon, ExternalLink, Maximize, Image as ImageIcon, Filter, LogIn, LogOut } from 'lucide-react';
import { format } from 'date-fns';

interface PersonalProps {
  data: DataRecord[];
  people: LookupItem[];
  trainingTypes: LookupItem[];
  refreshData: () => Promise<void>;
  activePersonId: string | number;
  onSelectPerson: (id: string | number) => void;
  raceGroups: LookupItem[]; 
}

interface RiderListItemProps {
  person: LookupItem;
  isActive: boolean;
  onClick: () => void;
}

// Sub-component for List Items
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

const Personal: React.FC<PersonalProps> = ({ data, people, trainingTypes, refreshData, activePersonId, onSelectPerson, raceGroups }) => {
  const [selectedType, setSelectedType] = useState<string>(trainingTypes[0]?.name || '');
  
  // Race Filters (Now used inside the Modal)
  const [raceFilterStatus, setRaceFilterStatus] = useState<'all' | 'registered' | 'available' | 'finished'>('registered');
  const [raceFilterSeries, setRaceFilterSeries] = useState<string>('');

  // Expanded Race State
  const [expandedRaceId, setExpandedRaceId] = useState<string | number | null>(null);

  // Detail Modal State
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | number | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // New State: Unlock Edit Mode for Detail Modal
  const [isEditUnlocked, setIsEditUnlocked] = useState(false);

  // Player Selection Modal State
  const [showPlayerList, setShowPlayerList] = useState(false);

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInput, setAuthInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [authTitle, setAuthTitle] = useState('權限驗證');
  const [authPlaceholder, setAuthPlaceholder] = useState('Password / OTP');

  // Personal Info Modal State
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [showSettingsMode, setShowSettingsMode] = useState(false); 
  
  // Feedback State for Settings (Separated)
  const [wordFeedback, setWordFeedback] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [passFeedback, setPassFeedback] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const [isAddingRace, setIsAddingRace] = useState(false); // Used for "Edit/Join" modal now
  const [editingRaceId, setEditingRaceId] = useState<string | number | null>(null); 
  
  // Editing MyWord and Password
  const [editMyWord, setEditMyWord] = useState('');
  const [editPassword, setEditPassword] = useState('');
  
  // Race Form (Now mostly for Join/Edit Note)
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

  // Image Cropper State for Personal Race
  const [zoomScale, setZoomScale] = useState(1);
  const [posX, setPosX] = useState(50); 
  const [posY, setPosY] = useState(50); 
  const cropperRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });

  // MyWord Button Image Error State
  const [myWordImgError, setMyWordImgError] = useState(false);
  // Hero Image Error State
  const [imgError, setImgError] = useState(false);

  // Reset unlock state when modal closes
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

  // Ensure valid selection when data loads
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
      setImgError(false);
      setMyWordImgError(false);
      setEditMyWord(person?.myword || '');
  }, [person?.id, person?.myword]);

  // Hero Image (Big)
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

  // Small Image (Avatar)
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

  const handlePrevPerson = () => {
    if (activePeople.length === 0) return;
    const nextIndex = currentIndex > 0 ? currentIndex - 1 : activePeople.length - 1;
    onSelectPerson(activePeople[nextIndex].id);
  };

  const handleNextPerson = () => {
    if (activePeople.length === 0) return;
    const nextIndex = currentIndex < activePeople.length - 1 ? currentIndex + 1 : 0;
    onSelectPerson(activePeople[nextIndex].id);
  };

  const personRecords = useMemo(() => {
    if (!person) return [];
    return data.filter(d => 
        String(d.people_id) === String(person.id) && 
        d.item === 'training' && 
        (!selectedType || d.name === selectedType)
    );
  }, [data, person, selectedType]);

  // Enhanced Race List Logic for Filters
  const displayedRaces = useMemo(() => {
      if (!person) return [];
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      
      // 1. All races related to this person (Registered or Finished)
      const myRaces = data.filter(d => d.item === 'race' && String(d.people_id) === String(person.id) && d.value !== 'PREVIEW');
      const myEventIds = new Set(myRaces.map(r => String(r.event_id)));

      // 2. All available races (Preview records that this person has NOT joined)
      const availablePreviews = data.filter(d => 
          d.item === 'race' && 
          d.value === 'PREVIEW' && 
          !myEventIds.has(String(d.event_id)) &&
          d.date >= todayStr // Only future events are "Available" to join
      );

      let result: DataRecord[] = [];

      if (raceFilterStatus === 'registered') {
          // Future events I'm in
          result = myRaces.filter(r => r.date >= todayStr);
      } else if (raceFilterStatus === 'finished') {
          // Past events I was in
          result = myRaces.filter(r => r.date < todayStr);
      } else if (raceFilterStatus === 'available') {
          // Future events I'm NOT in
          result = availablePreviews;
      } else {
          // All: My Races + Available (Future)
          result = [...myRaces, ...availablePreviews];
      }

      // Series Filter
      if (raceFilterSeries) {
          result = result.filter(r => r.race_group === raceFilterSeries || r.race_id === raceFilterSeries); // check both just in case
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
          race_id: race.race_group, // Display series name
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
      // Joining a preview event
      // Extract URL from the race preview (it's the public URL)
      const [baseUrl] = (race.url || '').split('#');
      
      setRaceForm({
          id: '', // New record
          date: race.date,
          name: race.name,
          race_id: race.race_group,
          address: race.address,
          rank: '', // Reset rank for new entry
          note: '',
          url: baseUrl, // Default to public URL, but user can change it
          event_id: race.event_id || '' // Must have event_id
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

      // If it's a join/edit, we primarily send score/note. 
      // The worker for Personal Race flow only allows updating Score/Note/Url or inserting with event_id
      const success = await api.submitRecord({
          id: editingRaceId ? editingRaceId : undefined,
          item: 'race',
          people_id: person.id,
          event_id: raceForm.event_id, // Vital for JOIN
          value: raceForm.rank,
          note: raceForm.note,
          url: finalUrl, // User can add their own photo url if they want
          // We don't send date/name/series_id updates here as per requirement to only Edit Note/Join
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

  const handleUpdateMyWord = async () => {
      // Only send myword
      const success = await api.manageLookup('people', person.name, person.id, false, false, {
          birthday: person.birthday,
          is_hidden: person.is_hidden, 
          s_url: person.s_url,
          b_url: person.b_url,
          myword: editMyWord
          // No password field here
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
      if (!editPassword) return;
      if (editPassword.length < 4) { alert('密碼太短'); return; }
      
      // Explicitly include password
      const success = await api.manageLookup('people', person.name, person.id, false, false, {
          birthday: person.birthday,
          is_hidden: person.is_hidden, 
          s_url: person.s_url,
          b_url: person.b_url,
          myword: person.myword,
          password: editPassword
      });
      if (success) {
          setPassFeedback({ msg: '密碼更新成功', type: 'success' });
          setEditPassword('');
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

  // Image Cropper Logic
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
        
        {/* Hero Image Area */}
        <div className="relative w-full h-[80vh] z-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-[#1c1016] to-[#0a0508] z-0"></div>

            <div className="absolute inset-0 z-10 w-full h-full flex justify-center">
               {!imgError && bUrlBase ? (
                   <img 
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

            {/* Navigation & Name Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 pt-safe-top z-30 flex items-center justify-between mt-4 pointer-events-none">
                <div className="pointer-events-auto">
                    <button onClick={handlePrevPerson} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-md border border-white/10 active:scale-90 transition-all shadow-lg hover:bg-black/60 hover:text-white"><ChevronLeft size={24} /></button>
                </div>
                
                <div 
                    className="flex-1 flex flex-col items-center justify-center relative cursor-pointer group select-none z-40 px-2 pointer-events-auto min-w-0"
                    onClick={() => setShowPlayerList(true)}
                    role="button"
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-sunset-gold/50 blur-3xl rounded-full pointer-events-none mix-blend-screen animate-pulse-slow"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-black/20 blur-xl rounded-full pointer-events-none"></div>
                    
                    <div className="w-full flex justify-center transition-transform group-active:scale-95 overflow-visible">
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

                <div className="pointer-events-auto">
                    <button onClick={handleNextPerson} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-md border border-white/10 active:scale-90 transition-all shadow-lg hover:bg-black/60 hover:text-white"><ChevronRight size={24} /></button>
                </div>
            </div>
        </div>

        {/* Content Section */}
        <div className="relative z-30 -mt-24 space-y-0">
            
            <div className="px-4 mb-6">
                {/* Top Row: Personal Info Button & Best Record */}
                <div className="grid grid-cols-5 gap-3 mb-6">
                    {/* Personal Info Button (Span 3) */}
                    <button 
                        onClick={() => checkAuth(() => { 
                            setEditMyWord(person.myword || ''); 
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
                            <div className="text-sm font-medium text-white/90 whitespace-nowrap overflow-hidden">
                                <div className={`${(person.myword || '').length > 8 ? 'animate-marquee-infinite inline-block' : ''}`}>
                                    {person.myword || "..."}
                                    {(person.myword || '').length > 8 && <span className="inline-block w-8"></span>}
                                    {(person.myword || '').length > 8 && (person.myword || "...")}
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

                    {/* Best Record (Span 2) */}
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

            {/* STICKY HEADER AREA (Training Selector Only) */}
            <div className="sticky top-0 z-40 pb-2 pt-2 px-4 -mx-4 bg-[#0a0508]/85 backdrop-blur-xl border-b border-white/5 shadow-2xl transition-all">
                <div className="relative h-12 group">
                    <div className="absolute inset-0 bg-black/60 rounded-2xl border border-sunset-gold/20 shadow-glow-gold pointer-events-none z-0"></div>
                    <select 
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="relative z-10 w-full h-full appearance-none bg-transparent rounded-2xl px-5 text-white font-black outline-none text-base tracking-wide"
                    >
                        {trainingTypes.map(t => <option key={t.id} value={t.name} className="text-black">{t.name}</option>)}
                    </select>
                    <div className="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none z-20">
                        <span className="text-sunset-gold">▼</span>
                    </div>
                    <div className="absolute top-1 left-5 pointer-events-none z-20">
                        <span className="text-[8px] text-zinc-400 uppercase tracking-widest font-black">訓練項目</span>
                    </div>
                </div>
            </div>

            <div className="px-4 space-y-3 pt-4">
                {/* Stats Cards */}
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
                            <ArrowRight size={18} className="text-zinc-600 group-hover:text-white transition-colors mt-1" />
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

        {/* Detail Modal */}
        {showDetailModal && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/85 backdrop-blur-md animate-fade-in" onClick={() => setShowDetailModal(false)}>
                <div className="glass-card w-full max-w-md rounded-t-[32px] p-6 shadow-2xl animate-slide-up bg-[#0f0508] border-white/10 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6 shrink-0">
                        <div className="flex items-center gap-3">
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight">{detailDate}</h3>
                                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-0.5">Detailed Records</p>
                            </div>
                            {/* Header Edit Button for Unlocking Row Actions */}
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

        {/* Personal Management Modal (睿睿) */}
        {showPersonalInfoModal && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/85 backdrop-blur-md animate-fade-in" onClick={() => { setShowPersonalInfoModal(false); }}>
                <div className="glass-card w-full max-w-md rounded-t-[32px] p-6 shadow-2xl animate-slide-up bg-[#0f0508] border-white/10 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                    
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6 shrink-0">
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">{person.name}</h3>
                            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-0.5">Personal Space</p>
                        </div>
                        <div className="flex gap-3">
                            {/* Settings Button */}
                            <button onClick={() => setShowSettingsMode(!showSettingsMode)} className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all active:scale-95 ${showSettingsMode ? 'bg-sunset-rose text-white border-sunset-rose' : 'bg-white/5 text-zinc-400 border-white/10'}`}>
                                <Settings size={20} />
                            </button>
                            {/* Close Button */}
                            <button onClick={() => { setShowPersonalInfoModal(false); }} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-zinc-500 active:scale-95"><X size={20} /></button>
                        </div>
                    </div>

                    {/* Content Area: Swaps between Settings and Race List */}
                    <div className="flex-1 overflow-y-auto no-scrollbar pb-6 space-y-3">
                        
                        {showSettingsMode ? (
                            <div className="space-y-4 animate-fade-in">
                                <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 flex flex-col gap-3">
                                    <div className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1"><MessageCircle size={10}/> 我想說的話</div>
                                    <div className="flex items-center gap-2">
                                        <textarea value={editMyWord} onChange={e => setEditMyWord(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none resize-none h-14" />
                                        <button onClick={handleUpdateMyWord} className="p-2 bg-white/10 text-white rounded-xl active:scale-90"><Save size={16} /></button>
                                    </div>
                                    {wordFeedback && (
                                        <div className={`text-center text-[10px] font-bold animate-fade-in ${wordFeedback.type === 'success' ? 'text-green-500' : 'text-rose-500'}`}>
                                            {wordFeedback.msg}
                                        </div>
                                    )}
                                </div>
                                <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 flex flex-col gap-3">
                                    <div className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1"><Key size={10}/> 更改密碼</div>
                                    <div className="flex items-center gap-2">
                                        <input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="新密碼" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none" />
                                        <button onClick={handleChangePassword} className="p-2 bg-white/10 text-white rounded-xl active:scale-90"><Save size={16} /></button>
                                    </div>
                                    {passFeedback && (
                                        <div className={`text-center text-[10px] font-bold animate-fade-in ${passFeedback.type === 'success' ? 'text-green-500' : 'text-rose-500'}`}>
                                            {passFeedback.msg}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Race List Header with Filters (Now inside Modal) */}
                                <div className="space-y-3 mb-2">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                            <Trophy size={14} className="text-sunset-gold"/> 
                                            賽事列表
                                        </h4>
                                        {!isAddingRace && (
                                            <button onClick={() => {
                                                setRaceForm({
                                                    id: '', date: format(new Date(), 'yyyy-MM-dd'), name: '', race_id: '', address: '', rank: '', note: '', url: '', event_id: ''
                                                });
                                                setEditingRaceId(null);
                                                setIsAddingRace(true);
                                                setZoomScale(1);
                                                setPosX(50);
                                                setPosY(50);
                                            }} className="text-[10px] font-black px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-white transition-all active:scale-95 flex items-center gap-1">
                                                <Plus size={12} /> 加入
                                            </button>
                                        )}
                                    </div>

                                    {/* Filters inside Modal */}
                                    <div className="flex gap-2 h-8">
                                        <div className="flex-1 bg-zinc-900/80 rounded-xl p-1 flex relative border border-white/5">
                                            {(['registered', 'available', 'finished'] as const).map((status) => (
                                                <button 
                                                    key={status}
                                                    onClick={() => setRaceFilterStatus(status)}
                                                    className={`flex-1 text-[9px] font-bold rounded-lg transition-all ${raceFilterStatus === status ? 'bg-zinc-700 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                >
                                                    {status === 'registered' ? '已報名' : status === 'available' ? '可報名' : '已結束'}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="relative w-1/3 h-full">
                                            <select 
                                                value={raceFilterSeries}
                                                onChange={(e) => setRaceFilterSeries(e.target.value)}
                                                className="w-full h-full bg-zinc-900/80 rounded-xl px-2 text-[9px] font-bold text-white appearance-none outline-none border border-white/5"
                                            >
                                                <option value="">全部系列</option>
                                                {raceGroups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                                            </select>
                                            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                {/* Add / Edit Form */}
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
                                            
                                            {/* Photo URL Input */}
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1"><Camera size={12}/> 照片連結 (URL)</label>
                                                <div className="flex gap-2">
                                                    <input type="url" placeholder="https://..." value={raceForm.url} onChange={e => setRaceForm({...raceForm, url: e.target.value})} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono outline-none shadow-inner" />
                                                    {raceForm.url && (
                                                        <button type="button" onClick={() => window.open(raceForm.url, '_blank')} className="px-3 bg-zinc-800 rounded-xl text-sunset-gold active:scale-95 border border-white/5 flex items-center justify-center">
                                                            <LinkIcon size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Image Cropper */}
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
                                                        className="w-full h-full object-cover pointer-events-none select-none"
                                                        style={{ 
                                                            transform: `translate(${(posX - 50) * 1.5}%, ${(posY - 50) * 1.5}%) scale(${zoomScale})`
                                                        }}
                                                        />
                                                    </div>
                                                    <input type="range" min="1" max="5" step="0.01" value={zoomScale} onChange={e => setZoomScale(parseFloat(e.target.value))} className="w-full accent-sunset-rose h-1.5 bg-zinc-800 rounded-full appearance-none shadow-inner" />
                                                </div>
                                            )}
                                            
                                            {/* Rank Input with Label */}
                                            {(raceFilterStatus === 'finished' || editingRaceId) && (
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">成績 / 名次</label>
                                                    <input type="text" placeholder="例: 冠軍 / 32.5s" value={raceForm.rank} onChange={e => setRaceForm({...raceForm, rank: e.target.value})} className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none w-full" />
                                                </div>
                                            )}

                                            <textarea placeholder="備註 / 心得..." value={raceForm.note} onChange={e => setRaceForm({...raceForm, note: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none h-20 resize-none" />
                                            <button onClick={handleSubmitRace} className="w-full bg-sunset-rose text-white font-bold text-xs py-3 rounded-xl shadow-glow-rose active:scale-95">
                                                {editingRaceId ? '更新紀錄' : '確認加入'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {displayedRaces.length > 0 ? displayedRaces.map((race) => {
                                    const isExpanded = expandedRaceId === race.id;
                                    const isUpcoming = race.date >= format(new Date(), 'yyyy-MM-dd');
                                    const isPreview = race.value === 'PREVIEW';
                                    
                                    // Parse image URL
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
                                                {/* Card Header */}
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
                                                        {/* Action Buttons Row */}
                                                        <div className="flex gap-2 mb-2 animate-fade-in" onClick={e => e.stopPropagation()}>
                                                            {isExpanded && !isPreview && <button onClick={() => handleEditRace(race)} className="p-2 rounded-xl bg-white/10 text-white border border-white/20 backdrop-blur-md active:scale-90 shadow-lg hover:bg-white/20"><Edit2 size={14} /></button>}
                                                            
                                                            {race.address && isExpanded && (
                                                                <button onClick={() => { if(race.address) window.open(race.address.startsWith('http') ? race.address : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(race.address)}`, '_blank'); }} className="p-2 rounded-xl bg-black/60 text-white border border-white/20 backdrop-blur-md active:scale-90 shadow-lg">
                                                                    {race.address.startsWith('http') ? <ExternalLink size={14} /> : <MapPin size={14} />}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Status / Rank / Big Action Column */}
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
                                                                // Future Race: Show Withdraw Button
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleWithdrawRace(race.id!); }}
                                                                    className="flex flex-col items-center justify-center gap-1 bg-rose-600 hover:bg-rose-700 rounded-xl p-2.5 transition-all active:scale-95 group/withdraw shadow-lg shadow-rose-900/50 border border-white/10"
                                                                >
                                                                    <LogOut size={16} className="text-white group-hover/withdraw:scale-110 transition-transform" />
                                                                    <span className="text-[9px] font-black text-white uppercase tracking-widest">退出</span>
                                                                </button>
                                                            ) : (
                                                                // Finished Race: Show Rank
                                                                <>
                                                                    <span className="text-[8px] text-zinc-300 font-bold uppercase mb-0.5 drop-shadow-md">Rank</span>
                                                                    <span className="text-2xl font-black text-sunset-gold italic font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{race.value || '--'}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Expanded: Note */}
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

        {/* Player Selection Modal */}
        {showPlayerList && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/90 backdrop-blur-md animate-fade-in" onClick={() => setShowPlayerList(false)}>
             <div className="glass-card w-full max-w-md rounded-t-[32px] p-6 shadow-2xl animate-slide-up bg-[#0f0508] border-white/10 flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 shrink-0">
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2"><Users size={20} className="text-sunset-rose"/> 切換檢視選手</h3>
                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-0.5">Select Rider</p>
                  </div>
                  <button onClick={() => setShowPlayerList(false)} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-zinc-500 active:scale-95"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
                   <div className="grid grid-cols-2 gap-3">
                      {people.filter(p => !p.is_hidden).map(p => (
                          <RiderListItem 
                              key={p.id}
                              person={p}
                              isActive={String(p.id) === String(person.id)}
                              onClick={() => { onSelectPerson(p.id); setShowPlayerList(false); }}
                          />
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Auth Modal for Protected Actions */}
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
