# 𓂀 Ma'at (PharaohLang)

> A programming language in Egyptian hieroglyphs

> Full language specification: [DOCS_EN.md](./DOCS_EN.md) | 中文规范: [DOCS.md](./DOCS.md) | 中文 README: [README_ZH.md](./README_ZH.md)

## Overview

Ma'at (named after the ancient Egyptian goddess of truth and order) is a **Turing-complete** programming language whose keywords and identifiers are written in **Egyptian Hieroglyphs** (Unicode block U+13000–U+1342F). The compiler is written in strict TypeScript and follows a classical Lexer → Parser → AST → Checker → Interpreter pipeline, with **zero runtime dependencies**.

This is a **joke project**, but ~~to sound more sophisticated~~ we've packaged it as a **serious language engineering effort**. I mean, if you had to pick between hieroglyphs and Latin letters for your code, why not go with the one that has more museum appeal?

### Core Features

| Category | Details |
|----------|---------|
| **Data Types** | `number` (integer), `string`, `boolean` (`𓆑` / `𓃽`), `array` (dynamic), `object` (JSON-like), `function` (first-class, closures) |
| **Operators** | Arithmetic `+ - * / %`, Comparison `== != < <= > >=`, Logical `&& \|\| !`, Assignment `=`, Index `[]`, Property `.` |
| **Statements** | Variable `𓈖`, Conditional `𓎡 / 𓁐`, Loop `𓍯`, Return `𓇋`, Block `{}` |
| **Functions** | `𓍢 name(params) { body }` — recursion, closures, up to 255 params |
| **Comments** | `//` line, `/* */` block, `#` hash |
| **Modules** | `import` / `export` system |
| **Async** | `async` / `await` / `spawn` (experimental) |
| **Static Analysis** | Undefined variables (error), unused variables (warning), shadowing (warning), arg count mismatch (warning) |

~~Yes, this language has its own static checker. We take our jokes very seriously.~~

#### 7 Built-in Functions

| Glyph | Name | Args | Description |
|-------|------|------|-------------|
| `𓂀` | `print` | 1 | Output to stdout |
| `𓂁` | `readFile` | 1 | Read file as string |
| `𓂂` | `writeFile` | 2 | Write string to file |
| `𓂃` | `now` | 0 | Current timestamp (ms) |
| `𓂄` | `parseInt` | 1 | String to integer |
| `𓂅` | `sleep` | 1 | Async delay (ms) |
| `𓂒` | `serve` | 2 | HTTP server (port, handler) |

### Quick Start

```bash
# Build the compiler
npm run build

# Install globally (optional)
npm link

# Run a program (lex → parse → check → execute)
maat 𓂀/𓂀.maat

# Static check only
maat --check my_program.maat
```

### Code Examples

#### Hello World

```
𓂀("Hello, Ma-at!");
```

#### Variables & Arithmetic

```
𓈖 𓃀 = 10;
𓈖 𓏏 = 3;
𓈖 𓃁 = 𓃀 + 𓏏 * 2;
𓂀(𓃁);
```

#### Recursive Factorial

```
𓍢 factorial(n) {
  𓎡 (n <= 1) {
    𓇋 1;
  } 𓁐 {
    𓇋 n * factorial(n - 1);
  }
}
𓂀(factorial(7));
```

#### FizzBuzz

```
𓈖 n = 1;
𓍯 (n <= 30) {
  𓎡 (n % 15 == 0) {
    𓂀("FizzBuzz");
  } 𓁐 𓎡 (n % 3 == 0) {
    𓂀("Fizz");
  } 𓁐 𓎡 (n % 5 == 0) {
    𓂀("Buzz");
  } 𓁐 {
    𓂀(n);
  }
  n = n + 1;
}
```

#### Arrays & Objects

```
𓈖 arr = [10, 20, 30];
𓂀(arr[0]);
arr[2] = 99;
𓂀(arr);

𓈖 obj = {name: "Ma'at", version: 1};
𓂀(obj.name);
```

#### HTTP Server

```
𓍢 handler(req) {
  𓎡 (req.query == "token=ankh") { 𓇋 "TRUE"; }
  𓁐 { 𓇋 "FALSE"; }
}
𓂒(3000, handler);
```

More examples in the `𓂀/` directory.

### Compiler Architecture

```
Source .maat → Lexer → Token[] → Parser → AST → Checker → Interpreter → Output
```

Stages are strictly separated:
- **Lexer** — Unicode-aware, handles surrogate pairs, strips comments
- **Parser** — Recursive descent with error recovery, produces typed AST
- **Checker** — Static semantic analysis: undefined variables, unused variables, shadowing, arg mismatches
- **Interpreter** — Tree-walking evaluator with lexical scope chains, recursive module import

~~Four-stage pipeline, textbook-classic. For a joke language.~~

### Project Structure

```
PharaohLang/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── lexer/                # Token types + lexer
│   ├── parser/               # AST nodes + recursive descent parser
│   ├── checker/              # Diagnostics + semantic checker
│   └── interpreter/          # Tree-walking interpreter
├── bin/maat.js               # CLI executable
├── 𓂀/                       # Example programs (.maat files)
├── maat-lang.json            # Keyword / built-in / type name config
├── DOCS.md                   # Full language specification (Chinese)
├── DOCS_EN.md                # Full language specification (English)
└── AGENTS.md                 # AI collaboration guide
```

### Tech Stack

| Item | Detail |
|------|--------|
| Compiler Language | TypeScript 5.5+ (strict mode) |
| Target | ES2016, CommonJS |
| Runtime | Node.js |
| Dev Dependencies | `typescript`, `@types/node` |
| Production Dependencies | **None** (zero deps) |

### ~~FAQ~~ Questions You Might Have

> **Q: Why would I write code in hieroglyphs?**
> A: You wouldn't. You really wouldn't. But if you want your code reviewer to stare at the screen in silence for three minutes, this is the fastest way.

> **Q: Is this production-ready?**
> A: Technically yes. ~~But if you actually do, please don't tell anyone we gave you the idea.~~

> **Q: Is there an LSP / syntax highlighting / VSCode extension?**
> A: No. Every `𓎡` you type will appear as a tofu rectangle on your coworker's screen.

> **Q: How does it compare to Rust / Go / Python?**
> A: When you open Ma'at code at a coffee shop, the person next to you will think you're deciphering ancient Egyptian spells. Social credit bonus.

> **Q: Why is it called Ma'at?**
> A: Because "TypeScript++" was too boring. Naming it after the Egyptian goddess of truth gives off a "we're doing something meaningful" vibe.
