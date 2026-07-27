# Ma'at (PharaohLang) — Agent Guide

A real programming language project (not a joke). The compiler is written in strict TypeScript.

## Commands

| Action | Command |
|--------|---------|
| Build | `npm run build` (runs `tsc`; output in `dist/`) |

No test framework, linter, or formatter is configured yet.

## Language conventions

- Source files use `.maat` extension.
- Ma'at programs should prefer sacred-script identifiers (e.g. `𓂀𓃀𓏏`). Latin identifiers are acceptable for documentation, interop, or tests.
- Compiler internals must **never** use sacred-script identifiers except in test fixtures.

## Compiler architecture

Keep these stages strictly separated, with no mixing:

```
Source → Lexer → Parser → AST → Interpreter/Backend
```

- No lexing logic inside the parser.
- No parsing logic inside execution.
- No compiler internals inside CLI handling.

## File naming

Normal names (README.md, package.json, config files, CI files, AGENTS.md) are fine. Ma'at `.maat` source files should follow Ma'at naming conventions.

## Priorities

1. Correctness — 2. Simplicity — 3. Consistency — 4. Maintainability

Don't add features only because they look unusual.
