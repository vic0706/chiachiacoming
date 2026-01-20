
import { DataRecord, LookupItem } from '../types';

const WORKER_URL = 'https://runbike.vic070680.workers.dev/api';

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
  fetchAppData: async () => {
    const [trainRecs, raceRecs, trainTypes, races, people] = await Promise.all([
      safeFetchJson(`${WORKER_URL}/training-records`),
      safeFetchJson(`${WORKER_URL}/race-records`),
      safeFetchJson(`${WORKER_URL}/training-types`),
      safeFetchJson(`${WORKER_URL}/races`),
      safeFetchJson(`${WORKER_URL}/people`) // 獲取選手名單 (後端會回傳所有選手，包含 is_retired)
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

    const formattedRaces = (raceRecs || []).map((r: any) => ({
      id: r.id,
      date: r.date,
      item: 'race',
      name: r.race_name,
      race_id: r.race_id,
      person_name: r.name,
      people_id: r.people_id,
      value: r.rank_text,
      address: r.location,
      race_group: r.series_name,
      note: r.note || '',
      url: r.url || '',
      create_at: r.date
    }));

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
        // Ensure strictly YYYY-MM-DD format for date input compatibility
        birthday: p.birthday ? String(p.birthday).replace(/\//g, '-').split('T')[0] : '',
        // 對應後端的 is_retired 欄位：1 代表退役(隱藏)，0 代表現役(顯示)
        is_hidden: p.is_retired === 1,
        s_url: p.s_url || '',
        b_url: p.b_url || ''
      })) 
    };
  },

  submitRecord: async (record: Partial<DataRecord>): Promise<boolean> => {
    try {
      const isUpdate = !!record.id;
      const formData = new FormData();
      const peopleId = record.people_id || 1; 

      let table = '';
      if (record.item === 'training') {
        table = 'training-records';
        formData.append('date', record.date || '');
        formData.append('people_id', String(peopleId));
        formData.append('training_type_id', String(record.training_type_id));
        formData.append('score', record.value || '0');
      } else {
        table = 'race-records';
        formData.append('date', record.date || '');
        formData.append('people_id', String(peopleId));
        formData.append('race_id', String(record.race_id));
        formData.append('race_name', record.name || '');
        formData.append('location', record.address || '');
        formData.append('rank_text', record.value || '');
        formData.append('note', record.note || '');
        formData.append('url', record.url || '');
      }

      let url = `${WORKER_URL}/${table}`;
      if (isUpdate) {
        url += `/${record.id}`;
        formData.append('_method', 'PUT');
      }

      const response = await fetch(url, {
        method: 'POST',
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
      const table = item === 'training' ? 'training-records' : 'race-records';
      const formData = new FormData();
      formData.append('_method', 'DELETE');

      const response = await fetch(`${WORKER_URL}/${table}/${id}`, {
        method: 'POST',
        body: formData,
      });

      return response.ok;
    } catch (error) {
      console.error('Delete failed:', error);
      return false;
    }
  },

  manageLookup: async (table: 'training-types' | 'races' | 'people', name: string, id?: number | string, isDelete: boolean = false, isDefault: boolean = false, extra?: { birthday?: string, is_hidden?: boolean, s_url?: string, b_url?: string }): Promise<boolean> => {
    try {
      const formData = new FormData();
      let url = `${WORKER_URL}/${table}`;

      let fieldName = 'type_name';
      if (table === 'races') fieldName = 'series_name';
      if (table === 'people') fieldName = 'name';

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
          if (extra.is_hidden !== undefined) formData.append('is_retired', extra.is_hidden ? '1' : '0');
          if (extra.s_url !== undefined) formData.append('s_url', extra.s_url || '');
          if (extra.b_url !== undefined) formData.append('b_url', extra.b_url || '');
        }
      } else {
        formData.append(fieldName, name);
        if (table === 'training-types') {
          formData.append('is_default', isDefault ? '1' : '0');
        }
        if (table === 'people' && extra) {
          if (extra.birthday !== undefined) formData.append('birthday', extra.birthday || '');
          // 新增時，若沒特別指定，後端預設 is_retired 為 0
          if (extra.is_hidden !== undefined) formData.append('is_retired', extra.is_hidden ? '1' : '0');
          if (extra.s_url !== undefined) formData.append('s_url', extra.s_url || '');
          if (extra.b_url !== undefined) formData.append('b_url', extra.b_url || '');
        }
      }

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
};
