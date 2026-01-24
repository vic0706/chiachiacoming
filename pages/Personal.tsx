
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DataRecord, LookupItem } from '../types';
import { api } from '../services/api';
import { uploadImage } from '../services/supabase';
import { 
  Edit2, Trophy, Zap, ChevronDown, Calendar, Filter, X, Lock, Unlock, 
  Camera, UploadCloud, Loader2, Maximize, Eye, EyeOff, Activity, Medal,
  Settings, Key, MessageCircle, UserCircle2, Check, Trash2, ArrowRight, Search, Link as LinkIcon, ExternalLink, LogIn, LogOut, KeyRound,
  ChevronLeft, ChevronRight, Star, Image as ImageIcon, Flag, Plus, MinusCircle, MapPin, StickyNote, Navigation
} from 'lucide-react';
import { format, subWeeks, subMonths, startOfYear, differenceInYears, addWeeks, addMonths } from 'date-fns';
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Reused from Settings.tsx (Local definition since it's not exported)
const ImageCropperInput = ({ 
    label, 
    urlValue, 
    onChange, 
    ratioClass = 'h-32 w-full',
    personId,
    typeSuffix,
    customFileName
}: { 
    label: string, 
    urlValue: string, 
    onChange: (val: string) => void, 
    ratioClass?: string,
    personId?: string | number,
    typeSuffix: 's' | 'b' | 'race',
    customFileName?: string
}) => {
  const [baseUrl, fragment] = urlValue.split('#');
  const [z, setZ] = useState(1);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [error, setError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
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
          
          // Determine folder based on suffix
          const folder = typeSuffix === 'race' ? 'race' : 'people';
          
          // Use customFileName if provided, otherwise default logic
          const customName = customFileName 
            ? customFileName 
            : (personId ? `${personId}_${typeSuffix}_${Date.now()}` : undefined);
          
          const result = await uploadImage(file, folder, customName);
          
          if (result.url) {
              const timestampUrl = `${result.url}?t=${Date.now()}`;
              onChange(`${timestampUrl}#z=1&x=50&y=50`); 
              setIsLocked(false);
          } else {
              alert(`上傳失敗: ${result.error}`);
          }
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
      if (isLocked) return;
      isDragging.current = true;
      const point = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
      lastPoint.current = { x: point.clientX, y: point.clientY };
  };
  
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDragging.current || !cropperRef.current || isLocked) return;
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
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1"><Camera size={12}/> {label}</label>
          <div className="flex gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect}/>
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full px-4 py-3 bg-zinc-800 rounded-xl text-white active:scale-95 border border-white/5 flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all shadow-lg text-xs font-bold tracking-wider">
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                {isUploading ? '處理中...' : '上傳照片'}
            </button>
          </div>

          {baseUrl && (
               <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10 shadow-lg mt-2 relative">
                  <div className="flex justify-between items-center text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                      <span className="flex items-center gap-1"><Maximize size={10}/> 縮放與位置調整</span>
                      <button type="button" onClick={() => setIsLocked(!isLocked)} className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${isLocked ? 'border-zinc-700 bg-zinc-800 text-zinc-400' : 'border-rose-500/50 bg-rose-500/10 text-rose-500'}`}>
                          {isLocked ? <Lock size={10} /> : <Unlock size={10} />}
                          {isLocked ? '鎖定' : '編輯中'}
                      </button>
                  </div>
                  <div className="flex justify-center bg-black rounded-xl border border-white/5 p-2">
                    <div ref={cropperRef} className={`relative overflow-hidden bg-zinc-900 border border-white/10 shadow-inner group touch-none ${ratioClass}`} style={{ touchAction: 'none' }} onMouseDown={handleDragStart} onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd} onTouchStart={handleDragStart} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}>
                        {!error ? (
                            <img src={baseUrl} className={`w-full h-full object-contain bg-black pointer-events-none select-none ${isLocked ? 'opacity-80' : ''}`} style={{ transform: `translate(${(x - 50) * 1.5}%, ${(y - 50) * 1.5}%) scale(${z})` }} onError={() => setError(true)} />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-600 space-y-2"><Camera size={24} className="opacity-30"/></div>
                        )}
                        <div className={`absolute inset-0 pointer-events-none transition-opacity ${isLocked ? 'opacity-0' : 'opacity-20'}`}><div className="w-full h-full border border-white/30 flex"><div className="flex-1 border-r border-white/30"></div><div className="flex-1 border-r border-white/30"></div><div className="flex-1"></div></div><div className="absolute inset-0 flex flex-col"><div className="flex-1 border-b border-white/30"></div><div className="flex-1 border-b border-white/30"></div><div className="flex-1"></div></div></div>
                        {isLocked && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Lock size={24} className="text-white/20" /></div>}
                    </div>
                  </div>
                  <div className={`px-1 transition-opacity ${isLocked ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                      <div className="flex justify-between text-[8px] text-zinc-500 font-mono mb-1"><span>ZOOM: {z.toFixed(2)}x</span><span>POS: {x.toFixed(0)},{y.toFixed(0)}</span></div>
                      <input type="range" min="0.1" max="10" step="0.01" value={z} onChange={e => { const val = parseFloat(e.target.value); setZ(val); updateUrl(val, x, y); }} className="w-full accent-chiachia-green h-1.5 bg-zinc-800 rounded-full appearance-none shadow-inner" />
                  </div>
              </div>
          )}
      </div>
  );
};

interface RiderListItemProps {
  person: LookupItem;
  isActive: boolean;
  onClick: () => void;
}

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
            className={`flex flex-col items-center justify-start py-2.5 px-1 rounded-xl transition-all active:scale-[0.95] border w-full aspect-[3/4] gap-2 relative overflow-hidden isolate ${isActive ? 'bg-gradient-to-b from-chiachia-green/20 to-black border-chiachia-green shadow-glow-green' : 'bg-zinc-900/40 border-white/10 hover:bg-zinc-800'}`}
        >
            <div className={`w-12 h-12 rounded-full flex-none overflow-hidden flex items-center justify-center border-2 shadow-lg relative z-10 shrink-0 ${isActive ? 'border-white bg-zinc-950' : 'border-white/10 bg-zinc-950'}`}>
                {!error ? (
                    <img 
                        src={src} 
                        className="w-full h-full object-contain bg-black" 
                        style={{transform: `translate(${(sx - 50) * 1.5}%, ${(sy - 50) * 1.5}%) scale(${sz})`}} 
                        onError={() => setError(true)}
                        alt={person.name}
                    />
                ) : (
                    <span className={`text-base font-black ${isActive ? 'text-white' : 'text-zinc-600'}`}>{person.name.charAt(0)}</span>
                )}
            </div>
            <span className={`text-[10px] font-black tracking-wider truncate w-full relative z-10 ${isActive ? 'text-white' : 'text-zinc-400'}`}>{person.name}</span>
            {isActive && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-chiachia-green rounded-full shadow-[0_0_8px_rgba(57,231,95,0.8)] animate-pulse z-20"></div>}
        </button>
    );
};

interface PersonalProps {
  data: DataRecord[];
  people: LookupItem[];
  trainingTypes: LookupItem[];
  raceGroups: LookupItem[];
  refreshData: () => Promise<void>;
  activePersonId: string | number;
  onSelectPerson: (id: string | number) => void;
  targetDate?: string | null;
  onClearTargetDate?: () => void;
}

const Personal: React.FC<PersonalProps> = ({
  data,
  people,
  trainingTypes,
  raceGroups,
  refreshData,
  activePersonId,
  onSelectPerson,
  targetDate,
  onClearTargetDate
}) => {
    // Hooks
    const [selectedType, setSelectedType] = useState<string>('');
    const [trainActiveRange, setTrainActiveRange] = useState<'1W' | '1M' | '3M' | 'custom'>('1M');
    const [trainShowCustom, setTrainShowCustom] = useState(false);
    const [trainStartDate, setTrainStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
    const [trainEndDate, setTrainEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
    const [editMyWord, setEditMyWord] = useState('');
    const [tempSUrl, setTempSUrl] = useState('');
    const [tempBUrl, setTempBUrl] = useState('');
    const [myWordImgError, setMyWordImgError] = useState(false);
    const [imgError, setImgError] = useState(false);

    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authInput, setAuthInput] = useState('');
    const [authTitle, setAuthTitle] = useState('權限驗證');
    const [authPlaceholder, setAuthPlaceholder] = useState('Password / OTP');
    const [isVerifying, setIsVerifying] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [authError, setAuthError] = useState('');

    const [showSettingsMode, setShowSettingsMode] = useState(false);
    const [wordFeedback, setWordFeedback] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passFeedback, setPassFeedback] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

    const [showPlayerList, setShowPlayerList] = useState(false);

    // Detail Modal State
    const [detailDate, setDetailDate] = useState<string | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [editingRecordId, setEditingRecordId] = useState<string | number | null>(null);
    const [editValue, setEditValue] = useState('');
    const [isEditUnlocked, setIsEditUnlocked] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<string | number | null>(null);

    // Race Management State
    const [raceFilter, setRaceFilter] = useState<'registered' | 'available' | 'ended'>('registered');
    const [managingEvent, setManagingEvent] = useState<any | null>(null); // Used for Join or Edit
    const [manageNote, setManageNote] = useState('');
    const [manageValue, setManageValue] = useState('');
    const [managePhotoUrl, setManagePhotoUrl] = useState('');
    const [expandedRaceId, setExpandedRaceId] = useState<string | null>(null);

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // Initial load effects
    useEffect(() => {
        if (!selectedType && trainingTypes.length > 0) {
            setSelectedType(trainingTypes[0].name);
        }
    }, [trainingTypes]);

    useEffect(() => {
        if (targetDate) {
            setDetailDate(targetDate);
            setShowDetailModal(true);
            if (onClearTargetDate) onClearTargetDate();
        }
    }, [targetDate, onClearTargetDate]);

    useEffect(() => {
        if(!showDetailModal) {
            setIsEditUnlocked(false);
            setEditingRecordId(null);
        }
    }, [showDetailModal]);

    const activePeople = useMemo(() => {
        const list = people.filter(p => !p.is_hidden);
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [people]);

    const person = activePeople.find(p => String(p.id) === String(activePersonId)) || activePeople[0]; 
    const currentIndex = activePeople.findIndex(p => String(p.id) === String(person?.id));

    useEffect(() => {
        if (person) {
            setImgError(false);
            setMyWordImgError(false);
            setEditMyWord(person.myword || '');
            setTempSUrl(person.s_url || '');
            setTempBUrl(person.b_url || '');
        }
    }, [person?.id, person?.myword, person?.s_url, person?.b_url]);

    // Parse image URL
    const { sUrlBase, sx, sy, sz } = useMemo(() => {
        if (!person?.s_url) return { sUrlBase: '', sx: 50, sy: 50, sz: 1 };
        const [base, frag] = person.s_url.split('#');
        const params = new URLSearchParams(frag || '');
        return {
            sUrlBase: base,
            sx: parseFloat(params.get('x') || '50'),
            sy: parseFloat(params.get('y') || '50'),
            sz: parseFloat(params.get('z') || '1')
        };
    }, [person]);

    // Parse Body URL for background
    const { bUrlBase, bx, by, bz } = useMemo(() => {
        if (!person?.b_url) return { bUrlBase: '', bx: 50, by: 50, bz: 1 };
        const [base, frag] = person.b_url.split('#');
        const params = new URLSearchParams(frag || '');
        return {
            bUrlBase: base,
            bx: parseFloat(params.get('x') || '50'),
            by: parseFloat(params.get('y') || '50'),
            bz: parseFloat(params.get('z') || '1')
        };
    }, [person]);

    // Stats
    const filteredRecords = useMemo(() => {
        if (!person || !selectedType) return [];
        return data.filter(d => 
            String(d.people_id) === String(person.id) && 
            d.item === 'training' && 
            d.name === selectedType &&
            d.date >= trainStartDate && 
            d.date <= trainEndDate
        ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [data, person, selectedType, trainStartDate, trainEndDate]);

    const dailyStats = useMemo(() => {
        const grouped = new Map<string, number[]>();
        filteredRecords.forEach(r => {
            if (!grouped.has(r.date)) grouped.set(r.date, []);
            grouped.get(r.date)!.push(parseFloat(r.value));
        });
    
        const stats: { date: string, avg: number, best: number, stability: number, count: number }[] = [];
        grouped.forEach((values, date) => {
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            const best = Math.min(...values);
            const max = Math.max(...values);
            const range = max - best; 
            const squareDiffs = values.map(v => Math.pow(v - avg, 2));
            const variance = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
            const stdDev = Math.sqrt(variance);
            
            const cv = avg === 0 ? 0 : stdDev / avg;
            const s_cv = 100 - (cv * 700);
            const s_range = 100 - (range * 50);
            const stability = Math.max(0, Math.min(100, (s_cv * 0.6) + (s_range * 0.4)));
    
            stats.push({ date, avg, best, stability, count: values.length });
        });
    
        return stats.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [filteredRecords]);

    const allTimeBest = useMemo(() => {
        if (!person || !selectedType) return 0;
        const all = data.filter(d => 
            String(d.people_id) === String(person.id) && 
            d.item === 'training' && 
            d.name === selectedType
        );
        if (all.length === 0) return null;
        return Math.min(...all.map(d => parseFloat(d.value)));
    }, [data, person, selectedType]);

    const detailRecords = useMemo(() => {
        if (!detailDate) return [];
        return filteredRecords
          .filter(r => r.date === detailDate)
          .sort((a, b) => Number(a.id) - Number(b.id)); 
    }, [filteredRecords, detailDate]);

    // Personal Race Management Logic
    const raceManagerData = useMemo(() => {
      if (!person) return { registered: [], available: [], ended: [] };
      
      const registered: any[] = [];
      const available: any[] = [];
      const ended: any[] = [];

      const allRaceItems = data.filter(r => r.item === 'race');
      
      // Extract unique events map to handle duplicates and PREVIEW placeholders
      const eventsMap = new Map<string, any>();
      allRaceItems.forEach(r => {
          if(r.event_id) {
              const eid = String(r.event_id);
              if(!eventsMap.has(eid)) {
                  eventsMap.set(eid, {
                      id: r.event_id,
                      date: r.date,
                      name: r.name,
                      race_group: r.race_group,
                      series_id: r.series_id || r.race_id,
                      address: r.address,
                      // Capture public url if available from preview, otherwise might be empty initially
                      public_url: r.value === 'PREVIEW' ? r.url : '' 
                  });
              } else {
                  // If we find a PREVIEW record later, update the public_url
                  if (r.value === 'PREVIEW') {
                      const existing = eventsMap.get(eid);
                      if (!existing.public_url) existing.public_url = r.url;
                  }
              }
          }
      });

      const uniqueEvents = Array.from(eventsMap.values());

      uniqueEvents.forEach(evt => {
          const userRecord = allRaceItems.find(r => 
              String(r.event_id) === String(evt.id) && 
              String(r.people_id) === String(person.id)
          );

          // If public_url is still empty, try to find ANY record's url (fallback)
          if (!evt.public_url) {
              const anyRecord = allRaceItems.find(r => String(r.event_id) === String(evt.id));
              if (anyRecord) evt.public_url = anyRecord.url;
          }

          const isFuture = evt.date >= todayStr;

          if (userRecord) {
              // User is registered
              // Logic: Display URL should be Personal URL if exists, else Public URL
              const displayUrl = (userRecord.url && userRecord.url !== evt.public_url) ? userRecord.url : evt.public_url;

              const record = { 
                  ...evt, 
                  recordId: userRecord.id, 
                  value: userRecord.value,
                  note: userRecord.note,
                  personal_url: userRecord.url, // Explicitly keep personal url state
                  display_url: displayUrl
              };

              if (isFuture) {
                  registered.push(record);
              } else {
                  ended.push(record);
              }
          } else {
              // User NOT registered
              if (isFuture) {
                  available.push({ ...evt, display_url: evt.public_url });
              }
          }
      });

      registered.sort((a,b) => a.date.localeCompare(b.date));
      available.sort((a,b) => a.date.localeCompare(b.date));
      ended.sort((a,b) => b.date.localeCompare(a.date));

      return { registered, available, ended };
    }, [data, person, todayStr]);

    const handlePrepareJoin = (evt: any) => {
        setManagingEvent({ ...evt, mode: 'join' });
        setManageNote('');
        setManageValue('');
        setManagePhotoUrl(evt.display_url || ''); 
    };

    const handlePrepareEdit = (evt: any) => {
        setManagingEvent({ ...evt, mode: 'edit' });
        setManageNote(evt.note || '');
        setManageValue(evt.value || '');
        setManagePhotoUrl(evt.personal_url || evt.display_url || '');
    };

    const handleConfirmSubmit = async () => {
        if (!managingEvent || !person) return;
        
        checkAuth(async () => {
            const isJoin = managingEvent.mode === 'join';
            
            const payload: any = {
                item: 'race',
                people_id: person.id,
                event_id: managingEvent.id,
                date: managingEvent.date,
                name: managingEvent.name,
                race_id: managingEvent.series_id,
                address: managingEvent.address,
                url: managePhotoUrl, // This will be saved as personal_url in backend
                value: isJoin ? '' : manageValue, // Keep existing value if edit
                note: manageNote
            };

            if (!isJoin) {
                payload.id = managingEvent.recordId; // Update existing record
            }

            const success = await api.submitRecord(payload);
            
            if(success) {
                setManagingEvent(null);
                refreshData();
            } else {
                alert(isJoin ? '加入失敗' : '更新失敗');
            }
        });
    };

    const handleWithdrawRace = async (recordId: string) => {
        if(!confirm('確定要退出此賽事？')) return;
        checkAuth(async () => {
            const success = await api.deleteRecord(recordId, 'race');
            if(success) refreshData();
        });
    };

    const handleNavigate = (address: string) => {
        if (!address) return;
        if (address.startsWith('http')) {
          window.open(address, '_blank');
        } else {
          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
        }
    };

    // Actions
    const checkAuth = (action: () => void, requireAdmin = false) => {
        const adminAuth = localStorage.getItem('louie_admin_auth_ts');
        if (adminAuth && Date.now() < Number(adminAuth)) {
            action();
            return;
        }
  
        if (!requireAdmin && person?.id) {
            const authKey = `louie_p_auth_${person.id}`;
            const cachedAuth = localStorage.getItem(authKey);
            if (cachedAuth && Date.now() < Number(cachedAuth)) {
                action();
                return;
            }
        }
  
        setAuthTitle(requireAdmin ? '管理員驗證' : '個人身份驗證');
        setAuthPlaceholder(requireAdmin ? 'Admin Password' : '請輸入個人密碼'); 
        setPendingAction(() => action);
        setAuthError('');
        setShowAuthModal(true);
    };

    const handleAuthSubmit = async () => {
        if (!authInput) {
            setAuthError('請輸入密碼');
            return;
        }
        setIsVerifying(true);
        setAuthError('');
        
        let personalSuccess = false;
        let adminSuccess = false;
        let adminOtp = '';
  
        try {
            const isAdminMode = authTitle === '管理員驗證';
  
            if (!isAdminMode && person && person.id) {
                personalSuccess = await api.loginPerson(person.id, authInput);
            }
  
            if (!personalSuccess) {
                const adminResult = await api.authenticate(authInput);
                if (adminResult.success) {
                    adminSuccess = true;
                    adminOtp = adminResult.otp || '';
                }
            }
        } catch (e) {
            console.error("Auth process error", e);
        }
  
        if (personalSuccess) {
            if (person?.id) {
                const authKey = `louie_p_auth_${person.id}`;
                localStorage.setItem(authKey, String(Date.now() + 5 * 60 * 1000));
            }
            setShowAuthModal(false);
            setAuthInput('');
            if (pendingAction) pendingAction();
        } else if (adminSuccess) {
            localStorage.setItem('louie_admin_auth_ts', String(Date.now() + 5 * 60 * 1000));
            if (adminOtp) {
                api.setOtp(adminOtp);
            }
            setShowAuthModal(false);
            setAuthInput('');
            if (pendingAction) pendingAction();
        } else {
            setAuthError('驗證失敗：密碼錯誤');
        }
        setIsVerifying(false);
    };

    const handleUpdateProfile = async () => {
        if (!person) return;
        
        const success = await api.manageLookup(
            'people',
            person.name, 
            person.id,
            false,
            false,
            {
                myword: editMyWord,
                s_url: tempSUrl,
                b_url: tempBUrl,
                birthday: person.birthday,
                is_hidden: person.is_hidden
            }
        );
    
        if (success) {
            setWordFeedback({ msg: '更新成功', type: 'success' });
            await refreshData();
        } else {
            setWordFeedback({ msg: '更新失敗', type: 'error' });
        }
        
        setTimeout(() => setWordFeedback(null), 3000);
    };

    const passwordsMatch = newPassword === confirmPassword;
    const isPasswordValid = newPassword.length >= 6;

    const handleChangePassword = async () => {
        if (!person) return;
        if (!passwordsMatch || !isPasswordValid) return;
  
        const success = await api.manageLookup(
            'people',
            person.name,
            person.id,
            false,
            false,
            {
               password: newPassword,
               birthday: person.birthday,
               is_hidden: person.is_hidden
            }
        );
  
        if (success) {
            setPassFeedback({ msg: '密碼修改成功', type: 'success' });
            setNewPassword('');
            setConfirmPassword('');
        } else {
            setPassFeedback({ msg: '修改失敗', type: 'error' });
        }
        setTimeout(() => setPassFeedback(null), 3000);
    };

    const setTrainQuickRange = (range: '1W' | '1M' | '3M') => {
        setTrainActiveRange(range);
        setTrainShowCustom(false);
        const end = new Date();
        let start = new Date();
        if (range === '1W') start = subWeeks(end, 1);
        if (range === '1M') start = subMonths(end, 1);
        if (range === '3M') start = subMonths(end, 3);
        setTrainStartDate(format(start, 'yyyy-MM-dd'));
        setTrainEndDate(format(end, 'yyyy-MM-dd'));
    };

    const toggleTrainCustom = () => {
        if (trainActiveRange !== 'custom') {
            setTrainActiveRange('custom');
            setTrainShowCustom(true);
        } else {
            setTrainShowCustom(!trainShowCustom);
        }
    };

    const getAge = (birthday?: string) => {
        if (!birthday) return '??';
        return differenceInYears(new Date(), new Date(birthday));
    };

    const handlePrevPerson = () => {
        const newIndex = currentIndex > 0 ? currentIndex - 1 : activePeople.length - 1;
        onSelectPerson(activePeople[newIndex].id);
    };
    const handleNextPerson = () => {
        const newIndex = currentIndex < activePeople.length - 1 ? currentIndex + 1 : 0;
        onSelectPerson(activePeople[newIndex].id);
    };

    const handleUpdateRecord = async (id: string | number) => {
        const val = parseFloat(editValue);
        if (isNaN(val) || val <= 0) return;
        
        const rec = detailRecords.find(r => String(r.id) === String(id));
        if (!rec) {
            alert('找不到紀錄');
            return;
        }
  
        const success = await api.submitRecord({ 
            ...rec,
            item: 'training', 
            value: val.toFixed(3)
        });
        
        if (success) {
            setEditingRecordId(null);
            await refreshData();
        } else {
            alert('更新失敗：請確認網路連線');
        }
    };
  
    const handleDeleteRecord = (id: string | number) => {
        setRecordToDelete(id);
    };
  
    const executeDeleteRecord = async () => {
        if (!recordToDelete) return;
  
        const success = await api.deleteRecord(recordToDelete, 'training');
        
        if (success) {
            if (detailRecords.length <= 1) {
                setShowDetailModal(false);
            }
            await refreshData();
        } else {
            alert('刪除失敗：請確認網路連線');
        }
        setRecordToDelete(null);
    };

    const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '' || /^\d*\.?\d{0,3}$/.test(val)) {
            setEditValue(val);
        }
    };

    if (!person) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4 p-6 text-center">
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center border border-white/10 shadow-xl animate-pulse">
                    <Activity size={32} className="text-zinc-600" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">請選擇一位選手</h3>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">Select a player to view profile</p>
                </div>
                {people.length > 0 && <button onClick={() => setShowPlayerList(true)} className="px-4 py-2 bg-white/10 rounded-xl text-xs font-bold">選擇選手</button>}
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto no-scrollbar animate-fade-in pb-24 relative bg-[#0a0508] overflow-x-hidden" style={{ overscrollBehaviorY: 'contain' }}>
            <svg width="0" height="0" className="absolute">
                <defs>
                    <linearGradient id="neon-trophy" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#39e75f" />
                        <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Hero Section */}
            {/* User requested change: svh to 79 */}
            <div className="relative w-full h-[79svh] z-0 overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-[#1c1016] to-[#0a0508] z-0"></div>

                <div className="absolute inset-0 z-10 w-full h-full flex justify-center bg-black">
                {!imgError && bUrlBase ? (
                    <img 
                    key={person.id}
                    src={bUrlBase} 
                    onError={() => setImgError(true)}
                    className="w-full h-full object-contain bg-black" 
                    style={{ 
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

                <div className="absolute top-0 left-0 right-0 p-4 pt-safe-top z-50 flex items-center justify-between mt-4 pointer-events-none">
                    <button onClick={handlePrevPerson} className="w-12 h-12 flex items-center justify-center pointer-events-auto active:scale-90 transition-transform opacity-50 hover:opacity-100"><ChevronLeft size={24} className="text-white drop-shadow-md" /></button>
                    
                    <div 
                        onClick={(e) => { e.stopPropagation(); setShowPlayerList(true); }}
                        className="flex-1 flex flex-col items-center justify-center relative select-none z-50 px-2 min-w-0 cursor-pointer pointer-events-auto active:scale-95 transition-transform"
                    >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-sunset-gold/50 blur-3xl rounded-full pointer-events-none mix-blend-screen animate-pulse-slow"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-black/20 blur-xl rounded-full pointer-events-none"></div>
                        
                        <div className="w-full flex items-center justify-center gap-2 overflow-visible">
                            <h1 className="relative text-center text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-sunset-gold/90 drop-shadow-[0_4px_12px_rgba(0,0,0,1)] filter z-10 break-keep whitespace-nowrap overflow-visible p-2">
                                {person.name}
                            </h1>
                            <ChevronDown size={20} className="text-white/50 animate-bounce mt-2" />
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
            {/* Fix: Adjusted -mt-20 to pull content nicely over the bottom of the aspect-ratio image */}
            <div className="relative z-40 -mt-20 space-y-0">
                {/* Fix: Reduced pb to bring filter bar closer */}
                <div className="px-4 pb-2">
                    {/* Fix: Reduced bottom margin to remove gap (was mb-24) */}
                    <div className="grid grid-cols-5 gap-3 mb-2">
                        <button 
                            onClick={() => checkAuth(() => { 
                                setEditMyWord(person.myword || ''); 
                                setTempSUrl(person.s_url || '');
                                setTempBUrl(person.b_url || '');
                                setShowPersonalInfoModal(true); 
                            }, false)} 
                            /* Fix: Added relative z-50 and cursor-pointer explicitly */
                            className="col-span-3 flex items-center gap-3 bg-zinc-900/60 backdrop-blur-lg border border-white/5 rounded-2xl p-2 active:scale-[0.98] transition-all hover:bg-zinc-800/60 shadow-lg group overflow-hidden relative z-50 cursor-pointer"
                        >
                            <div className="w-16 h-16 rounded-full overflow-hidden flex-none border-2 border-white/10 shadow-inner bg-zinc-900 group-hover:border-chiachia-green/30 transition-colors z-10">
                                {!myWordImgError && sUrlBase ? (
                                    <img 
                                        src={sUrlBase} 
                                        onError={() => setMyWordImgError(true)}
                                        className="w-full h-full object-contain bg-black" 
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
                                    <span className="text-[10px] font-black text-chiachia-green bg-chiachia-green/10 px-1.5 py-0.5 rounded border border-chiachia-green/20">個人中心</span>
                                    <Edit2 size={10} className="text-zinc-500 group-hover:text-chiachia-green transition-colors" />
                                </div>
                                <div className="text-sm font-medium text-white/90 whitespace-nowrap overflow-hidden">
                                    <div className={`${(person.myword || '').length > 8 ? 'animate-marquee-infinite inline-block' : ''}`}>
                                        {person.myword || "編輯個人檔案..."}
                                        {(person.myword || '').length > 8 && <span className="inline-block w-8"></span>}
                                        {(person.myword || '').length > 8 && (person.myword || "編輯個人檔案...")}
                                    </div>
                                </div>
                            </div>
                        </button>

                        <div className="col-span-2 bg-zinc-900/60 backdrop-blur-lg border border-white/5 rounded-2xl p-2.5 flex flex-col justify-center relative overflow-hidden shadow-lg">
                            <div className="absolute top-[-5px] right-[-5px] p-2 opacity-100 rotate-12 scale-110">
                                <Trophy size={36} style={{ stroke: '#39e75f', strokeWidth: 1.5, filter: 'drop-shadow(0 0 5px rgba(57, 231, 95, 0.4))' }} className="opacity-40" />
                            </div>
                            <span className="text-[9px] text-chiachia-green uppercase tracking-wider font-black flex items-center gap-1 z-10"><Zap size={10} fill="currentColor"/> 最速紀錄</span>
                            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 font-mono tracking-tighter z-10 drop-shadow-sm truncate mt-1">
                                {allTimeBest ? allTimeBest.toFixed(3) : '--'}
                            </span>
                        </div>
                    </div>
                </div>
                
                {/* ... Training Filter Row ... */}
                <div className="sticky top-0 z-40 py-3 px-4 -mx-4 bg-[#0a0508]/85 backdrop-blur-xl border-b border-white/5 shadow-2xl transition-all">
                    <div className="flex flex-col gap-2">
                        <div className="relative h-12 flex items-center gap-2">
                            <div className="relative flex-1 group h-full">
                                <div className="absolute inset-0 bg-black/60 rounded-2xl border border-chiachia-green/30 shadow-glow-green pointer-events-none z-0"></div>
                                <select 
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                                >
                                    {trainingTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                </select>
                                <div className="relative z-10 flex items-center justify-between px-4 h-full pointer-events-none">
                                    <span className="text-white font-black text-sm tracking-wide truncate pr-4">{selectedType}</span>
                                    <ChevronDown size={14} className="text-chiachia-green flex-none" />
                                </div>
                            </div>
                            
                            <div className="flex items-center bg-zinc-900/80 p-1 rounded-2xl border border-white/5 gap-1 h-full">
                                {(['1W', '1M', '3M'] as const).map(range => (
                                    <button 
                                        key={range}
                                        onClick={() => setTrainQuickRange(range)} 
                                        className={`text-[9px] font-bold px-2 h-full rounded-xl transition-all ${trainActiveRange === range ? 'bg-white/10 text-white shadow-inner' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        {range}
                                    </button>
                                ))}
                                <div className="w-[1px] h-3 bg-white/10 mx-0.5"></div>
                                <button 
                                    onClick={toggleTrainCustom} 
                                    className={`p-2 rounded-xl transition-all h-full flex items-center justify-center ${trainActiveRange === 'custom' ? 'bg-chiachia-green/20 text-chiachia-green' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <Calendar size={14} />
                                </button>
                            </div>
                        </div>

                        {trainShowCustom && (
                            <div className="flex items-center justify-end gap-2 animate-fade-in bg-zinc-900/30 p-2 rounded-xl border border-white/5 border-dashed">
                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mr-1">Range</span>
                                <input 
                                    type="date" 
                                    value={trainStartDate} 
                                    onChange={(e) => { setTrainStartDate(e.target.value); setTrainActiveRange('custom'); }} 
                                    className="bg-zinc-950 text-[10px] font-mono text-zinc-300 outline-none w-auto min-w-[80px] text-center p-1 rounded border border-white/10" 
                                />
                                <span className="text-zinc-600 text-[10px]">-</span>
                                <input 
                                    type="date" 
                                    value={trainEndDate} 
                                    onChange={(e) => { setTrainEndDate(e.target.value); setTrainActiveRange('custom'); }} 
                                    className="bg-zinc-950 text-[10px] font-mono text-zinc-300 outline-none w-auto min-w-[80px] text-center p-1 rounded border border-white/10" 
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-4 space-y-3 pt-6 pb-20">
                    {dailyStats.map((stat, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => { setDetailDate(stat.date); setShowDetailModal(true); }}
                            className="glass-card rounded-2xl p-4 active:scale-[0.98] transition-all border border-white/5 hover:border-chiachia-green/40 group cursor-pointer relative overflow-hidden"
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
                                    {/* GOLD GLORY TEXT EFFECT */}
                                    <span className="text-sm font-mono font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 drop-shadow-sm">{stat.best.toFixed(3)}s</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ... (Rest of Modals same as original except Player List style below) ... */}
            {showDetailModal && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/85 backdrop-blur-md animate-fade-in" onClick={() => setShowDetailModal(false)}>
                    {/* ... Detail Modal Content ... */}
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
                                            checkAuth(() => setIsEditUnlocked(true), true);
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
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black font-mono ${i===0 ? 'bg-chiachia-green text-black shadow-glow-green' : 'bg-zinc-800 text-zinc-500'}`}>
                                            {i + 1}
                                        </div>
                                        {editingRecordId === rec.id ? (
                                            <input 
                                                autoFocus
                                                type="text" 
                                                inputMode="decimal"
                                                value={editValue}
                                                onChange={handleScoreChange}
                                                className="w-24 bg-black border border-chiachia-green rounded px-2 py-1 text-white font-mono text-sm outline-none"
                                            />
                                        ) : (
                                            <span className={`text-lg font-mono font-bold ${i===0 ? 'text-chiachia-green' : 'text-zinc-300'}`}>
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
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteRecord(rec.id!); }} className="p-2 text-zinc-600 hover:text-rose-500 rounded-lg active:scale-90"><Trash2 size={16} /></button>
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

            {/* ... Personal Info Modal ... */}
            {showPersonalInfoModal && (
                <div 
                    className="fixed inset-0 z-[100] animate-fade-in flex flex-col bg-[#0a0508] backdrop-blur-xl"
                    onClick={() => { setShowPersonalInfoModal(false); }}
                >
                    {/* ... existing personal info modal content ... */}
                    <div className="h-[env(safe-area-inset-top)] bg-transparent shrink-0" />
                    <div className="flex-1 flex flex-col p-6 overflow-hidden max-w-md mx-auto w-full animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 shrink-0 pt-2">
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">{person.name}</h3>
                                <p className="text-[9px] text-chiachia-green font-black uppercase tracking-[0.3em] mt-0.5">Personal Space</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowSettingsMode(!showSettingsMode)} className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all active:scale-95 ${showSettingsMode ? 'bg-chiachia-green text-black border-chiachia-green' : 'bg-white/5 text-zinc-400 border-white/10'}`}>
                                    <Settings size={20} />
                                </button>
                                <button onClick={() => { setShowPersonalInfoModal(false); }} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full text-zinc-400 active:scale-95"><X size={20} /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar pb-[env(safe-area-inset-bottom)] space-y-3">
                            {showSettingsMode ? (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="space-y-4 p-4 bg-zinc-900/50 rounded-2xl border border-white/5">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1"><MessageCircle size={10}/> 我想說的話</label>
                                            <textarea value={editMyWord} onChange={e => setEditMyWord(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none resize-none h-20 shadow-inner" />
                                        </div>
                                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1 pt-2 border-t border-white/5"><UserCircle2 size={12}/> 選手照片管理</h4>
                                        <ImageCropperInput label="更換頭像" urlValue={tempSUrl} onChange={setTempSUrl} personId={person.id} typeSuffix="s" ratioClass="aspect-square w-44 mx-auto rounded-full border-2 border-white/10" />
                                        <ImageCropperInput label="更換全身照" urlValue={tempBUrl} onChange={setTempBUrl} personId={person.id} typeSuffix="b" ratioClass="aspect-[2/3] w-full mx-auto rounded-xl" />
                                        <button onClick={handleUpdateProfile} className="w-full py-3 bg-gradient-to-r from-chiachia-green to-emerald-600 text-white font-bold text-xs rounded-xl shadow-glow active:scale-95 transition-all mt-2">儲存個人檔案</button>
                                        {wordFeedback && (<div className={`text-center text-[10px] font-bold animate-fade-in ${wordFeedback.type === 'success' ? 'text-green-500' : 'text-rose-500'}`}>{wordFeedback.msg}</div>)}
                                    </div>
                                    <div className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-3 mt-4">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1"><Key size={10}/> 安全設定 - 重設密碼</label>
                                        <div className="space-y-2">
                                            <input type="password" placeholder="輸入新密碼 (至少6碼)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none" />
                                            <div className="space-y-1">
                                                <input type="password" placeholder="再次確認新密碼" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full bg-black/60 border rounded-xl px-4 py-3 text-white text-xs outline-none ${!passwordsMatch && confirmPassword.length > 0 ? 'border-rose-500' : 'border-white/10'}`} />
                                                {!passwordsMatch && confirmPassword.length > 0 && (<div className="text-[10px] text-rose-500 font-bold ml-1 animate-fade-in">密碼不一致</div>)}
                                            </div>
                                        </div>
                                        <button onClick={handleChangePassword} disabled={!newPassword || !confirmPassword || !passwordsMatch || !isPasswordValid} className="w-full py-3 bg-gradient-to-r from-chiachia-green to-emerald-600 text-white font-bold text-xs rounded-xl border border-white/5 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">確認修改密碼</button>
                                        {passFeedback && (<div className={`text-center text-[10px] font-bold animate-fade-in ${passFeedback.type === 'success' ? 'text-green-500' : 'text-rose-500'}`}>{passFeedback.msg}</div>)}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-white/5">
                                        {(['registered', 'available', 'ended'] as const).map(f => (
                                            <button 
                                                key={f} 
                                                onClick={() => setRaceFilter(f)} 
                                                className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all uppercase ${raceFilter === f ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                {f === 'registered' ? '已報名' : f === 'available' ? '可參加' : '已結束'}
                                            </button>
                                        ))}
                                    </div>

                                    {managingEvent && (
                                        <div className="animate-fade-in bg-zinc-900/50 p-4 rounded-2xl border border-white/10 space-y-4 relative">
                                            <div className="flex justify-between items-center mb-1">
                                                <h4 className="text-sm font-bold text-white flex items-center gap-2"><Flag size={14}/> {managingEvent.mode === 'join' ? '報名確認' : '編輯報名資訊'}</h4>
                                                <button onClick={() => setManagingEvent(null)} className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400"><X size={14}/></button>
                                            </div>
                                            
                                            <div className="space-y-3">
                                                <div className="bg-black/40 p-2 rounded-xl flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                                                        <Calendar size={16} className="text-zinc-500"/>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-black text-chiachia-green uppercase">{managingEvent.date}</div>
                                                        <div className="text-xs font-bold text-white line-clamp-1">{managingEvent.name}</div>
                                                    </div>
                                                </div>

                                                <ImageCropperInput 
                                                    label="個人賽事照片 (選填)"
                                                    urlValue={managePhotoUrl}
                                                    onChange={setManagePhotoUrl}
                                                    personId={person.id}
                                                    typeSuffix="race"
                                                    ratioClass="aspect-[4/3] w-full rounded-xl bg-black"
                                                    customFileName={`race_${managingEvent.date}_1_${person.id}`}
                                                />

                                                {/* NEW: Result Input for Ended Races */}
                                                {managingEvent.date < todayStr && (
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1"><Trophy size={10}/> 比賽排名 / 成績</label>
                                                        <input 
                                                            type="text"
                                                            value={manageValue}
                                                            onChange={(e) => setManageValue(e.target.value)}
                                                            placeholder="例如：冠軍、第3名..."
                                                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none shadow-inner focus:border-chiachia-green/50 transition-colors"
                                                        />
                                                    </div>
                                                )}

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1"><StickyNote size={10}/> 備註 / 目標</label>
                                                    <textarea 
                                                        value={manageNote}
                                                        onChange={(e) => setManageNote(e.target.value)}
                                                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none h-16 resize-none"
                                                        placeholder="例如：目標前三名..."
                                                    />
                                                </div>

                                                <button onClick={handleConfirmSubmit} className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-500 text-white font-bold text-xs rounded-xl shadow-glow-green active:scale-95 transition-all">{managingEvent.mode === 'join' ? '確認加入' : '儲存變更'}</button>
                                            </div>
                                        </div>
                                    )}

                                    {!managingEvent && (
                                        <div className="space-y-3">
                                            {raceManagerData[raceFilter].length > 0 ? (
                                                raceManagerData[raceFilter].map((evt: any, i: number) => {
                                                    const isExpanded = expandedRaceId === evt.id;
                                                    const isUpcoming = evt.date >= todayStr;
                                                    // Ensure we have a valid image url to show
                                                    // Default to display_url which handles the fallback logic in raceManagerData
                                                    const [imgUrl, imgFrag] = (evt.display_url || '').split('#');
                                                    let iz=1, ix=50, iy=50;
                                                    if(imgFrag) {
                                                        const sp = new URLSearchParams(imgFrag);
                                                        iz = parseFloat(sp.get('z')||'1');
                                                        ix = parseFloat(sp.get('x')||'50');
                                                        iy = parseFloat(sp.get('y')||'50');
                                                    }

                                                    return (
                                                    <div key={i} onClick={() => setExpandedRaceId(isExpanded ? null : evt.id)} className="rounded-2xl p-0 relative overflow-hidden group animate-slide-up transition-all active:scale-[0.99] mb-4 cursor-pointer border border-chiachia-green/40 shadow-[0_4px_15px_rgba(57,231,95,0.15)] bg-zinc-900/40 backdrop-blur-md">
                                                        {imgUrl ? (
                                                            <div className="absolute inset-0 z-0 overflow-hidden rounded-2xl">
                                                                <div className={`absolute inset-0 z-10 transition-colors ${isUpcoming ? 'bg-black/20' : 'bg-black/70'}`} />
                                                                <img src={imgUrl} className="w-full h-full object-cover opacity-60" style={{ transform: `translate(${(ix - 50) * 1.5}%, ${(iy - 50) * 1.5}%) scale(${iz})`}} />
                                                            </div>
                                                        ) : (
                                                            <div className="absolute inset-0 z-0 overflow-hidden bg-zinc-900">
                                                                <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />
                                                                <div className="w-full h-full flex items-center justify-center opacity-10"><Trophy size={64}/></div>
                                                            </div>
                                                        )}
                                                        
                                                        <div className="relative z-10 p-5">
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div className="min-w-0 flex-1">
                                                                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-tighter mb-2 ${isUpcoming ? 'bg-sunset-gold text-amber-950 border-sunset-gold/50 shadow-glow-gold' : 'bg-white/10 text-white border-white/20 shadow-inner'}`}>
                                                                        <Calendar size={10} />
                                                                        <span className="font-mono">{evt.date}</span>
                                                                    </div>
                                                                    <div className="text-xl font-black italic tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] leading-tight truncate">{evt.name}</div>
                                                                    <div className="text-[11px] font-black text-white/95 mt-1 uppercase tracking-[0.15em] drop-shadow-md">{evt.race_group || 'RACE'}</div>
                                                                </div>
                                                                
                                                                {isExpanded && (
                                                                    <div className="flex gap-2 shrink-0 animate-fade-in">
                                                                        {evt.address && (
                                                                            <button onClick={(e) => { e.stopPropagation(); handleNavigate(evt.address); }} className="w-8 h-8 flex items-center justify-center bg-black/60 backdrop-blur rounded-xl border border-white/10 text-white active:scale-90 hover:bg-chiachia-green/20">
                                                                                <Navigation size={14} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            {isExpanded && (
                                                                <div className="mt-4 pt-4 border-t border-white/20 animate-fade-in">
                                                                    <div className="flex items-center gap-2 mb-3 text-sunset-gold/90 drop-shadow-md">
                                                                        <StickyNote size={12} />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest">個人筆記</span>
                                                                    </div>
                                                                    <div className="bg-black/40 p-3 rounded-xl border border-white/5 text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                                                        {evt.note || 'No notes added.'}
                                                                    </div>

                                                                    <div className="mt-4 flex gap-2" onClick={e => e.stopPropagation()}>
                                                                        {raceFilter === 'available' && (
                                                                            <button onClick={() => handlePrepareJoin(evt)} className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-green-500 text-white font-bold text-[10px] rounded-xl shadow-glow-green active:scale-95 transition-all flex items-center justify-center gap-1">
                                                                                <Plus size={12} /> 加入報名
                                                                            </button>
                                                                        )}
                                                                        {raceFilter === 'registered' && (
                                                                            <>
                                                                                <button onClick={() => handlePrepareEdit(evt)} className="flex-1 py-2 bg-zinc-800 text-white font-bold text-[10px] rounded-xl border border-white/10 active:scale-95 transition-all flex items-center justify-center gap-1 hover:bg-zinc-700">
                                                                                    <Edit2 size={12} /> 編輯資訊
                                                                                </button>
                                                                                <button onClick={() => handleWithdrawRace(evt.recordId)} className="w-10 flex items-center justify-center py-2 bg-black/40 text-rose-500 font-bold text-[10px] rounded-xl border border-rose-500/30 active:scale-95 transition-all hover:bg-rose-500/10">
                                                                                    <MinusCircle size={14} />
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                        {raceFilter === 'ended' && (
                                                                            <>
                                                                            <button onClick={() => handlePrepareEdit(evt)} className="flex-1 py-2 bg-zinc-800 text-white font-bold text-[10px] rounded-xl border border-white/10 active:scale-95 transition-all flex items-center justify-center gap-1 hover:bg-zinc-700">
                                                                                    <Edit2 size={12} /> 更新紀錄
                                                                            </button>
                                                                            <div className="px-3 flex items-center justify-center text-[9px] text-zinc-500 font-bold uppercase tracking-widest bg-black/40 rounded-xl border border-white/5">Completed</div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {!isExpanded && (
                                                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                                                                   <div className={`w-1.5 h-1.5 rounded-full ${isUpcoming ? 'bg-sunset-gold animate-pulse' : 'bg-emerald-500'}`}></div>
                                                                   <span className="text-[10px] font-black text-white/80 uppercase tracking-widest drop-shadow-sm">{isUpcoming ? '戰備預定' : '完賽紀錄'}</span>
                                                                   {raceFilter === 'ended' && (
                                                                       <div className="ml-auto text-lg font-black font-mono text-yellow-400 italic drop-shadow-md">{evt.value || '--'}</div>
                                                                   )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )})
                                            ) : (
                                                <div className="py-12 flex flex-col items-center justify-center text-zinc-600 border border-dashed border-zinc-800 rounded-2xl">
                                                    <Trophy size={24} className="mb-2 opacity-30" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">此區間無賽事</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {recordToDelete && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setRecordToDelete(null)}>
                    <div className="glass-card w-full max-w-xs rounded-3xl p-6 shadow-2xl border-rose-500/30 text-center animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash2 size={32} className="text-rose-500" />
                        </div>
                        <h3 className="text-lg font-black text-white mb-2">確定刪除紀錄？</h3>
                        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">此操作無法復原。</p>
                        <div className="grid grid-cols-2 gap-3 mt-6">
                            <button onClick={() => setRecordToDelete(null)} className="py-3 bg-zinc-900 text-zinc-400 font-bold text-xs rounded-xl active:bg-zinc-800 transition-colors border border-white/5">取消</button>
                            <button onClick={executeDeleteRecord} className="py-3 bg-rose-600 text-white font-bold text-xs rounded-xl active:scale-95 transition-all shadow-glow-rose">確定刪除</button>
                        </div>
                    </div>
                </div>
            )}

            {showAuthModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md animate-fade-in" onClick={() => setShowAuthModal(false)}>
                    <div className="glass-card w-full max-w-xs rounded-3xl p-8 shadow-2xl border-white/10 text-center animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <KeyRound size={32} className="text-white opacity-80" />
                        </div>
                        <h3 className="text-xl font-black text-white tracking-tight mb-2">{authTitle}</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-6">Security Check</p>
                        
                        <input 
                            autoFocus
                            type="password" 
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={authInput}
                            onChange={(e) => setAuthInput(e.target.value)}
                            placeholder={authPlaceholder}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-center tracking-widest mb-4 outline-none focus:border-chiachia-green/50 shadow-inner"
                        />
                        {authError && <div className="text-rose-500 text-[10px] font-bold mb-4">{authError}</div>}
                        
                        <button 
                            onClick={handleAuthSubmit}
                            disabled={!authInput || isVerifying}
                            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold text-xs rounded-xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />} 
                            驗證
                        </button>
                    </div>
                </div>
            )}

            {showPlayerList && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/85 backdrop-blur-md animate-fade-in" onClick={() => setShowPlayerList(false)}>
                    <div className="glass-card w-full max-w-md rounded-t-[32px] p-6 shadow-2xl animate-slide-up bg-[#0f0508] border-white/10 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight">切換選手</h3>
                                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-0.5">Select Rider</p>
                            </div>
                            <button onClick={() => setShowPlayerList(false)} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-zinc-500 active:scale-95"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
                            <div className="grid grid-cols-4 gap-3">
                                {activePeople.map(p => (
                                    <RiderListItem 
                                        key={p.id} 
                                        person={p} 
                                        isActive={String(p.id) === String(activePersonId)} 
                                        onClick={() => { onSelectPerson(p.id); setShowPlayerList(false); }} 
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Personal;
