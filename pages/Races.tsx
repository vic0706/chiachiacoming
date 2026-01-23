
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DataRecord, LookupItem } from '../types';
import { api } from '../services/api';
import { uploadImage } from '../services/supabase';
import { Search, Plus, X, Calendar, Trash2, Edit2, Camera, Filter, ChevronDown, Loader2, MapPin, ExternalLink, Maximize, Link as LinkIcon, Users, Trophy, AlertTriangle, UploadCloud, Lock, Unlock, Check } from 'lucide-react';
import { format, subMonths, addHours, subWeeks } from 'date-fns';

interface RacesProps {
  data: DataRecord[];
  refreshData: () => Promise<void>;
  people: LookupItem[];
  raceGroups: LookupItem[]; 
}

interface RaceEvent {
    key: string;
    date: string;
    name: string;
    series_name: string;
    race_id: string | number;
    event_id?: string | number;
    address: string;
    url: string;
    records: DataRecord[]; // Sub-items (Participants)
}

const Races: React.FC<RacesProps> = ({ data, refreshData, people, raceGroups }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'future' | 'past'>('all');
  const [filterStartDate, setFilterStartDate] = useState(format(subWeeks(new Date(), 1), 'yyyy-MM-dd'));
  const [filterEndDate, setFilterEndDate] = useState(format(addHours(new Date(), 8760), 'yyyy-MM-dd')); // +1 year
  
  // Date Filter UI State
  const [activeRange, setActiveRange] = useState<'1W' | '1M' | '3M' | 'custom'>('1W');
  const [showCustomDate, setShowCustomDate] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedRaceKey, setExpandedRaceKey] = useState<string | null>(null);

  const [editingEventId, setEditingEventId] = useState<string | number | undefined>(undefined);

  const initialEventForm = {
    date: format(new Date(), 'yyyy-MM-dd'),
    name: '',
    race_id: raceGroups[0]?.id || '',
    address: '',
    url: ''
  };
  const [eventForm, setEventForm] = useState(initialEventForm);
  
  interface ParticipantRow {
      key: string; 
      originalId?: string | number; 
      people_id: string | number;
      value: string; // Rank
      isDeleted?: boolean; 
  }
  const [participantRows, setParticipantRows] = useState<ParticipantRow[]>([]);
  const [originalRecords, setOriginalRecords] = useState<DataRecord[]>([]);

  // Image Cropper State
  const [zoomScale, setZoomScale] = useState(1);
  const [posX, setPosX] = useState(50); 
  const [posY, setPosY] = useState(50); 
  const cropperRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });
  const [isCropperLocked, setIsCropperLocked] = useState(true);

  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState<{key: string, name: string, records: DataRecord[]} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showPreviewConfirm, setShowPreviewConfirm] = useState(false);
  
  // Add Player Modal
  const [showParticipantSelect, setShowParticipantSelect] = useState(false);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Date Range Helper
  const setQuickRange = (range: '1W' | '1M' | '3M') => {
      setActiveRange(range);
      setShowCustomDate(false);
      const end = new Date(); 
      let start = new Date();
      if (range === '1W') start = subWeeks(end, 1);
      if (range === '1M') start = subMonths(end, 1);
      if (range === '3M') start = subMonths(end, 3);
      
      setFilterStartDate(format(start, 'yyyy-MM-dd'));
      setFilterEndDate(format(addHours(end, 8760), 'yyyy-MM-dd')); // Keep looking forward for races
  };

  const toggleCustomDate = () => {
      if (activeRange !== 'custom') {
          setActiveRange('custom');
          setShowCustomDate(true);
      } else {
          setShowCustomDate(!showCustomDate);
      }
  };

  // Grouping Logic
  const groupedRaces = useMemo(() => {
    const groups: { [key: string]: RaceEvent } = {};
    
    // Filter source data by date first
    const raceRecords = data.filter(r => r.item === 'race' && r.date >= filterStartDate && r.date <= filterEndDate);

    raceRecords.forEach(r => {
        const key = `${r.date}_${r.name}_${r.race_group}`;
        if (!groups[key]) {
            groups[key] = {
                key,
                date: r.date,
                name: r.name,
                series_name: r.race_group,
                race_id: r.series_id || r.race_id || '', // Maintain compatibility
                event_id: r.event_id,
                address: r.address,
                url: r.url,
                records: []
            };
        }
        if (r.event_id && !groups[key].event_id) {
            groups[key].event_id = r.event_id;
        }
        groups[key].records.push(r);
    });
    
    let list = Object.values(groups);
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        list = list.filter(g => g.name.toLowerCase().includes(lower) || g.series_name.toLowerCase().includes(lower));
    }
    if (selectedGroup) {
        list = list.filter(g => g.series_name === selectedGroup);
    }
    if (filterType === 'future') {
        list = list.filter(g => g.date >= todayStr);
    } else if (filterType === 'past') {
        list = list.filter(g => g.date < todayStr);
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data, searchTerm, selectedGroup, filterType, filterStartDate, filterEndDate]);

  const handleOpenAdd = () => {
      setEventForm({ ...initialEventForm, race_id: raceGroups[0]?.id || '' });
      setParticipantRows([]);
      setOriginalRecords([]);
      setEditingEventId(undefined);
      setZoomScale(1);
      setPosX(50);
      setPosY(50);
      setIsCropperLocked(true);
      setIsEditMode(false);
      setShowModal(true);
  };

  const handleOpenEdit = (event: RaceEvent) => {
      const [baseUrl, fragment] = event.url.split('#');
      let z = 1, x = 50, y = 50;
      if (fragment) {
        const params = new URLSearchParams(fragment);
        z = parseFloat(params.get('z') || '1');
        x = parseFloat(params.get('x') || '50');
        y = parseFloat(params.get('y') || '50');
      }

      const defaultGroup = raceGroups.length > 0 ? raceGroups[0] : null;
      let targetRaceId = event.race_id;
      
      const isValidGroup = raceGroups.some(g => String(g.id) === String(targetRaceId));
      
      if (!targetRaceId || !isValidGroup) {
          targetRaceId = defaultGroup ? defaultGroup.id : '';
      }

      setEventForm({
          date: event.date,
          name: event.name,
          race_id: targetRaceId, 
          address: event.address,
          url: baseUrl
      });
      setZoomScale(z);
      setPosX(x);
      setPosY(y);
      setIsCropperLocked(true);
      setEditingEventId(event.event_id);

      const realRecords = event.records.filter(r => r.value !== 'PREVIEW');

      const rows: ParticipantRow[] = realRecords.map(r => ({
          key: String(r.id),
          originalId: r.id,
          people_id: r.people_id || '',
          value: r.value
      }));
      setParticipantRows(rows);
      setOriginalRecords(realRecords);

      setIsEditMode(true);
      setShowModal(true);
  };

  const handleAddParticipant = (personId: string | number) => {
      setParticipantRows(prev => [
          ...prev, 
          { key: `new_${Date.now()}`, people_id: personId, value: '' }
      ]);
      setShowParticipantSelect(false);
  };

  const handleRemoveRow = (key: string) => {
      setParticipantRows(prev => {
          return prev.map(row => {
              if (row.key === key) {
                  if (!row.originalId) return null; 
                  return { ...row, isDeleted: true };
              }
              return row;
          }).filter(Boolean) as ParticipantRow[];
      });
  };

  const handleRowChange = (key: string, field: 'people_id' | 'value', val: string) => {
      setParticipantRows(prev => prev.map(r => r.key === key ? { ...r, [field]: val } : r));
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!eventForm.name.trim()) {
          alert("請輸入比賽名稱");
          return;
      }

      if (!eventForm.race_id) {
          alert("請選擇賽事系列");
          return;
      }

      const rowsToProcess = participantRows.filter(r => !r.isDeleted);
      if (rowsToProcess.length === 0 && !isEditMode) {
          setShowPreviewConfirm(true);
          return;
      }

      await executeSave(rowsToProcess);
  };

  const executeSave = async (rows: ParticipantRow[]) => {
      setIsSubmitting(true);
      setShowPreviewConfirm(false);

      const finalUrl = eventForm.url ? `${eventForm.url}#z=${zoomScale}&x=${posX}&y=${posY}` : '';

      const deletedRows = participantRows.filter(r => r.isDeleted && r.originalId);
      for (const row of deletedRows) {
          if (row.originalId) await api.deleteRecord(row.originalId, 'race');
      }

      let promises = [];

      if (!isEditMode && rows.length === 0) {
          const payload = {
              item: 'race' as const,
              date: eventForm.date,
              name: eventForm.name,
              race_id: eventForm.race_id, 
              address: eventForm.address,
              url: finalUrl,
              value: 'PREVIEW'
          };
          promises.push(api.submitRecord(payload));
      }
      else {
          if (isEditMode && editingEventId) {
              const eventPayload = {
                  id: editingEventId, 
                  item: 'race' as const,
                  date: eventForm.date,
                  name: eventForm.name,
                  race_id: eventForm.race_id,
                  address: eventForm.address,
                  url: finalUrl,
                  value: 'PREVIEW'
              };
              promises.push(api.submitRecord(eventPayload));
          } else if (!isEditMode && rows.length > 0) {
             await api.submitRecord({
                  item: 'race' as const,
                  date: eventForm.date,
                  name: eventForm.name,
                  race_id: eventForm.race_id,
                  address: eventForm.address,
                  url: finalUrl,
                  value: 'PREVIEW'
              });
          }

          const targetEventId = editingEventId;

          const recordPromises = rows.map(row => {
              const payload = {
                  id: row.originalId,
                  item: 'race' as const,
                  date: eventForm.date,
                  name: eventForm.name, 
                  race_id: eventForm.race_id, 
                  event_id: targetEventId, 
                  address: eventForm.address,
                  url: finalUrl,
                  people_id: row.people_id,
                  value: row.value,
                  note: ''
              };
              return api.submitRecord(payload);
          });
          promises = [...promises, ...recordPromises];
      }

      await Promise.all(promises);
      
      await refreshData();
      setIsSubmitting(false);
      setShowModal(false);
  };

  const handleDeleteEvent = async () => {
      if (!confirmDeleteEvent) return;
      setIsDeleting(true);
      
      const recordsToDelete = confirmDeleteEvent.records;
      
      if (recordsToDelete.length === 1 && String(recordsToDelete[0].id).startsWith('preview_')) {
          await api.deleteRecord(recordsToDelete[0].id!, 'race');
      } else {
          const promises = recordsToDelete.map(r => api.deleteRecord(r.id!, 'race'));
          await Promise.all(promises);
      }
      
      await refreshData();
      setIsDeleting(false);
      setConfirmDeleteEvent(null);
  };

  // Image Upload Logic
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setIsUploading(true);
          const file = e.target.files[0];
          
          // Naming convention: race_event_[id]_[date].jpg or race_event_[timestamp]_[date].jpg
          const idPart = editingEventId || Date.now();
          const customName = `race_event_${idPart}_${eventForm.date}`;

          const result = await uploadImage(file, 'race', customName); 
          if (result.url) {
              const timestampUrl = `${result.url}?t=${Date.now()}`;
              setEventForm({...eventForm, url: timestampUrl});
              setZoomScale(1);
              setPosX(50);
              setPosY(50);
              setIsCropperLocked(false);
          } else {
              alert(`上傳失敗: ${result.error}`);
          }
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isCropperLocked) return;
    isDragging.current = true;
    const point = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
    lastPoint.current = { x: point.clientX, y: point.clientY };
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging.current || !cropperRef.current || isCropperLocked) return;
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


  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="flex flex-col h-full w-full overflow-hidden animate-fade-in">
      <div className="flex-none px-4 pt-2 pb-3 space-y-3 bg-background/80 backdrop-blur-md z-30 border-b border-white/5 relative shadow-lg">
          {/* ... Headers ... */}
          <div className="flex justify-between items-end mt-1">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">賽事資訊</h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-0.5 italic">Racing Information</p>
            </div>
            <button onClick={handleOpenAdd} className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sunset-rose to-rose-700 flex items-center justify-center shadow-glow-rose active:scale-95 transition-all text-white border border-white/20">
              <Plus size={24} />
            </button>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative h-11">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input type="text" placeholder="檢索..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-full bg-zinc-900/50 border border-white/10 rounded-xl pl-10 pr-3 text-white outline-none text-sm focus:border-sunset-rose/40 shadow-inner" />
            </div>
            <div className="relative w-[38%] h-11">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-sunset-gold" size={14} />
                <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="w-full h-full appearance-none bg-zinc-900/50 border border-white/10 rounded-xl pl-9 pr-8 text-white text-xs font-black outline-none truncate shadow-inner">
                  <option value="">賽事系列</option>
                  {raceGroups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={14} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2 h-9">
                <div className="flex items-center bg-zinc-900/50 p-1 rounded-xl border border-white/5 gap-1 shrink-0">
                    {(['1W', '1M', '3M'] as const).map(range => (
                        <button key={range} onClick={() => setQuickRange(range)} className={`text-[9px] font-bold px-2 py-1 rounded-lg transition-all ${activeRange === range ? 'bg-zinc-800 text-white shadow-inner' : 'text-zinc-500 hover:text-zinc-300'}`}>{range}</button>
                    ))}
                    <div className="w-[1px] h-3 bg-white/10 mx-0.5"></div>
                    <button onClick={toggleCustomDate} className={`p-1 rounded-lg transition-all ${activeRange === 'custom' ? 'bg-sunset-rose/20 text-sunset-rose' : 'text-zinc-500 hover:text-zinc-300'}`}><Calendar size={14} /></button>
                </div>
                <div className="flex-1 bg-zinc-900/50 rounded-xl p-1 flex relative border border-white/5">
                    {(['all', 'future', 'past'] as const).map((status) => (
                        <button key={status} onClick={() => setFilterType(status)} className={`flex-1 text-[9px] font-bold rounded-lg transition-all ${filterType === status ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}>{status === 'all' ? '全部' : status === 'future' ? '近期' : '歷史'}</button>
                    ))}
                </div>
            </div>
            {showCustomDate && (
                <div className="flex items-center justify-end gap-2 animate-fade-in bg-zinc-900/30 p-2 rounded-xl border border-white/5 border-dashed">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mr-1">Range</span>
                    <input type="date" value={filterStartDate} onChange={(e) => { setFilterStartDate(e.target.value); setActiveRange('custom'); }} className="bg-zinc-950 text-[10px] font-mono text-zinc-300 outline-none w-auto min-w-[80px] text-center p-1 rounded border border-white/10" />
                    <span className="text-zinc-600 text-[10px]">-</span>
                    <input type="date" value={filterEndDate} onChange={(e) => { setFilterEndDate(e.target.value); setActiveRange('custom'); }} className="bg-zinc-950 text-[10px] font-mono text-zinc-300 outline-none w-auto min-w-[80px] text-center p-1 rounded border border-white/10" />
                </div>
            )}
          </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-4 no-scrollbar">
        {groupedRaces.length > 0 ? groupedRaces.map((event) => {
          /* ... existing race card render ... */
          const isUpcoming = event.date >= todayStr;
          const isExpanded = expandedRaceKey === event.key;
          const [imageUrl, fragment] = event.url.split('#');
          let z = 1, x = 50, y = 50;
          if (fragment) {
             const params = new URLSearchParams(fragment);
             z = parseFloat(params.get('z') || '1');
             x = parseFloat(params.get('x') || '50');
             y = parseFloat(params.get('y') || '50');
          }

          const recordItems = event.records
            .filter(r => r.value !== 'PREVIEW') 
            .map((rec) => {
               const person = people.find(p => String(p.id) === String(rec.people_id));
               const isRetired = person?.is_hidden;
               const [sUrlBase, sUrlFragment] = (person?.s_url || '').split('#');
               let sz=1, sx=50, sy=50;
               if(sUrlFragment) {
                  const sp = new URLSearchParams(sUrlFragment);
                  sz = parseFloat(sp.get('z')||'1');
                  sx = parseFloat(sp.get('x')||'50');
                  sy = parseFloat(sp.get('y')||'50');
               }

               return (
                  <div key={rec.id} className="flex justify-between items-center bg-black/50 border border-white/10 p-2.5 rounded-xl backdrop-blur-md mb-2 shrink-0 h-14 w-full">
                      <div className="flex items-center gap-2 overflow-hidden">
                          <div className={`w-8 h-8 rounded-full flex-none flex items-center justify-center overflow-hidden border-2 ${isRetired ? 'bg-zinc-800 border-zinc-500' : 'bg-zinc-800 border-sunset-rose shadow-glow-rose'}`}>
                              {sUrlBase ? (
                                  <img src={sUrlBase} alt={rec.person_name} className="w-full h-full object-cover" style={{ transform: `translate(${(sx - 50) * 1.5}%, ${(sy - 50) * 1.5}%) scale(${sz})` }}/>
                              ) : (
                                  <span className={`text-[10px] font-black ${isRetired ? 'text-zinc-400' : 'text-white'}`}>{rec.person_name.charAt(0)}</span>
                              )}
                          </div>
                          <div className="min-w-0"><div className="text-[10px] font-bold text-white truncate">{rec.person_name}</div></div>
                      </div>
                      <div className="flex flex-col items-end"><span className="text-xs font-black font-mono italic text-sunset-gold drop-shadow-[0_0_5px_rgba(251,191,36,0.6)]">{rec.value || '--'}</span></div>
                  </div>
               );
          });

          return (
            <div key={event.key} onClick={() => setExpandedRaceKey(isExpanded ? null : event.key)} className={`${isUpcoming ? 'glass-card-gold border-sunset-gold/40' : 'glass-card border-white/10'} rounded-2xl p-0 relative overflow-hidden group animate-slide-up transition-all shadow-xl active:scale-[0.99]`} >
              {imageUrl && (
                <div className="absolute inset-0 z-0 overflow-hidden rounded-2xl">
                  <div className={`absolute inset-0 z-10 transition-colors ${isUpcoming ? 'bg-black/20' : 'bg-black/70'}`} />
                  <img src={imageUrl} alt={event.name} className="w-full h-full object-cover" style={{ transform: `translate(${(x - 50) * 1.5}%, ${(y - 50) * 1.5}%) scale(${z})`}} />
                </div>
              )}
              <div className="relative z-10 p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="min-w-0 flex-1">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-tighter mb-2 ${isUpcoming ? 'bg-sunset-gold text-amber-950 border-sunset-gold/50 shadow-glow-gold' : 'bg-white/10 text-white border-white/20 shadow-inner'}`}>
                       <Calendar size={10} />
                       <span className="font-mono">{event.date}</span>
                    </div>
                    <h3 className="text-xl font-black italic tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] leading-tight truncate">{event.name}</h3>
                    <p className="text-[11px] font-black text-white/95 mt-1 uppercase tracking-[0.15em] drop-shadow-md">{event.series_name || 'BxB'}</p>
                  </div>
                  {isExpanded && (
                      <div className="flex gap-2 shrink-0 animate-fade-in">
                        <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(event); }} className="p-2 rounded-xl bg-white/10 text-white border border-white/20 backdrop-blur-md active:scale-90 shadow-lg"><Edit2 size={14} /></button>
                        {event.address && (
                          <button onClick={(e) => { e.stopPropagation(); if(event.address) window.open(event.address.startsWith('http') ? event.address : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`, '_blank'); }} className="p-2 rounded-xl bg-black/60 text-white border border-white/20 backdrop-blur-md active:scale-90 shadow-lg">{event.address.startsWith('http') ? <ExternalLink size={14} /> : <MapPin size={14} />}</button>
                        )}
                      </div>
                  )}
                </div>
                {isExpanded && (
                   <div className="mt-4 pt-4 border-t border-white/20 animate-fade-in">
                      <div className="flex items-center gap-2 mb-3 text-sunset-gold/90 drop-shadow-md">
                         <Users size={12} />
                         <span className="text-[10px] font-black uppercase tracking-widest">參賽選手名單</span>
                      </div>
                      <div className="relative h-[100px] overflow-hidden mask-gradient-vertical">
                          {recordItems.length > 0 ? (
                            <div className={`grid grid-cols-2 gap-x-2 ${recordItems.length > 4 ? 'animate-marquee-vertical hover:pause' : ''}`}>
                                {recordItems}
                                {recordItems.length > 4 && recordItems}
                            </div>
                          ) : (
                             <div className="text-white/50 text-xs text-center mt-8">尚無參賽選手</div>
                          )}
                          <style>{`
                            .animate-marquee-vertical { animation: marqueeVertical 15s linear infinite; }
                            .hover\\:pause:hover { animation-play-state: paused; }
                            @keyframes marqueeVertical { 0% { transform: translateY(0); } 100% { transform: translateY(-50%); } }
                            .mask-gradient-vertical { mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent); -webkit-mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent); }
                          `}</style>
                      </div>
                   </div>
                )}
                {!isExpanded && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                       <div className={`w-1.5 h-1.5 rounded-full ${isUpcoming ? 'bg-sunset-gold animate-pulse' : 'bg-emerald-500'}`}></div>
                       <span className="text-[10px] font-black text-white/80 uppercase tracking-widest drop-shadow-sm">{isUpcoming ? '戰備預定' : '完賽紀錄'}</span>
                       <span className="text-[10px] text-zinc-400 font-bold ml-auto">{recordItems.length} 名選手參賽</span>
                    </div>
                )}
              </div>
            </div>
          );
        }) : (
            <div className="flex flex-col items-center justify-center h-64 opacity-50">
                <Trophy size={32} className="text-zinc-600 mb-3" />
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">暫無賽事資料</p>
            </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-sm rounded-[32px] p-0 shadow-2xl relative bg-[#0a0508] border-white/20 animate-slide-up flex flex-col max-h-[95vh]">
            <div className="p-6 pb-2">
                <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">{isEditMode ? '管理賽事' : '賽場登錄'}</h3>
                    <p className="text-[9px] text-sunset-rose font-black uppercase tracking-[0.3em] mt-0.5">Race Deployment</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full text-zinc-400 active:scale-95"><X size={20} /></button>
                </div>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6 space-y-6">
              {/* MOVED: Participant Management to Top */}
              <div className="pb-4 border-b border-white/10 mb-4">
                  <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2"><Users size={14} className="text-sunset-gold"/> 參賽選手管理</h4>
                      <button type="button" onClick={() => setShowParticipantSelect(true)} className="text-[10px] font-black bg-white/10 text-white px-2 py-1 rounded-lg active:scale-95 hover:bg-white/20 transition-all flex items-center gap-1"><Plus size={10} /> 新增選手</button>
                  </div>
                  <div className="space-y-2">
                      {participantRows.filter(row => !row.isDeleted).map((row, idx) => {
                          const person = people.find(p => String(p.id) === String(row.people_id));
                          const isRetired = person?.is_hidden;
                          const selectedIds = participantRows.filter(r => !r.isDeleted && r.key !== row.key).map(r => String(r.people_id));
                          const dropdownOptions = people.filter(p => !selectedIds.includes(String(p.id)));
                          if(person && !dropdownOptions.find(p => String(p.id) === String(person.id))) {
                              dropdownOptions.unshift(person);
                          }
                          dropdownOptions.sort((a,b) => a.name.localeCompare(b.name));

                          return (
                          <div key={row.key} className="flex items-center gap-2 bg-zinc-900/50 p-2 rounded-xl border border-white/5 animate-fade-in">
                              <div className="relative flex-1">
                                  <select value={row.people_id} onChange={(e) => handleRowChange(row.key, 'people_id', e.target.value)} className="w-full appearance-none bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-white text-xs outline-none">
                                      {dropdownOptions.map(p => (<option key={p.id} value={p.id}>{p.name} {p.is_hidden ? '(退役)' : ''}</option>))}
                                  </select>
                              </div>
                              {isRetired && <div className="text-[9px] text-zinc-500 bg-zinc-800 px-1 rounded border border-zinc-700">退</div>}
                              <input type="text" placeholder="名次" value={row.value} onChange={(e) => handleRowChange(row.key, 'value', e.target.value)} className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-white text-xs text-center outline-none focus:border-sunset-gold/50" />
                              <button type="button" onClick={() => handleRemoveRow(row.key)} className="w-8 h-8 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-lg active:scale-95"><Trash2 size={14} /></button>
                          </div>
                        );
                      })}
                      {participantRows.filter(row => !row.isDeleted).length === 0 && (
                          <div className="text-center py-4 text-zinc-600 text-[10px] border border-dashed border-zinc-800 rounded-xl">尚無參賽選手，請點擊上方按鈕新增</div>
                      )}
                  </div>
              </div>

              <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">日期</label>
                    <input type="date" required value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white font-mono outline-none shadow-inner" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">比賽名稱</label>
                    <input type="text" required placeholder="例如：全國滑步車邀請賽" value={eventForm.name} onChange={e => setEventForm({...eventForm, name: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none shadow-inner" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">賽事系列</label>
                    <div className="relative">
                        <select value={eventForm.race_id} onChange={e => setEventForm({...eventForm, race_id: e.target.value})} className="w-full appearance-none bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none shadow-inner text-sm">
                        {raceGroups.map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1"><MapPin size={12}/> 比賽地址</label>
                    <input type="text" placeholder="輸入地址或 Google Maps 連結..." value={eventForm.address} onChange={e => setEventForm({...eventForm, address: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none shadow-inner" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1"><Camera size={12}/> 設定賽事照片</label>
                    <div className="flex gap-2">
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect}/>
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full px-3 py-3 bg-zinc-800 rounded-xl text-white active:scale-95 border border-white/5 flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all shadow-lg text-xs font-bold">
                            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                            {isUploading ? '上傳壓縮中...' : '上傳照片'}
                        </button>
                    </div>
                  </div>
                  {eventForm.url && (
                    <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10 shadow-lg relative">
                    <div className="flex justify-between items-center text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                        <span className="flex items-center gap-1"><Maximize size={10}/> 縮放與位置調整</span>
                        <button type="button" onClick={() => setIsCropperLocked(!isCropperLocked)} className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${isCropperLocked ? 'border-zinc-700 bg-zinc-800 text-zinc-400' : 'border-rose-500/50 bg-rose-500/10 text-rose-500'}`}>{isCropperLocked ? <Lock size={10} /> : <Unlock size={10} />}{isCropperLocked ? '鎖定' : '編輯中'}</button>
                    </div>
                    <div ref={cropperRef} className="relative h-32 rounded-xl overflow-hidden bg-black border border-white/10 shadow-inner group touch-none" style={{ touchAction: 'none' }} onMouseDown={handleDragStart} onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd} onTouchStart={handleDragStart} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}>
                        <img src={eventForm.url} className={`w-full h-full object-contain pointer-events-none select-none ${isCropperLocked ? 'opacity-80' : ''}`} style={{ transform: `translate(${(posX - 50) * 1.5}%, ${(posY - 50) * 1.5}%) scale(${zoomScale})` }} />
                        {isCropperLocked && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Lock size={24} className="text-white/20" /></div>}
                    </div>
                    <div className={`px-1 transition-opacity ${isCropperLocked ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <input type="range" min="1" max="5" step="0.01" value={zoomScale} onChange={e => setZoomScale(parseFloat(e.target.value))} className="w-full accent-sunset-rose h-1.5 bg-zinc-800 rounded-full appearance-none shadow-inner" />
                    </div>
                    </div>
                  )}
              </div>

              <div className="pt-2 space-y-3">
                <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-sunset-rose to-rose-700 text-white font-black text-xs tracking-[0.3em] py-4 rounded-2xl active:scale-95 transition-all shadow-glow-rose">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : '同步變更數據'}
                </button>
                {isEditMode && (
                   <button type="button" onClick={() => setConfirmDeleteEvent({key: `del_${Date.now()}`, name: eventForm.name, records: originalRecords})} disabled={isDeleting} className="w-full bg-rose-500/10 text-rose-500 font-bold text-[10px] tracking-widest py-3 rounded-2xl border border-rose-500/20 flex items-center justify-center gap-2 active:bg-rose-500/20 transition-all">
                    <Trash2 size={14} /> 永久移除整場賽事
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Participant Select Modal */}
      {showParticipantSelect && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/85 backdrop-blur-md animate-fade-in" onClick={() => setShowParticipantSelect(false)}>
           <div className="glass-card w-full max-w-md rounded-t-[32px] p-6 shadow-2xl animate-slide-up bg-[#0f0508] border-white/10 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 shrink-0">
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">選擇選手</h3>
                  <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-0.5">Select Player</p>
                </div>
                <button onClick={() => setShowParticipantSelect(false)} className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-zinc-500"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
                  <div className="grid grid-cols-1 gap-2">
                      {people
                        .filter(p => !participantRows.some(row => !row.isDeleted && String(row.people_id) === String(p.id)))
                        .sort((a,b) => a.name.localeCompare(b.name))
                        .map(p => (
                          <button key={p.id} onClick={() => handleAddParticipant(p.id)} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-left">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-zinc-800 text-xs font-black ${p.is_hidden ? 'text-zinc-600' : 'text-zinc-300'}`}>{p.name.charAt(0)}</div>
                              <span className={`text-sm font-bold ${p.is_hidden ? 'text-zinc-500 line-through' : 'text-white'}`}>{p.name}</span>
                              {p.is_hidden && <span className="ml-auto text-[9px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">退役</span>}
                          </button>
                      ))}
                  </div>
              </div>
           </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {confirmDeleteEvent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-xs rounded-3xl p-6 shadow-2xl border-rose-500/30 text-center animate-scale-in">
            <h3 className="text-lg font-black text-white mb-2">移除此場賽事？</h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">這將同時刪除所有參賽選手的紀錄（共 {confirmDeleteEvent.records.length} 筆）。</p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button onClick={() => setConfirmDeleteEvent(null)} className="py-3 bg-zinc-900 text-zinc-400 font-bold text-xs rounded-xl active:bg-zinc-800 transition-colors border border-white/5">取消</button>
              <button onClick={handleDeleteEvent} disabled={isDeleting} className="py-3 bg-rose-600 text-white font-bold text-xs rounded-xl active:scale-95 transition-all shadow-glow-rose">{isDeleting ? '正在移除...' : '確定刪除'}</button>
            </div>
          </div>
        </div>
      )}

      {showPreviewConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-xs rounded-3xl p-6 shadow-2xl border-white/10 text-center animate-scale-in">
            <div className="w-12 h-12 bg-sunset-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
               <AlertTriangle size={24} className="text-sunset-gold" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">建立預告賽事？</h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">您尚未新增任何參賽選手。<br/>系統將自動建立一筆隱藏的佔位紀錄 (PREVIEW) 以確保賽事能顯示於列表中。</p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button onClick={() => setShowPreviewConfirm(false)} className="py-3 bg-zinc-900 text-zinc-400 font-bold text-xs rounded-xl active:bg-zinc-800 transition-colors border border-white/5">取消</button>
              <button onClick={() => executeSave([])} disabled={isSubmitting} className="py-3 bg-gradient-to-r from-sunset-gold to-orange-500 text-black font-black text-xs rounded-xl active:scale-95 transition-all shadow-glow-gold">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : '確認建立'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Races;
