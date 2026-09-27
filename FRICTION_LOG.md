# Developer Friction Log: Homepilot
**Target Specification:** MCP Streamable HTTP (2025-11-25) & Alexa+ OAuth 2.1

## 1. Streamable HTTP Chunk Termination
**Issue:** When handling large tool outputs (e.g., retrieving a massive schedule payload from `calendar_get_schedule`), the Node.js Fastify response occasionally truncated the final chunk before the `X-MCP-Spec-Version` header validation completed on the simulator side.
**Workaround:** Implemented manual chunk flushing in the `@homepilot/mcp-streamable-http` package rather than relying on Fastify's default `reply.send()` serialization.
**Recommendation:** The Alexa+ documentation should explicitly specify the expected `Transfer-Encoding: chunked` trailer headers required to signal an EOF cleanly in the 2025-11-25 spec.

## 2. Bedrock ConverseCommand Tooling Limits
**Issue:** When combining all 12 MCP tools into the `toolConfig.tools` array for the `anthropic.claude-3-5-sonnet-20241022-v2:0` model, we hit an edge case where nested JSON schemas (specifically within `shopping_add_items`) caused a validation rejection from the AWS Bedrock endpoint.
**Workaround:** Flattened the array structure in the Zod schema mapping to simplify the JSON draft passed to Bedrock.

## 3. Simulator Introspection Caching
**Issue:** During Day 21 testing, updating the `alexa-addon-manifest.json` did not immediately reflect in the Alexa+ developer console. The introspection endpoint appeared to cache the MCP tools for up to 15 minutes.
**Workaround:** Appended a query parameter cache-buster to the `endpoint.uri` during active development.
