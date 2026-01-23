
import { DataRecord, LookupItem, TeamInfo } from '../types';

const WORKER_URL = 'https://runbike.vic070680.workers.dev/api';
const OTP_STORAGE_KEY = 'louie_guest_otp';
const TEAM_ID = '1'; // Default Team ID for this App Instance

const safeFetchJson = async (url: string, options?: RequestInit) => {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    if (!res.ok) {
      console.warn(`API Error ${res.status}: ${text}`);
      return null;
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/^[^{[]*([{[].*[}\]])/s);
      if (jsonMatch) return JSON.parse(jsonMatch[1]);
      return null;
    }
  } catch (error) {
    console.error(`Fetch Error for ${url}:`, error);
    return null;
  }
};

export const api = {
  // 驗證管理員密碼並生成新 OTP
  authenticate: async (password: string): Promise<{success: boolean, otp?: string}> => {
    try {
      const formData = new FormData();
      formData.append('admin_password', password);
      
      const res = await fetch(`${WORKER_URL}/auth/generate-otp`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success === true) {
          return { success: true, otp: data.otp };
        }
      }
      return { success: false };
    } catch (e) {
      console.error('Auth failed', e);
      return { success: false };
    }
  },

  // 驗證現有的 OTP
  verifyOtp: async (otp: string): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('otp', otp);
      
      const res = await fetch(`${WORKER_URL}/auth/verify-otp`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
          const data = await res.json();
          return data.success === true;
      }
      return false;
    } catch (e) {
      console.error('OTP Verification failed', e);
      return false;
    }
  },

  // 隊員個人登入驗證
  loginPerson: async (id: string | number, password: string): Promise<boolean> => {
    try {
        const loginUrl = WORKER_URL.replace('/api', '') + '/login';
        
        const res = await fetch(loginUrl, {
            method: 'POST',
            body: JSON.stringify({
                team_id: TEAM_ID,
                id: String(id),
                password: password
            }),
            headers: { 
                'Content-Type': 'application/json'
            }
        });
        
        if (res.ok) {
            const data = await res.json();
            return data.success === true;
        }
        return false;
    } catch (e) {
        console.error('Login failed', e);
        return false;
    }
  },

  getOtp: () => localStorage.getItem(OTP_STORAGE_KEY) || '',
  
  setOtp: (otp: string) => localStorage.setItem(OTP_STORAGE_KEY, otp),

  fetchAppData: async () => {
    const [trainRecs, raceEvents, raceRecords, trainTypes, races, people, teamInfoRes] = await Promise.all([
      safeFetchJson(`${WORKER_URL}/training-records?team_id=${TEAM_ID}`),
      safeFetchJson(`${WORKER_URL}/race-events?team_id=${TEAM_ID}`),  
      safeFetchJson(`${WORKER_URL}/race-records?team_id=${TEAM_ID}`), 
      safeFetchJson(`${WORKER_URL}/training-types`),
      safeFetchJson(`${WORKER_URL}/race-series`),
      safeFetchJson(`${WORKER_URL}/people?team_id=${TEAM_ID}`),
      safeFetchJson(`${WORKER_URL}/team-info?team_id=${TEAM_ID}`)
    ]);

    const formattedTraining = (trainRecs || []).map((r: any) => ({
      id: r.id,
      date: r.date,
      item: 'training',
      name: r.type_name,
      training_type_id: r.training_type_id,
      person_name: r.name,
      people_id: r.people_id,
      value: String(r.score),
      address: '',
      race_group: '',
      note: '訓練紀錄',
      url: '',
      create_at: r.date
    }));

    const formattedRaces: DataRecord[] = [];
    const eventHasRecordsMap = new Set<string>(); 

    if (raceRecords && Array.isArray(raceRecords)) {
        raceRecords.forEach((r: any) => {
            eventHasRecordsMap.add(String(r.event_id));
            formattedRaces.push({
                id: r.id,
                date: r.date,
                item: 'race',
                name: r.race_name,
                series_id: r.series_id, 
                event_id: r.event_id,
                race_id: r.series_id, 
                person_name: r.person_name,
                people_id: r.people_id,
                value: r.score || r.rank_text || '',
                address: r.location,
                race_group: r.series_name,
                note: r.note || '',
                url: r.display_url || '',
                create_at: r.date
            });
        });
    }

    if (raceEvents && Array.isArray(raceEvents)) {
        raceEvents.forEach((e: any) => {
            if (!eventHasRecordsMap.has(String(e.id))) {
                formattedRaces.push({
                    id: `preview_${e.id}`, 
                    event_id: e.id,
                    date: e.date,
                    item: 'race',
                    name: e.name,
                    race_id: e.series_id, 
                    series_id: e.series_id,
                    race_group: e.series_name,
                    address: e.location,
                    url: e.public_url,
                    value: 'PREVIEW', 
                    person_name: '預告',
                    people_id: '',
                    note: '尚無參賽選手',
                    create_at: e.date
                });
            }
        });
    }

    let teamInfo: TeamInfo | null = null;
    if (teamInfoRes && Array.isArray(teamInfoRes) && teamInfoRes.length > 0) {
        teamInfo = teamInfoRes[0];
    }

    return {
      records: [...formattedTraining, ...formattedRaces],
      trainingTypes: (trainTypes || []).map((t: any) => ({ 
        id: t.id, 
        name: t.type_name,
        is_default: t.is_default === 1
      })),
      races: (races || []).map((r: any) => ({ id: r.id, name: r.series_name })),
      people: (people || []).map((p: any) => ({ 
        id: p.id, 
        name: p.name,
        birthday: p.birthday ? String(p.birthday).replace(/\//g, '-').split('T')[0] : '',
        is_hidden: p.is_retired === 1,
        s_url: p.s_url || '',
        b_url: p.b_url || '',
        myword: p.myword || ''
      })),
      teamInfo
    };
  },

  submitRecord: async (record: Partial<DataRecord>): Promise<boolean> => {
    try {
      const isUpdate = !!record.id && !String(record.id).startsWith('preview_');
      
      const formData = new FormData();
      const peopleId = record.people_id || ''; 
      const otp = localStorage.getItem(OTP_STORAGE_KEY) || '';

      // Base fields
      formData.append('team_id', TEAM_ID);
      formData.append('guest_otp', otp);

      let table = '';
      let url = WORKER_URL;

      if (record.item === 'training') {
        table = 'training-records';
        url += `/${table}`;
        formData.append('date', record.date || '');
        formData.append('people_id', String(peopleId));
        formData.append('training_type_id', String(record.training_type_id));
        formData.append('score', record.value || '0');
      } else {
        // Race Logic
        const isEventUpdate = record.value === 'PREVIEW' || (!peopleId && record.item === 'race');

        if (isEventUpdate) {
            table = 'race-events';
            url += `/${table}`;
            formData.append('series_id', String(record.race_id)); 
            formData.append('date', record.date || '');
            formData.append('name', record.name || ''); 
            formData.append('location', record.address || '');
            formData.append('public_url', record.url || '');
        } 
        else {
            table = 'race-records';
            url += `/${table}`;
            
            formData.append('people_id', String(peopleId));
            formData.append('score', record.value || '');
            formData.append('rank_text', record.value || ''); 
            formData.append('note', record.note || '');
            formData.append('personal_url', record.url || '');
            
            formData.append('race_name', record.name || ''); 
            formData.append('date', record.date || '');
            formData.append('series_id', String(record.race_id));
            formData.append('location', record.address || '');

            if (record.event_id) {
                formData.append('event_id', String(record.event_id));
            }
        }
      }

      // Important: Use POST for everything, and spoof method for updates
      let method = 'POST';
      if (isUpdate) {
        url += `/${record.id}`;
        // Add _method field to trick the backend/router into treating this POST as a PUT
        formData.append('_method', 'PUT');
      }

      const response = await fetch(url, {
        method: method,
        body: formData,
      });

      return response.ok;
    } catch (error) {
      console.error('Submit failed:', error);
      return false;
    }
  },

  deleteRecord: async (id: number | string, item: 'training' | 'race'): Promise<boolean> => {
    try {
      const otp = localStorage.getItem(OTP_STORAGE_KEY) || '';
      const formData = new FormData();
      
      // Use FormData for auth in POST requests
      formData.append('team_id', TEAM_ID);
      formData.append('guest_otp', otp);
      // Spoof DELETE method
      formData.append('_method', 'DELETE');

      if (String(id).startsWith('preview_')) {
          const realId = String(id).replace('preview_', '');
          const response = await fetch(`${WORKER_URL}/race-events/${realId}`, { 
            method: 'POST', // Force POST
            body: formData
          });
          return response.ok;
      }

      const table = item === 'training' ? 'training-records' : 'race-records';
      const response = await fetch(`${WORKER_URL}/${table}/${id}`, {
        method: 'POST', // Force POST
        body: formData
      });

      return response.ok;
    } catch (error) {
      console.error('Delete failed:', error);
      return false;
    }
  },

  manageLookup: async (table: 'training-types' | 'races' | 'people', name: string, id?: number | string, isDelete: boolean = false, isDefault: boolean = false, extra?: { birthday?: string, is_hidden?: boolean, s_url?: string, b_url?: string, myword?: string, password?: string }): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('team_id', TEAM_ID);

      let urlEndpoint: string = table;
      if (table === 'races') urlEndpoint = 'race-series';

      let url = `${WORKER_URL}/${urlEndpoint}`;

      let fieldName = 'type_name';
      if (table === 'races') fieldName = 'series_name';
      if (table === 'people') fieldName = 'name';

      // Use POST for everything
      let method = 'POST';

      if (isDelete && id) {
        url += `/${id}`;
        formData.append('_method', 'DELETE');
      } else if (id) {
        url += `/${id}`;
        formData.append('_method', 'PUT');
        
        formData.append(fieldName, name);
        if (table === 'training-types') {
          formData.append('is_default', isDefault ? '1' : '0');
        }
        if (table === 'people' && extra) {
          if (extra.birthday !== undefined) formData.append('birthday', extra.birthday || '');
          if (extra.is_hidden !== undefined) formData.append('is_retired', extra.is_hidden ? '1' : '');
          if (extra.myword !== undefined) formData.append('myword', extra.myword || '');
          if (extra.password !== undefined) formData.append('password', extra.password);
          if (extra.s_url !== undefined) formData.append('s_url', extra.s_url || '');
          if (extra.b_url !== undefined) formData.append('b_url', extra.b_url || '');
        }
      } else {
        // Create (Standard POST)
        formData.append(fieldName, name);
        if (table === 'training-types') {
          formData.append('is_default', isDefault ? '1' : '0');
        }
        if (table === 'people' && extra) {
          if (extra.birthday !== undefined) formData.append('birthday', extra.birthday || '');
          if (extra.is_hidden !== undefined) formData.append('is_retired', extra.is_hidden ? '1' : '');
          if (extra.myword !== undefined) formData.append('myword', extra.myword || '');
          if (extra.password !== undefined) formData.append('password', extra.password);
          if (extra.s_url !== undefined) formData.append('s_url', extra.s_url || '');
          if (extra.b_url !== undefined) formData.append('b_url', extra.b_url || '');
        }
      }

      const response = await fetch(url, {
        method: method,
        body: formData,
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
};
