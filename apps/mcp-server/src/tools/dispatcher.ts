import { z } from 'zod';
import { MCP_TOOLS } from '../schemas/tools.js';

// Global In-Memory State Store for Home and Devices
export interface HomeZoneState {
  zoneId: string;
  temperature: number;
  targetTemperature: number;
  humidity: number;
  lightsOn: boolean;
  lightingMode: string;
  occupancy: boolean;
  devicesOnline: number;
}

export interface PlaybackState {
  activeMediaId: string | null;
  title: string | null;
  status: 'stopped' | 'playing' | 'paused';
  rentalPrice: number;
  currency: string;
  zoneId: string;
}

export class HomeStateManager {
  private static instance: HomeStateManager;

  public zones: Map<string, HomeZoneState> = new Map();
  public playback: Map<string, PlaybackState> = new Map();
  public shoppingList: Array<{ id: string; itemName: string; quantity: number; unit: string; estimatedPrice: number }> = [];
  public userPreferences: Record<string, any> = {
    default_user: {
      preferredTemp: 22,
      lightingMode: 'warm',
      maxRentalBudgetINR: 1500,
    },
    user_alexa_01: {
      preferredMovieTemp: 21,
      lightingMode: 'warm_movie_mode',
      maxRentalBudgetINR: 1500,
    },
  };

  private constructor() {
    this.reset();
  }

  public static getInstance(): HomeStateManager {
    if (!HomeStateManager.instance) {
      HomeStateManager.instance = new HomeStateManager();
    }
    return HomeStateManager.instance;
  }

  public reset() {
    this.zones.clear();
    this.playback.clear();
    this.shoppingList = [
      { id: 'item_1', itemName: 'Popcorn', quantity: 2, unit: 'packets', estimatedPrice: 150 },
      { id: 'item_2', itemName: 'Soda', quantity: 4, unit: 'cans', estimatedPrice: 200 },
    ];

    // Initialize Default Living Room and Bedroom
    this.zones.set('living_room', {
      zoneId: 'living_room',
      temperature: 24,
      targetTemperature: 24,
      humidity: 45,
      lightsOn: false,
      lightingMode: 'daylight',
      occupancy: true,
      devicesOnline: 6,
    });

    this.zones.set('bedroom', {
      zoneId: 'bedroom',
      temperature: 23,
      targetTemperature: 23,
      humidity: 50,
      lightsOn: false,
      lightingMode: 'soft',
      occupancy: false,
      devicesOnline: 4,
    });
  }
}

export const stateManager = HomeStateManager.getInstance();

// Zod Schemas for Tool Argument Validation
export const ToolValidationSchemas: Record<string, z.ZodType<any>> = {
  home_get_state: z.object({
    zoneId: z.string().min(1, 'zoneId is required'),
  }),
  home_set_environment: z.object({
    zoneId: z.string().min(1, 'zoneId is required'),
    temperature: z.number().min(15).max(32).optional(),
    lightsOn: z.boolean().optional(),
    lightingMode: z.string().optional(),
  }),
  media_search_catalog: z.object({
    genre: z.string().optional(),
    maxRentalCost: z.number().positive().optional(),
    query: z.string().optional(),
  }),
  media_launch_playback: z.object({
    mediaId: z.string().min(1, 'mediaId is required'),
    zoneId: z.string().min(1, 'zoneId is required'),
    budget: z.number().optional(),
    maxRentalCost: z.number().optional(),
  }),
  media_pause_playback: z.object({
    zoneId: z.string().min(1, 'zoneId is required'),
  }),
  calendar_get_schedule: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  }),
  calendar_create_event: z.object({
    title: z.string().min(1, 'title is required'),
    startTime: z.string().min(1, 'startTime is required'),
    endTime: z.string().min(1, 'endTime is required'),
  }),
  shopping_add_item: z.object({
    itemName: z.string().min(1, 'itemName is required'),
    quantity: z.number().positive(),
    unit: z.string().optional(),
  }),
  shopping_get_list: z.object({
    pendingOnly: z.boolean().optional(),
  }),
  device_get_info: z.object({
    deviceId: z.string().min(1, 'deviceId is required'),
  }),
  device_reboot: z.object({
    deviceId: z.string().min(1, 'deviceId is required'),
  }),
  user_get_preferences: z.object({
    userId: z.string().min(1, 'userId is required'),
  }),
  user_update_preferences: z.object({
    userId: z.string().min(1, 'userId is required'),
    preferences: z.record(z.string(), z.any()),
  }),
};

// Unified Tool Dispatcher with Validation & State Mutation
export async function executeTool(name: string, input: any): Promise<Record<string, any>> {
  // 1. Schema Validation
  const schema = ToolValidationSchemas[name];
  if (!schema) {
    throw new Error(`Unknown tool: ${name}`);
  }

  const parseResult = schema.safeParse(input || {});
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Invalid arguments for tool ${name}: ${errorDetails}`);
  }

  const validArgs = parseResult.data;

  // 2. Business Logic & Actual State Mutations
  switch (name) {
    case 'home_get_state': {
      let zone = stateManager.zones.get(validArgs.zoneId);
      if (!zone) {
        // Initialize dynamic zone
        zone = {
          zoneId: validArgs.zoneId,
          temperature: 24,
          targetTemperature: 24,
          humidity: 45,
          lightsOn: false,
          lightingMode: 'daylight',
          occupancy: true,
          devicesOnline: 3,
        };
        stateManager.zones.set(validArgs.zoneId, zone);
      }
      return {
        zoneId: zone.zoneId,
        temperature: zone.temperature,
        targetTemperature: zone.targetTemperature,
        humidity: zone.humidity,
        lights: zone.lightsOn ? 'on' : 'off',
        lightingMode: zone.lightingMode,
        occupancy: zone.occupancy,
        devicesOnline: zone.devicesOnline,
      };
    }

    case 'home_set_environment': {
      let zone = stateManager.zones.get(validArgs.zoneId);
      if (!zone) {
        zone = {
          zoneId: validArgs.zoneId,
          temperature: 24,
          targetTemperature: 24,
          humidity: 45,
          lightsOn: false,
          lightingMode: 'daylight',
          occupancy: true,
          devicesOnline: 5,
        };
        stateManager.zones.set(validArgs.zoneId, zone);
      }

      // Perform actual state mutations
      if (validArgs.temperature !== undefined) {
        zone.targetTemperature = validArgs.temperature;
        zone.temperature = validArgs.temperature; // Simulated AC convergence
      }
      if (validArgs.lightsOn !== undefined) {
        zone.lightsOn = validArgs.lightsOn;
      }
      if (validArgs.lightingMode) {
        zone.lightingMode = validArgs.lightingMode;
      } else if (zone.lightsOn) {
        zone.lightingMode = 'warm_ambient';
      }

      return {
        status: 'applied',
        zone: zone.zoneId,
        temperature: zone.temperature,
        targetTemperature: zone.targetTemperature,
        lights: zone.lightsOn ? 'on' : 'off',
        lightingMode: zone.lightingMode,
      };
    }

    case 'media_search_catalog': {
      const budget = validArgs.maxRentalCost ?? 1500;
      if (budget < 100) {
        return {
          results: [],
          count: 0,
          message: `No movies found under rental budget ₹${budget}. Minimum movie rental is ₹150.`,
        };
      }

      const availableMovies = [
        { id: 'movie_interstellar_4k', title: 'Interstellar', genre: 'Sci-Fi', price: 499, rating: 8.7 },
        { id: 'movie_oppenheimer_4k', title: 'Oppenheimer', genre: 'Drama', price: 699, rating: 8.9 },
        { id: 'movie_dune_part_two', title: 'Dune: Part Two', genre: 'Sci-Fi', price: 599, rating: 8.6 },
      ].filter((m) => m.price <= budget);

      return {
        results: availableMovies,
        count: availableMovies.length,
        budgetLimit: budget,
      };
    }

    case 'media_launch_playback': {
      const budgetLimit = 1500;
      const requestedBudget = validArgs.budget ?? validArgs.maxRentalCost ?? 499;

      if (requestedBudget > budgetLimit) {
        return {
          error: `Requested budget ₹${requestedBudget} exceeds maximum permissible budget of ₹${budgetLimit}.`,
          status: 'budget_exceeded',
        };
      }

      const playbackState: PlaybackState = {
        activeMediaId: validArgs.mediaId,
        title: validArgs.mediaId.includes('interstellar') ? 'Interstellar' : validArgs.mediaId,
        status: 'playing',
        rentalPrice: 499,
        currency: 'INR',
        zoneId: validArgs.zoneId,
      };
      stateManager.playback.set(validArgs.zoneId, playbackState);

      return {
        contentId: playbackState.activeMediaId,
        title: playbackState.title,
        status: playbackState.status,
        rentalPrice: playbackState.rentalPrice,
        currency: playbackState.currency,
        zoneId: playbackState.zoneId,
      };
    }

    case 'media_pause_playback': {
      const playback = stateManager.playback.get(validArgs.zoneId);
      if (playback) {
        playback.status = 'paused';
      }
      return {
        status: 'paused',
        zoneId: validArgs.zoneId,
      };
    }

    case 'calendar_get_schedule': {
      return {
        date: validArgs.date,
        events: [
          {
            id: 'evt_guest_01',
            title: 'Guest Arrival (Parents)',
            startTime: `${validArgs.date}T11:00:00+05:30`,
            endTime: `${validArgs.date}T15:00:00+05:30`,
            category: 'social',
          },
        ],
      };
    }

    case 'calendar_create_event': {
      return {
        status: 'created',
        eventId: `evt_${Date.now()}`,
        title: validArgs.title,
        startTime: validArgs.startTime,
        endTime: validArgs.endTime,
      };
    }

    case 'shopping_add_item': {
      const newItem = {
        id: `item_${Date.now()}`,
        itemName: validArgs.itemName,
        quantity: validArgs.quantity,
        unit: validArgs.unit || 'units',
        estimatedPrice: 100 * validArgs.quantity,
      };
      stateManager.shoppingList.push(newItem);
      return {
        status: 'added',
        item: newItem,
      };
    }

    case 'shopping_get_list': {
      return {
        items: stateManager.shoppingList,
        totalItems: stateManager.shoppingList.length,
      };
    }

    case 'device_get_info': {
      return {
        deviceId: validArgs.deviceId,
        name: validArgs.deviceId.includes('ac') ? 'Air Conditioner' : 'Living Room Controller',
        status: 'online',
        firmwareVersion: 'v2.4.1',
        health: 'good',
      };
    }

    case 'device_reboot': {
      return {
        deviceId: validArgs.deviceId,
        status: 'rebooting',
        estimatedUptimeSeconds: 15,
      };
    }

    case 'user_get_preferences': {
      const prefs = stateManager.userPreferences[validArgs.userId] || stateManager.userPreferences['default_user'];
      return {
        userId: validArgs.userId,
        preferences: prefs,
      };
    }

    case 'user_update_preferences': {
      stateManager.userPreferences[validArgs.userId] = {
        ...(stateManager.userPreferences[validArgs.userId] || {}),
        ...validArgs.preferences,
      };
      return {
        status: 'updated',
        userId: validArgs.userId,
        preferences: stateManager.userPreferences[validArgs.userId],
      };
    }

    default:
      throw new Error(`Tool implementation missing for ${name}`);
  }
}
