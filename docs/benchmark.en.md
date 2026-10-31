# Measurements and scope

[中文](benchmark.md) · [Machine-readable data](benchmark.json) · [Project overview](../README.en.md)

Measurement date: 2026-10-31. Model-side token counts and JSON byte sizes are reported separately. Only sanitized numbers and methods are published. The private request, conversations, model configuration, and machine paths are excluded, so the repository alone cannot reproduce the private sample byte for byte.

## Paired token count for one failing request

The sample used REA `6.5.0` with 207 REA MCP tool definitions.

| Item | Model-side count |
| --- | ---: |
| Prompt reported by the original failure | 287,065 tokens |
| Reconstructed request with all tool definitions | 284,483 tokens |
| Same reconstruction with only REA tool definitions removed | 34,239 tokens |
| Difference between the two reconstructions | **250,244 tokens** |
| Original error count above the full reconstruction | **2,582 tokens; unexplained** |

The deployed **Strata service's `POST /v1/messages/count_tokens`** endpoint performed the count. This endpoint is a capability of the tested service, not an assumption about every OpenAI-compatible server.

Method:

1. Reconstruct the system content, five user-side content items, and tool definitions from the failing DSH request snapshot, using an Anthropic-style counting body.
2. Map tools through `name`, `description`, and `parameters → input_schema`. Keep the complete system and message contents and submit the counting request.
3. The service encodes the prompt with its actual Qwen tokenizer and chat template via `encode_prompt(store=False)`. This includes template and tool rendering and runs no model inference.
4. Copy the same request and remove only REA's 207 definitions from the `tools` array. Use the same endpoint and encoding path. The paired difference is `284483 - 34239 = 250244`.

This supports the conclusion that REA definitions added about 250,000 input tokens to this reconstructed request. It does not establish a byte-identical reconstruction of the original request. The 2,582-token discrepancy remains unexplained; the reconstructed count must not be presented as the original error count.

Later requests that include the same full definitions can repeat a similar input burden. The exact count changes with the tokenizer, chat template, REA version, serialization, and other request contents. Cache hits can change billing, processing cost, or latency. This measurement did not establish monetary savings or a guaranteed reduction of 250,244 billed tokens on every request.

## Controlled integration test of the local adaptation

This test used local adaptation `0.1.4-local.1`, preceding the public fork and derived from `kirkchinese/dsh-capability-catalog 0.1.4`. Its three tools were still named `capability_search`, `capability_describe`, and `capability_call`.

The built tarball was installed into a clean, isolated DSH headless profile and launched through the DSH Desktop CLI. All model requests went to a local HTTP fixture that returned fixed text or scripted tool calls. No real model inference ran. REA calls reached the real, pinned `rea-agents@6.5.0` MCP server.

| Observation | Result |
| --- | ---: |
| Captured model HTTP requests | 13 |
| REA gateway tools | 3 |
| JSON bytes of the three tools in the OpenAI tools array | 2,098 UTF-8 bytes |
| Native tools in that headless profile | 25 |
| Total tools with gateway enabled | 28 |
| JSON bytes of all 28 tools | 23,712 UTF-8 bytes |
| Raw REA tools in the request tools array | 0 |

The three tool schemas stayed the same size after search, describe, and call. The 25 / 28 counts describe this headless profile, not the total tool count in a user's desktop profile.

Passed cases:

- Native `pwsh` call reading the working directory without side effects.
- Full `search → describe → call` sequence, including a real read-only REA `binary_session({})` call.
- Global REA off rejects a call.
- Session off overrides global on and rejects a call.
- Session on overrides global off and reaches REA.
- Master off removes the three gateway tools from model requests.

Toggle states were preset in the plugin-owned state file, then exercised through real DSH dispatch. Browser click controls were not covered by this test. The fake endpoint's usage values were synthetic and were not used for real token, speed, or cost measurements.

## Separate names in the public release

Public package `dsh-rea-gateway@0.1.0` uses `rea_search`, `rea_describe`, and `rea_call`, with a separate `reaGateway` remote-service namespace. The 2,098-byte result above belongs to the former local tool names and is not a public-release request measurement.

The public tarball was installed into a clean DSH headless profile and tested against the local fake model endpoint in 6 cases, capturing 12 model requests. Ordinary conversation, `rea_search → rea_describe → rea_call` with a real read-only REA call, global off, session off overriding global on, session on overriding global off, and master off all passed. The actual server identity confirmed REA 6.5.0. All runs exited with code 0 and empty stderr.

| Public `0.1.0` observation | Result |
| --- | ---: |
| Passing cases | 6 |
| Captured model HTTP requests | 12 |
| JSON bytes of the `rea_*` tools in the OpenAI tools array | 2,063 UTF-8 bytes, unchanged across requests |
| JSON bytes of all 28 tools | 23,677 UTF-8 bytes |
| Native tools in that headless profile | 25 |
| Raw REA tools in the request tools array | 0 |

Global off and session off rejected actual `rea_call` dispatches and hid the corresponding catalog index. Session on overrode global off and completed a real REA call. Master off removed the gateway tools while retaining 25 native tools. Switch states were preset in the plugin-owned store and verified through real DSH dispatch; this headless test did not click browser controls.

The public tools' serialized `{name, description, parameters}` definitions were separately measured at 1,970 UTF-8 bytes. That is the definition-object size; 2,063 bytes includes the actual OpenAI tools-array wrapper. Neither is a model token count. See `public_release` in [benchmark.json](benchmark.json) and the [public integration results](public-integration.json).

## Checking your own deployment

1. Pin DSH, REA, model-service, and gateway versions. Preserve the tokenizer, chat template, and relevant request settings.
2. Capture an actual outgoing request and separate its system, messages, and tool definitions. Remove private contents and credentials before sharing any material.
3. Use the actual serving tokenizer and full template to count the complete request and the same request with only REA definitions removed. Character counts, file sizes, and a different model's tokenizer are not substitutes.
4. Enable the gateway and disable any previous direct REA registration. Confirm that the tools array has the three `rea_*` entries and no full `mcp__rea__*` tool set.
5. Compare ordinary requests with requests after on-demand use, and exercise global/session switches. Cost and latency conclusions require separate measurements of cache state, billing rules, and runtime.

These results cover the context size of a specific sample and functional integration. They do not evaluate model answer quality, reverse-engineering quality, or the availability of every REA tool.
