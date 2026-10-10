import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
export const petSaves = sqliteTable('pet_saves', {
  owner: text('owner').primaryKey(),
  revision: integer('revision').notNull().default(0),
  data: text('data').notNull(),
  updatedAt: text('updated_at').notNull(),
});
export const petArchives = sqliteTable('pet_archives', {
  id: text('id').primaryKey(),
  owner: text('owner').notNull(),
  data: text('data').notNull(),
  createdAt: text('created_at').notNull(),
});
export const petMemories = sqliteTable('pet_memories', {
  owner: text('owner').notNull(),
  petId: text('pet_id').notNull(),
  eventId: text('event_id').notNull(),
  timestamp: text('timestamp').notNull(),
  eventType: text('event_type').notNull(),
  data: text('data').notNull(),
}, (table) => [primaryKey({ columns: [table.owner, table.petId, table.eventId] }),index('memories_owner_pet_time').on(table.owner,table.petId,table.timestamp)]);
