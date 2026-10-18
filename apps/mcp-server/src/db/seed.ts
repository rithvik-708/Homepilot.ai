import { db } from './index.js';
import { users, userPreferences } from './schema.js';
import { eq } from 'drizzle-orm';

export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function ensureDefaultUserExists(): Promise<string> {
  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.id, DEFAULT_USER_ID))
      .limit(1);

    if (existing.length === 0) {
      await db
        .insert(users)
        .values({
          id: DEFAULT_USER_ID,
          email: 'rithvik@amazon-homeowner.internal',
          fullName: 'Rithvik (Amazon Homeowner)',
        })
        .onConflictDoNothing();

      // Seed baseline preferences for the homeowner
      await db
        .insert(userPreferences)
        .values([
          {
            userId: DEFAULT_USER_ID,
            prefKey: 'movie_night',
            prefValue: { preferredGenre: 'Sci-Fi', preferredZone: 'living_room', targetTemp: 21 },
          },
          {
            userId: DEFAULT_USER_ID,
            prefKey: 'climate',
            prefValue: { ecoMode: true, preferredTemp: 22 },
          },
        ])
        .onConflictDoNothing();

      console.log(`[DB Seed] Seeded homeowner user ${DEFAULT_USER_ID}`);
    }
    return DEFAULT_USER_ID;
  } catch (error: any) {
    console.warn(`[DB Seed] Warning ensuring default user:`, error.message);
    return DEFAULT_USER_ID;
  }
}
