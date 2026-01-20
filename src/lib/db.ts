import Dexie, { type EntityTable } from 'dexie';
import type { Plan } from '@/types/domain';

const db = new Dexie('yafa-db') as Dexie & {
  plans: EntityTable<Plan, 'id'>;
};

// Schema declaration
db.version(1).stores({
  plans: 'id, name, createdAt' // Primary key and indexed props
});

export { db };
