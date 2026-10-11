import { pgTable, serial, smallint, boolean, text, date, timestamp, unique, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const weeklySlots = pgTable('weekly_slots', {
  id: serial('id').primaryKey(),
  weekday: smallint('weekday').notNull(),
  minuteOfDay: smallint('minute_of_day').notNull(),
  active: boolean('active').notNull().default(true),
}, (t) => ({
  weekdayMinuteUnique: unique('weekly_slots_weekday_minute_unique').on(t.weekday, t.minuteOfDay),
}));

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  classDate: date('class_date').notNull(),
  minuteOfDay: smallint('minute_of_day').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  status: text('status').notNull().default('confirmed'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  confirmedSlotUnique: uniqueIndex('bookings_date_slot_confirmed_idx')
    .on(t.classDate, t.minuteOfDay)
    .where(sql`${t.status} = 'confirmed'`),
}));
