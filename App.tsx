
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Races from './pages/Races';
import Training from './pages/Training';
import Settings from './pages/Settings';
import Personal from './pages/Personal';
import { api } from './services/api';
import { DataRecord, LookupItem, TeamInfo } from './types';

const DEFAULT_NAME = '睿睿';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [data, setData] = useState<DataRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasInitialized = useRef(false);
  
  const [trainingTypes, setTrainingTypes] = useState<LookupItem[]>([]);
  const [raceGroups, setRaceGroups] = useState<LookupItem[]>([]);
  const [people, setPeople] = useState<LookupItem[]>([]);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  
  const [defaultTrainingType, setDefaultTrainingType] = useState<string>('');
  
  // Requirement 4-2: Force empty selection on init.
  // We do NOT read from localStorage to ensure the user must select a person every time the app reloads.
  const [selectedPersonId, setSelectedPersonId] = useState<string | number>('');

  // Requirement 4-1: Default pinned list to empty array.
  // We do NOT read from localStorage for the pinned list to ensure it starts clean.
  const [pinnedPeopleIds, setPinnedPeopleIds] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    if (!hasInitialized.current) setIsLoading(true);
    
    const { records, trainingTypes: tTypes, races: rGroups, people: pList, teamInfo: tInfo } = await api.fetchAppData();
    
    setData(records);
    setTrainingTypes(tTypes);
    setRaceGroups(rGroups);
    setPeople(pList);
    setTeamInfo(tInfo);
    
    // Explicitly do NOT auto-select a person or populate pinned list here.

    const serverDefault = tTypes.find(t => t.is_default)?.name;
    if (serverDefault) {
      setDefaultTrainingType(serverDefault);
    } else if (tTypes.length > 0) {
      const savedDefault = localStorage.getItem('louie_default_type');
      if (savedDefault && tTypes.some(t => t.name === savedDefault)) {
        setDefaultTrainingType(savedDefault);
      } else {
        setDefaultTrainingType(tTypes[0].name);
      }
    }

    hasInitialized.current = true;
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!hasInitialized.current || currentPage === 'dashboard' || currentPage === 'races' || currentPage === 'personal') {
      fetchData();
    }
  }, [currentPage, fetchData]);

  const handleUpdateActivePerson = (id: string | number) => {
    setSelectedPersonId(id);
  };

  const handleTogglePinnedPerson = (id: string) => {
    setPinnedPeopleIds(prev => {
      const next = prev.includes(id) 
        ? prev.filter(pId => pId !== id) 
        : [...prev, id];
      // Do not save to localStorage to ensure reset on reload
      return next;
    });
  };

  const handleNavigateToPerson = (personName: string) => {
    const person = people.find(p => p.name === personName);
    if (person) {
        handleUpdateActivePerson(person.id);
        setCurrentPage('personal');
    }
  };

  const activePeople = useMemo(() => people.filter(p => !p.is_hidden), [people]);
  const activeData = useMemo(() => {
    const hiddenIds = people.filter(p => p.is_hidden).map(p => String(p.id));
    return data.filter(d => !hiddenIds.includes(String(d.people_id)));
  }, [data, people]);

  const activePersonName = activePeople.find(p => String(p.id) === String(selectedPersonId))?.name || DEFAULT_NAME;

  const renderPage = () => {
    if (isLoading && !hasInitialized.current) {
       return (
        <div className="h-full flex flex-col items-center justify-center space-y-6 bg-[#0a0508]">
          <div className="relative w-24 h-24">
             <div className="absolute inset-0 bg-rose-600/20 blur-xl rounded-full animate-pulse"></div>
            <div className="relative z-10 w-full h-full border-4 border-white/5 rounded-full"></div>
            <div className="absolute inset-0 z-10 border-4 border-rose-500 rounded-full border-t-transparent animate-spin"></div>
            <div className="absolute inset-0 z-10 flex items-center justify-center">
               <span className="text-sm font-black text-rose-500 tracking-tighter animate-pulse">L.R</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
             <div className="text-sm font-black italic tracking-[0.25em] text-white uppercase mb-2 drop-shadow-lg">LOUIE RUNBIKE</div>
             <div className="text-[9px] text-zinc-500 font-mono tracking-widest border border-white/5 px-2 py-1 rounded-md bg-white/5">Loading Data...</div>
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard 
            data={activeData} 
            refreshData={fetchData}
            onNavigateToRaces={() => setCurrentPage('races')} 
            onNavigateToPerson={handleNavigateToPerson}
            defaultTrainingType={defaultTrainingType}
            people={people} 
          />
        );
      case 'personal':
        return (
          <Personal 
            data={activeData}
            people={people} 
            trainingTypes={trainingTypes}
            raceGroups={raceGroups}
            refreshData={fetchData}
            activePersonId={selectedPersonId}
            onSelectPerson={handleUpdateActivePerson}
          />
        );
      case 'races':
        return (
          <Races 
            data={data} 
            people={people} 
            refreshData={fetchData} 
            raceGroups={raceGroups} 
          />
        );
      case 'training':
        return (
          <Training 
            trainingTypes={trainingTypes} 
            defaultType={defaultTrainingType}
            refreshData={fetchData} 
            data={activeData}
            people={activePeople}
            activePersonId={selectedPersonId}
            onSelectPerson={handleUpdateActivePerson}
            pinnedPeopleIds={pinnedPeopleIds}
            onTogglePinned={handleTogglePinnedPerson}
          />
        );
      case 'settings':
        return (
          <Settings 
            data={data}
            trainingTypes={trainingTypes} 
            raceGroups={raceGroups}
            defaultType={defaultTrainingType}
            personName={activePersonName}
            people={people} 
            refreshData={fetchData}
            onUpdateDefault={(val) => {
              setDefaultTrainingType(val);
              localStorage.setItem('louie_default_type', val);
            }}
            onUpdateName={() => {}} 
          />
        );
      default:
        return <Dashboard data={activeData} people={people} refreshData={fetchData} onNavigateToRaces={() => setCurrentPage('races')} defaultTrainingType={defaultTrainingType} onNavigateToPerson={handleNavigateToPerson} />;
    }
  };

  return (
    <Layout 
      currentPage={currentPage} 
      onNavigate={setCurrentPage}
      title={teamInfo?.team_name}
      subtitle={teamInfo?.team_en_name}
    >
      {renderPage()}
    </Layout>
  );
};

export default App;
