![TOON logo with step‑by‑step guide](./.github/og.png)

# Token-Oriented Object Notation (TOON)

[![CI](https://github.com/toon-format/toon/actions/workflows/ci.yml/badge.svg)](https://github.com/toon-format/toon/actions)
[![npm version](https://img.shields.io/npm/v/@toon-format/toon.svg)](https://www.npmjs.com/package/@toon-format/toon)
[![SPEC v2.0](https://img.shields.io/badge/spec-v2.0-lightgray)](https://github.com/toon-format/spec)
[![npm downloads (total)](https://img.shields.io/npm/dt/@toon-format/toon.svg)](https://www.npmjs.com/package/@toon-format/toon)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**Token-Oriented Object Notation** is a compact, human-readable encoding of the JSON data model that minimizes tokens and makes structure easy for models to follow. It's intended for *LLM input* as a drop-in, lossless representation of your existing JSON.

TOON combines YAML's indentation-based structure for nested objects with a CSV-style tabular layout for uniform arrays. TOON's sweet spot is uniform arrays of objects (multiple fields per row, same structure across items), achieving CSV-like compactness while adding explicit structure that helps LLMs parse and validate data reliably. For deeply nested or non-uniform data, JSON may be more efficient.

The similarity to CSV is intentional: CSV is simple and ubiquitous, and TOON aims to keep that familiarity while remaining a lossless, drop-in representation of JSON for Large Language Models.

Think of it as a translation layer: use JSON programmatically, and encode it as TOON for LLM input.

> [!TIP]
> The TOON format is stable, but also an idea in progress. Nothing's set in stone – help shape where it goes by contributing to the [spec](https://github.com/toon-format/spec) or sharing feedback.

## Table of Contents

- [Why TOON?](#why-toon)
- [Key Features](#key-features)
- [When Not to Use TOON](#when-not-to-use-toon)
- [Benchmarks](#benchmarks)
- [Installation & Quick Start](#installation--quick-start)
- [Playgrounds](#playgrounds)
- [Editor Support](#editor-support)
- [CLI](#cli)
- [Format Overview](#format-overview)
- [Using TOON with LLMs](#using-toon-with-llms)
- [Documentation](#documentation)
- [Other Implementations](#other-implementations)
- [📋 Full Specification](https://github.com/toon-format/spec/blob/main/SPEC.md)

## Why TOON?

AI is becoming cheaper and more accessible, but larger context windows allow for larger data inputs as well. **LLM tokens still cost money** – and standard JSON is verbose and token-expensive:

```json
{
  "context": {
    "task": "Our favorite hikes together",
    "location": "Boulder",
    "season": "spring_2025"
  },
  "friends": ["ana", "luis", "sam"],
  "hikes": [
    {
      "id": 1,
      "name": "Blue Lake Trail",
      "distanceKm": 7.5,
      "elevationGain": 320,
      "companion": "ana",
      "wasSunny": true
    },
    {
      "id": 2,
      "name": "Ridge Overlook",
      "distanceKm": 9.2,
      "elevationGain": 540,
      "companion": "luis",
      "wasSunny": false
    },
    {
      "id": 3,
      "name": "Wildflower Loop",
      "distanceKm": 5.1,
      "elevationGain": 180,
      "companion": "sam",
      "wasSunny": true
    }
  ]
}
```

<details>
<summary>YAML already conveys the same information with <strong>fewer tokens</strong>.</summary>

```yaml
context:
  task: Our favorite hikes together
  location: Boulder
  season: spring_2025

friends:
  - ana
  - luis
  - sam

hikes:
  - id: 1
    name: Blue Lake Trail
    distanceKm: 7.5
    elevationGain: 320
    companion: ana
    wasSunny: true
  - id: 2
    name: Ridge Overlook
    distanceKm: 9.2
    elevationGain: 540
    companion: luis
    wasSunny: false
  - id: 3
    name: Wildflower Loop
    distanceKm: 5.1
    elevationGain: 180
    companion: sam
    wasSunny: true
```

</details>

TOON conveys the same information with **even fewer tokens** – combining YAML-like indentation with CSV-style tabular arrays:

```yaml
context:
  task: Our favorite hikes together
  location: Boulder
  season: spring_2025
friends[3]: ana,luis,sam
hikes[3]{id,name,distanceKm,elevationGain,companion,wasSunny}:
  1,Blue Lake Trail,7.5,320,ana,true
  2,Ridge Overlook,9.2,540,luis,false
  3,Wildflower Loop,5.1,180,sam,true
```

## Key Features

- 📊 **Token-Efficient & Accurate:** TOON reaches 74% accuracy (vs JSON's 70%) while using ~40% fewer tokens in mixed-structure benchmarks across 4 models.
- 🔁 **JSON Data Model:** Encodes the same objects, arrays, and primitives as JSON with deterministic, lossless round-trips.
- 🛤️ **LLM-Friendly Guardrails:** Explicit [N] lengths and {fields} headers give models a clear schema to follow, improving parsing reliability.
- 📐 **Minimal Syntax:** Uses indentation instead of braces and minimizes quoting, giving YAML-like readability with CSV-style compactness.
- 🧺 **Tabular Arrays:** Uniform arrays of objects collapse into tables that declare fields once and stream row values line by line.
- 🌐 **Multi-Language Ecosystem:** Spec-driven implementations in TypeScript, Python, Go, Rust, .NET, and other languages.

## Media Type & File Extension

By convention, TOON files use the `.toon` extension and the provisional media type `text/toon` for HTTP and content-type–aware contexts. TOON documents are always UTF-8 encoded; the `charset=utf-8` parameter may be specified but defaults to UTF-8 when omitted. See [SPEC.md §18.2](https://github.com/toon-format/spec/blob/main/SPEC.md#182-provisional-media-type) for normative details.

## When Not to Use TOON

TOON excels with uniform arrays of objects, but there are cases where other formats are better:

- **Deeply nested or non-uniform structures** (tabular eligibility ≈ 0%): JSON-compact often uses fewer tokens. Example: complex configuration objects with many nested levels.
- **Semi-uniform arrays** (~40–60% tabular eligibility): Token savings diminish. Prefer JSON if your pipelines already rely on it.
- **Pure tabular data**: CSV is smaller than TOON for flat tables. TOON adds minimal overhead (~5-10%) to provide structure (array length declarations, field headers, delimiter scoping) that improves LLM reliability.
- **Latency-critical applications**: If end-to-end response time is your top priority, benchmark on your exact setup. Some deployments (especially local/quantized models like Ollama) may process compact JSON faster despite TOON's lower token count. Measure TTFT, tokens/sec, and total time for both formats and use whichever is faster.

See [benchmarks](#benchmarks) for concrete comparisons across different data structures.

## Benchmarks

Benchmarks are organized into two tracks to ensure fair comparisons:

- **Mixed-Structure Track**: Datasets with nested or semi-uniform structures (TOON vs JSON, YAML, XML). CSV excluded as it cannot properly represent these structures.
- **Flat-Only Track**: Datasets with flat tabular structures where CSV is applicable (CSV vs TOON vs JSON, YAML, XML).

### Retrieval Accuracy

<!-- automd:file src="./benchmarks/results/retrieval-accuracy.md" -->

# Retrieval Accuracy Benchmarks

*Benchmarks coming soon. This file ensures automd functionality works correctly.*

<!-- /automd -->

### Token Efficiency

Token counts are measured using the GPT-5 `o200k_base` tokenizer via [`gpt-tokenizer`](https://github.com/niieani/gpt-tokenizer). Savings are calculated against formatted JSON (2-space indentation) as the primary baseline, with additional comparisons to compact JSON (minified), YAML, and XML. Actual savings vary by model and tokenizer.

The benchmarks test datasets across different structural patterns (uniform, semi-uniform, nested, deeply nested) to show where TOON excels and where other formats may be better.

<!-- automd:file src="./benchmarks/results/token-efficiency.md" -->

# Token Efficiency Benchmarks

*Benchmarks coming soon. This file ensures automd functionality works correctly.*

<!-- /automd -->

## Installation & Quick Start

### CLI (No Installation Required)

Try TOON instantly with npx:

```bash
# Convert JSON to TOON
npx @toon-format/cli input.json -o output.toon

# Pipe from stdin
echo '{"name": "Ada", "role": "dev"}' | npx @toon-format/cli
```

See the [CLI section](#cli) for all options and examples.

### TypeScript Library

```bash
# npm
npm install @toon-format/toon

# pnpm
pnpm add @toon-format/toon

# yarn
yarn add @toon-format/toon
```

**Example usage:**

```ts
import { encode } from '@toon-format/toon'

const data = {
  users: [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob', role: 'user' }
  ]
}

console.log(encode(data))
// users[2]{id,name,role}:
//   1,Alice,admin
//   2,Bob,user
```

**Streaming large datasets:**

```ts
import { encodeLines } from '@toon-format/toon'

const largeData = await fetchThousandsOfRecords()

// Memory-efficient streaming for large data
for (const line of encodeLines(largeData)) {
  process.stdout.write(`${line}\n`)
}
```

> [!TIP]
> For streaming decode APIs, see [`decodeFromLines()`](/reference/api#decodeFromLines-lines-options) and [`decodeStream()`](/reference/api#decodeStream-source-options).

## Playgrounds

Experiment with TOON format interactively using these community-built tools for token comparison, format conversion, and validation:

- [Format Tokenization Playground](https://www.curiouslychase.com/playground/format-tokenization-exploration)
- [TOON Tools](https://toontools.vercel.app/)

## Editor Support

### VS Code

[TOON Language Support](https://marketplace.visualstudio.com/items?itemName=vishalraut.vscode-toon) - Syntax highlighting, validation, conversion, and token analysis.

```bash
code --install-extension vishalraut.vscode-toon
```

### Tree-sitter Grammar

[tree-sitter-toon](https://github.com/3swordman/tree-sitter-toon) - Grammar for Tree-sitter-compatible editors (Neovim, Helix, Emacs, Zed).

### Neovim

[toon.nvim](https://github.com/thalesgelinger/toon.nvim) - Lua-based plugin.

### Other Editors

Use YAML syntax highlighting as a close approximation.

## CLI

Command-line tool for quick JSON↔TOON conversions, token analysis, and pipeline integration. Auto-detects format from file extension, supports stdin/stdout workflows, and offers delimiter options for maximum efficiency.

```bash
# Encode JSON to TOON (auto-detected)
npx @toon-format/cli input.json -o output.toon

# Decode TOON to JSON (auto-detected)
npx @toon-format/cli data.toon -o output.json

# Pipe from stdin (no argument needed)
cat data.json | npx @toon-format/cli
echo '{"name": "Ada"}' | npx @toon-format/cli

# Output to stdout
npx @toon-format/cli input.json

# Show token savings
npx @toon-format/cli data.json --stats
```

> [!TIP]
> See the full [CLI documentation](https://toonformat.dev/cli/) for all options, examples, and advanced usage.

## Format Overview

Detailed syntax references, implementation guides, and quick lookups for understanding and using the TOON format.

- [Format Overview](https://toonformat.dev/guide/format-overview) – Complete syntax documentation
- [Syntax Cheatsheet](https://toonformat.dev/reference/syntax-cheatsheet) – Quick reference
- [API Reference](https://toonformat.dev/reference/api) – Encode/decode usage (TypeScript)

## Using TOON with LLMs

TOON works best when you show the format instead of describing it. The structure is self-documenting – models parse it naturally once they see the pattern. Wrap data in ` ```toon` code blocks for input, and show the expected header template when asking models to generate TOON. Use tab delimiters for even better token efficiency.

Follow the detailed [LLM integration guide](https://toonformat.dev/guide/llm-prompts) for strategies, examples, and validation techniques.

## Documentation

Comprehensive guides, references, and resources to help you get the most out of the TOON format and tools.

### Getting Started

- [Introduction & Installation](https://toonformat.dev/guide/getting-started) – What TOON is, when to use it, first steps
- [Format Overview](https://toonformat.dev/guide/format-overview) – Complete syntax with examples
- [Benchmarks](https://toonformat.dev/guide/benchmarks) – Accuracy & token efficiency results

### Tools & Integration

- [CLI](https://toonformat.dev/cli/) – Command-line tool for  JSON↔TOON conversions
- [Using TOON with LLMs](https://toonformat.dev/guide/llm-prompts) – Prompting strategies & validation
- [Playgrounds](https://toonformat.dev/ecosystem/tools-and-playgrounds) – Interactive tools

### References

- [API Reference](https://toonformat.dev/reference/api) – TypeScript/JavaScript encode/decode API
- [Syntax Cheatsheet](https://toonformat.dev/reference/syntax-cheatsheet) – Quick format lookup
- [Specification v2.0](https://github.com/toon-format/spec/blob/main/SPEC.md) – Normative rules for implementers

## Other Implementations

> [!NOTE]
> When implementing TOON in other languages, please follow the [Specification](https://github.com/toon-format/spec/blob/main/SPEC.md) (currently v2.0) to ensure compatibility across implementations. The [conformance tests](https://github.com/toon-format/spec/tree/main/tests) provide language-agnostic test fixtures that validate your implementations.

### Official Implementations

> [!TIP]
> These implementations are actively being developed by dedicated teams. Contributions are welcome! Join the effort by opening issues, submitting PRs, or discussing implementation details in the respective repositories.

- **.NET:** [toon_format](https://github.com/toon-format/toon-dotnet) *(in development)*
- **Dart:** [toon](https://github.com/toon-format/toon-dart) *(in development)*
- **Go:** [toon-go](https://github.com/toon-format/toon-go) *(in development)*
- **Python:** [toon_format](https://github.com/toon-format/toon-python) *(in development)*
- **Rust:** [toon_format](https://github.com/toon-format/toon-rust) *(in development)*

### Community Implementations

- **Apex:** [ApexToon](https://github.com/Eacaw/ApexToon)
- **C++:** [ctoon](https://github.com/mohammadraziei/ctoon)
- **Clojure:** [toon](https://github.com/vadelabs/toon)
- **Crystal:** [toon-crystal](https://github.com/mamantoha/toon-crystal)
- **Elixir:** [toon_ex](https://github.com/kentaro/toon_ex)
- **Gleam:** [toon_codec](https://github.com/axelbellec/toon_codec)
- **Go:** [gotoon](https://github.com/alpkeskin/gotoon)
- **Java:** [JToon](https://github.com/felipestanzani/JToon)
- **Scala:** [toon4s](https://github.com/vim89/toon4s)
- **Lua/Neovim:** [toon.nvim](https://github.com/thalesgelinger/toon.nvim)
- **OCaml:** [ocaml-toon](https://github.com/davesnx/ocaml-toon)
- **Perl:** [Data::TOON](https://github.com/ytnobody/p5-Data-TOON)
- **PHP:** [toon-php](https://github.com/HelgeSverre/toon-php)
- **Laravel Framework:** [laravel-toon](https://github.com/jobmetric/laravel-toon)
- **R**: [toon](https://github.com/laresbernardo/toon)
- **Ruby:** [toon-ruby](https://github.com/andrepcg/toon-ruby)
- **Swift:** [TOONEncoder](https://github.com/mattt/TOONEncoder)
- **Kotlin:** [Kotlin-Toon Encoder/Decoder](https://github.com/vexpera-br/kotlin-toon)

## Credits

- Logo design by [鈴木ックス(SZKX)](https://x.com/szkx_art)

## License

[MIT](./LICENSE) License © 2025-PRESENT [Johann Schopplich](https://github.com/johannschopplich)
