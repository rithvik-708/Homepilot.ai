import { z } from 'zod';

export const MCP_TOOLS = [
  {
    name: 'calendar_get_schedule',
    description: 'Get user calendar schedule',
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" }
      },
      required: ["date"]
    }
  },
  {
    name: 'calendar_create_event',
    description: 'Create a new calendar event',
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        startTime: { type: "string" },
        endTime: { type: "string" }
      },
      required: ["title", "startTime", "endTime"]
    }
  },
  {
    name: 'home_set_environment',
    description: 'Set home environment (temperature, lights)',
    inputSchema: {
      type: "object",
      properties: {
        zoneId: { type: "string" },
        temperature: { type: "number" },
        lightsOn: { type: "boolean" }
      },
      required: ["zoneId"]
    }
  },
  {
    name: 'home_get_state',
    description: 'Get home state',
    inputSchema: {
      type: "object",
      properties: {
        zoneId: { type: "string" }
      },
      required: ["zoneId"]
    }
  },
  {
    name: 'media_launch_playback',
    description: 'Launch media playback',
    inputSchema: {
      type: "object",
      properties: {
        mediaId: { type: "string" },
        zoneId: { type: "string" }
      },
      required: ["mediaId", "zoneId"]
    }
  },
  {
    name: 'media_pause_playback',
    description: 'Pause media playback',
    inputSchema: {
      type: "object",
      properties: {
        zoneId: { type: "string" }
      },
      required: ["zoneId"]
    }
  },
  {
    name: 'shopping_add_item',
    description: 'Add item to shopping list',
    inputSchema: {
      type: "object",
      properties: {
        itemName: { type: "string" },
        quantity: { type: "number" }
      },
      required: ["itemName", "quantity"]
    }
  },
  {
    name: 'shopping_get_list',
    description: 'Get shopping list',
    inputSchema: {
      type: "object",
      properties: {
        pendingOnly: { type: "boolean" }
      },
      required: []
    }
  },
  {
    name: 'device_get_info',
    description: 'Get device information',
    inputSchema: {
      type: "object",
      properties: {
        deviceId: { type: "string" }
      },
      required: ["deviceId"]
    }
  },
  {
    name: 'device_reboot',
    description: 'Reboot a device',
    inputSchema: {
      type: "object",
      properties: {
        deviceId: { type: "string" }
      },
      required: ["deviceId"]
    }
  },
  {
    name: 'user_get_preferences',
    description: 'Get user preferences',
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string" }
      },
      required: ["userId"]
    }
  },
  {
    name: 'user_update_preferences',
    description: 'Update user preferences',
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string" },
        preferences: { type: "object", additionalProperties: true }
      },
      required: ["userId", "preferences"]
    }
  }
];
