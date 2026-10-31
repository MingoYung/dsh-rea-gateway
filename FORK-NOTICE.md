# Fork notice

REA Gateway is an independently named fork of [kirkchinese/dsh-capability-catalog](https://github.com/kirkchinese/dsh-capability-catalog), based on version 0.1.4. The original project and code were authored by kirkchinese and released under the MIT license. The original copyright notice and license are preserved in LICENSE. The package author field retains the upstream author attribution.

Fork changes include the REA-oriented bundle and native controls, separate package/service/remote/tool identifiers, a dedicated cache, no default skill catalog takeover, DeepSeek Harness 0.2.1-rc.4 compatibility, and reuse of the host's public MCP adapter for canonical media retention and durable image projection. Default tool names are rea_search, rea_describe and rea_call. This package is maintained separately and is not an official upstream release.

The fork keeps the upstream tool-schema fixture and tests. The original 22 tests are retained with fork-owned identifiers; four additional tests cover canonical media, durable images, failed-call state and text bounds/structured-only output. The README documents installation and behavior separately.
