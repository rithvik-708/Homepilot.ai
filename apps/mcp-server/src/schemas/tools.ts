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
  },
  {
    name: 'mcp_tool_create',
    description: 'Synthesize and register a dynamic tool into the MCP server with automated security checks',
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Unique name of the new tool (e.g. custom_smart_plug)" },
        description: { type: "string", description: "Clear description of the tool capability" },
        inputSchema: { type: "object", description: "JSON schema Draft-07 describing accepted arguments" },
        runtime: { type: "string", enum: ["declarative_http", "isolated_vm"], description: "Execution runtime" },
        codeDefinition: { type: "object", description: "HTTP template or isolated JS script definition" },
        allowedDomains: { type: "array", items: { type: "string" }, description: "Whitelisted egress domain names" }
      },
      required: ["name", "description", "inputSchema", "runtime", "codeDefinition", "allowedDomains"]
    }
  },
  {
    name: 'mcp_tool_test',
    description: 'Dry-run and verify a tool candidate in an isolated sandbox before registration',
    inputSchema: {
      type: "object",
      properties: {
        runtime: { type: "string", enum: ["declarative_http", "isolated_vm"] },
        codeDefinition: { type: "object", description: "HTTP template or isolated JS script definition" },
        testInput: { type: "object", description: "Sample input arguments for dry-run" },
        allowedDomains: { type: "array", items: { type: "string" }, description: "Whitelisted egress domain names" }
      },
      required: ["runtime", "codeDefinition", "testInput", "allowedDomains"]
    }
  },
  {
    name: 'mcp_tool_delete',
    description: 'Deprecate or unregister a dynamic tool from the active registry',
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the dynamic tool to delete" }
      },
      required: ["name"]
    }
  }
];

