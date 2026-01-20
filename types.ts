
export type ItemType = 'training' | 'race' | 'config';

export interface LookupItem {
  id: number | string;
  name: string;
  is_default?: boolean;
}

export interface DataRecord {
  id?: number | string; 
  date: string; 
  item: ItemType;
  
  // UI Display Fields
  name: string; // Specific Event Name (race_name) or Training Type Name
  person_name: string; 
  value: string; // Score (training) or Rank (race)
  race_group: string; // Series Name (series_name)
  address: string; // Location
  note: string;
  url: string;
  create_at?: string;

  // D1 Relation IDs
  people_id?: number | string;
  training_type_id?: number | string;
  race_id?: number | string;
}

export interface TrainingStat {
  date: string;
  itemName: string;
  avg: number;
  best: number;
  count: number;
  records: { id: string | number; value: number }[];
  stabilityScore: number;
}
