import { pgTable, uuid, text, timestamp, varchar, jsonb, boolean, numeric, integer, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  fullName: text('full_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  prefKey: varchar('pref_key', { length: 64 }).notNull(),
  prefValue: jsonb('pref_value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const devices = pgTable('devices', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: text('name').notNull(),
  zone: varchar('zone', { length: 32 }).notNull(),
  deviceType: varchar('device_type', { length: 32 }).notNull(),
  state: jsonb('state').notNull().default(sql`'{}'::jsonb`),
  isOnline: boolean('is_online').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  zoneIdx: index('idx_devices_zone').on(table.zone),
}));

export const calendarEvents = pgTable('calendar_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  category: varchar('category', { length: 32 }).notNull().default('routine'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  timeRangeIdx: index('idx_calendar_user_range').on(table.userId, table.startTime, table.endTime),
}));

export const shoppingItems = pgTable('shopping_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemName: text('item_name').notNull(),
  quantity: numeric('quantity', { precision: 6, scale: 2 }).notNull().default('1.0'),
  unit: varchar('unit', { length: 16 }).notNull().default('units'),
  estimatedPrice: numeric('estimated_price', { precision: 8, scale: 2 }).default('0.00'),
  isPurchased: boolean('is_purchased').notNull().default(false),
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pendingIdx: index('idx_shopping_pending').on(table.userId, table.isPurchased),
}));

export const mediaCatalog = pgTable('media_catalog', {
  id: varchar('id', { length: 64 }).primaryKey(),
  title: text('title').notNull(),
  genre: varchar('genre', { length: 32 }).notNull(),
  runtimeMinutes: integer('runtime_minutes').notNull(),
  rating: numeric('rating', { precision: 3, scale: 1 }).notNull(),
  rentalPrice: numeric('rental_price', { precision: 6, scale: 2 }).notNull().default('0.00'),
  coverImageUrl: text('cover_image_url').notNull(),
});
