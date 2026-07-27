# Ma'at (PharaohLang) Language Specification

## Table of Contents

1. [Overview](#1-overview)
2. [Hieroglyphic Alphabet](#2-hieroglyphic-alphabet)
3. [Lexical Structure](#3-lexical-structure)
4. [Comments](#4-comments)
5. [Data Types](#5-data-types)
6. [Variables and Scope](#6-variables-and-scope)
7. [Operators](#7-operators)
8. [Statements](#8-statements)
9. [Functions](#9-functions)
10. [Arrays](#10-arrays)
11. [Full Grammar](#11-full-grammar)
12. [Built-in Functions](#12-built-in-functions)
13. [Static Checker](#13-static-checker)
14. [Compiler Architecture](#14-compiler-architecture)
15. [Command-Line Usage](#15-command-line-usage)
16. [Code Examples](#16-code-examples)
17. [Turing Completeness](#17-turing-completeness)

---

## 1. Overview

Ma'at (the ancient Egyptian word for "truth, order") is a programming language whose core identifiers are written in **Egyptian Hieroglyphs**. The compiler is written in strict TypeScript and follows the classic Lexer → Parser → AST → Interpreter pipeline.

- **File extension**: `.maat`
- **Character encoding**: UTF-8
- **Identifiers**: Prefer hieroglyphic characters (range U+13000–U+1342F); also supports Latin letters A–Z, a–z, and underscores for documentation, interop, and testing
- **Semicolons**: Statements must end with `;`

---

## 2. Hieroglyphic Alphabet

### 2.1 Keywords

Ma'at's 8 keywords are all **single-character hieroglyphs**, each mapped to a single Unicode codepoint:

| Keyword | Meaning | Unicode | UTF-16 Surrogate Pair | Glyph |
|---------|---------|---------|------------------------|-------|
| `let` | Variable declaration | U+13216 | `\uD80C\uDE16` | 𓈖 |
| `if` | Conditional branch | U+133A1 | `\uD80C\uDFA1` | 𓎡 |
| `else` | Else branch | U+13310 | `\uD80C\uDF10` | 𓁐 |
| `while` | Loop | U+1336F | `\uD80C\uDF6F` | 𓍯 |
| `fn` | Function definition | U+13362 | `\uD80C\uDF62` | 𓍢 |
| `return` | Return value | U+1330B | `\uD80C\uDF0B` | 𓇋 |
| `true` | Boolean true | U+13391 | `\uD80C\uDF91` | 𓆑 |
| `false` | Boolean false | U+1337D | `\uD80C\uDF7D` | 𓃽 |

### 2.2 Built-in Function Glyphs

| Name | Function | Unicode | Glyph | Parameters |
|------|----------|---------|-------|------------|
| print | Output to console | U+13080 | 𓂀 | 1 argument |

### 2.3 Available Identifier Range

User-defined identifiers may use **all** Egyptian Hieroglyph Unicode block characters: **U+13000 to U+1342F** (1,072 displayable codepoints), except for the 8 keyword glyphs listed above. Latin letters A–Z, a–z, and underscore `_` are also supported.

> Example identifiers: `𓃀`, `𓏏`, `𓃁`, `𓂀𓃀𓏏`, `myVar`, `_counter`

---

## 3. Lexical Structure

### 3.1 Number Literals

Only **integers** are supported, consisting of one or more ASCII digits `0–9`.

```
42
0
9999
```

Decimal, scientific notation, and hexadecimal are not supported.

### 3.2 String Literals

Both **double quotes** `"..."` and **single quotes** `'...'` are supported. Cannot span multiple lines.

```
"Hello, Ma'at!"
'Single quotes are also valid'
```

#### Escape Sequences

| Escape | Meaning |
|--------|---------|
| `\n` | Newline |
| `\t` | Tab |
| `\r` | Carriage return |
| `\\` | Backslash |
| `\"` | Double quote |
| `\'` | Single quote |

Unrecognized escape sequences (e.g. `\x`) are preserved verbatim as `\x`.

### 3.3 Boolean Literals

- `𓆑` — `true` (U+13391)
- `𓃽` — `false` (U+1337D)

### 3.4 Identifiers

Identifiers must start with a letter (hieroglyphic, A–Z, a–z, or `_`), followed by letters or digits. When the full string of an identifier exactly matches a keyword, the keyword takes priority.

```
𓃀              // ✓ valid identifier
𓃀𓏏            // ✓ multi-character identifier
my_var_42       // ✓ Latin identifier
𓈖              // ✗ parsed as keyword 'let', not an identifier
ʔhello          // ✗ not a valid starting character
```

### 3.5 Whitespace

Spaces, tabs, and newlines (LF/CR/CRLF) are all ignored. CRLF and CR are normalized to LF before lexical analysis.

---

## 4. Comments

Ma'at supports **three** comment forms:

### 4.1 Line Comments `//`

```
// This is a line comment, extends to end of line
𓈖 x = 5;  // Can also follow code
```

### 4.2 Block Comments `/* */`

```
/*
   Multi-line block comment
   to comment out entire code blocks
*/
𓈖 y = 10;
𓂀(/* inline block comment */ y);
```

### 4.3 Hash Comments `#`

```
# This is also a line comment (extends to end of line)
# Supports Unix shebang: #!/usr/bin/env maat
𓈖 z = 42;
```

Hash comments allow `.maat` files to begin with `#!/usr/bin/env maat`, enabling direct execution on Unix-like systems.

---

## 5. Data Types

### 5.1 Runtime Types

| Type | Examples | Description |
|------|----------|-------------|
| `number` | `42`, `0`, `-7` | Integer (backed by JavaScript number) |
| `string` | `"hello"`, `'world'` | String |
| `boolean` | `𓆑`, `𓃽` | Boolean |
| `array` | `[]`, `[1, 2, 3]` | Array, dynamic, 0-indexed |
| `function` | `𓍢 f(n) { ... }` | First-class function |
| `null` | `null` | Null value (default return value) |

### 5.2 Truthiness

The rules for `if`, `while`, `!`, `&&`, `||` truthiness evaluation:

| Value | Truthy? |
|-------|---------|
| `null` | **falsy** |
| `false` / `𓃽` | **falsy** |
| Number `0` | **falsy** |
| Empty string `""` | **falsy** |
| All other values | **truthy** |

### 5.3 Equality

- `null == null` → `true`
- `null == anything else` → `false`
- Other comparisons use JavaScript strict equality `===`

### 5.4 Type Coercion Rules

| Operator | Rule |
|----------|------|
| `+` | String concatenation if either operand is a string; numeric addition otherwise |
| `-` `*` `/` `%` | Both operands must be numbers (runtime error otherwise) |
| `<` `<=` `>` `>=` | Both operands must be numbers |
| `&&` `\|\|` | Short-circuit evaluation based on truthiness, returns boolean |
| `!` | Boolean negation of truthiness |
| `-x` (unary) | Operand must be a number |

---

## 6. Variables and Scope

### 6.1 Variable Declaration

```
𓈖 name = expression;
```

- `𓈖` (let) declares a variable
- Must include an initializer expression `= expr`
- Variable name is an identifier

```
𓈖 x = 5;
𓈖 𓃀 = 10;
```

### 6.2 Assignment

```
name = expression;
```

Assignment walks up the lexical scope chain and updates the nearest binding.

```
x = x + 1;
```

### 6.3 Scope

Ma'at uses **block-level lexical scoping**. Each `{ }` block creates a new scope; inner scopes can access outer variables, but outer scopes cannot access inner variables.

```
𓈖 a = 1;
{
  𓈖 b = 2;     // b is only visible within this block
  𓂀(a + b);    // 3 — can access outer a
}
𓂀(b);           // Runtime error: undefined b
```

Function calls create a new scope whose parent is the closure environment captured at definition time.

---

## 7. Operators

### 7.1 Operator Precedence Table (lowest to highest)

| Precedence | Operator | Associativity | Category |
|------------|----------|---------------|----------|
| 1 (lowest) | `=` | right | Assignment |
| 2 | `\|\|` | left | Logical OR |
| 3 | `&&` | left | Logical AND |
| 4 | `==` `!=` | left | Equality |
| 5 | `<` `<=` `>` `>=` | left | Comparison |
| 6 | `+` `-` | left | Add/Subtract |
| 7 | `*` `/` `%` | left | Multiply/Divide/Modulo |
| 8 | `!` `-` (unary) | right | Unary |
| 9 (highest) | `f()` `a[i]` | left | Call/Index (postfix) |

### 7.2 Operator Semantics

| Operator | Meaning | Operand Types |
|----------|---------|---------------|
| `+` | Addition / Concatenation | Two numbers, or at least one string |
| `-` | Subtraction | Two numbers |
| `*` | Multiplication | Two numbers |
| `/` | Division | Two numbers (division by zero throws) |
| `%` | Modulo | Two numbers |
| `==` | Equal | Any |
| `!=` | Not equal | Any |
| `<` | Less than | Two numbers |
| `<=` | Less than or equal | Two numbers |
| `>` | Greater than | Two numbers |
| `>=` | Greater than or equal | Two numbers |
| `&&` | Logical AND | Any (returns boolean) |
| `\|\|` | Logical OR | Any (returns boolean) |
| `!` | Logical NOT | Any (returns boolean) |
| `-x` | Negation | Number |

---

## 8. Statements

### 8.1 Expression Statement

```
expression;
```

```
𓂀("hello");
x = x + 1;
```

### 8.2 Block Statement

```
{
  statement1;
  statement2;
  ...
}
```

### 8.3 Conditional Statement

```
𓎡 (condition) {
  statements;
} 𓁐 {
  statements;    // else branch is optional
}
```

Supports `else if` chains:

```
𓎡 (n % 15 == 0) {
  𓂀("FizzBuzz");
} 𓁐 𓎡 (n % 3 == 0) {
  𓂀("Fizz");
} 𓁐 𓎡 (n % 5 == 0) {
  𓂀("Buzz");
} 𓁐 {
  𓂀(n);
}
```

### 8.4 Loop Statement

```
𓍯 (condition) {
  statements;
}
```

The loop condition is evaluated at the beginning of each iteration. `break` is currently not supported — only `while` loop invariants and conditional exits.

### 8.5 Return Statement

```
𓇋 expression;
𓇋 ;            // Returns null
```

- Must be inside a function body, or the checker emits a warning
- Without an expression, returns `null`

---

## 9. Functions

### 9.1 Function Definition

```
𓍢 function_name(param1, param2, ...) {
  body;
}
```

- Parameter list can be empty `()`
- Maximum 255 parameters
- Function body is a block `{ ... }`

### 9.2 Function Call

```
function_name(arg1, arg2, ...);
```

- Arguments are evaluated left to right
- Argument count must match declaration, or the checker emits a warning
- Maximum 255 arguments

### 9.3 Closures

Functions capture the lexical scope at definition time (closure). Calling creates a new scope with the closure as parent.

```
𓍢 makeAdder(x) {
  𓍢 adder(y) {
    𓇋 x + y;
  }
  𓇋 adder;
}

𓈖 add5 = makeAdder(5);
𓂀(add5(3));   // 8
```

### 9.4 Return Values

- Explicit `𓇋 value;` returns the specified value
- Implicit `null` is returned at function end

### 9.5 Recursion

Functions may call themselves recursively:

```
𓍢 factorial(n) {
  𓎡 (n <= 1) {
    𓇋 1;
  } 𓁐 {
    𓇋 n * factorial(n - 1);
  }
}
```

---

## 10. Arrays

### 10.1 Array Literals

```
[element1, element2, ...]
```

Empty array: `[]`

```
𓈖 arr = [1, 2, 3];
𓈖 empty = [];
```

### 10.2 Index Access

```
array[index]
```

Index must be a number; target must be an array.

```
𓂀(arr[0]);  // 1
```

### 10.3 Index Assignment

```
array[index] = value;
```

```
arr[2] = 99;
𓂀(arr);  // [1, 2, 99]
```

---

## 11. Full Grammar

The following is the complete EBNF grammar of Ma'at (start symbol: `Program`):

```ebnf
Program          ::= Declaration*

Declaration      ::= FnDeclaration | LetDeclaration | Statement

FnDeclaration    ::= "𓍢" IDENTIFIER "(" Parameters? ")" Block
Parameters       ::= IDENTIFIER ("," IDENTIFIER)*             【max 255】

LetDeclaration   ::= "𓈖" IDENTIFIER "=" Expression ";"

Statement        ::= IfStatement
                   | WhileStatement
                   | ReturnStatement
                   | Block
                   | ExpressionStatement

IfStatement      ::= "𓎡" "(" Expression ")" Statement ("𓁐" Statement)?

WhileStatement   ::= "𓍯" "(" Expression ")" Statement

ReturnStatement  ::= "𓇋" Expression? ";"

Block            ::= "{" Declaration* "}"

ExpressionStatement ::= Expression ";"

Expression       ::= Assignment

Assignment       ::= Or ("=" Assignment)?
                     -- Assignment target: VariableExpr or IndexExpr
                     -- Other targets throw "Invalid assignment target"

Or               ::= And ("||" And)*

And              ::= Equality ("&&" Equality)*

Equality         ::= Comparison (("==" | "!=") Comparison)*

Comparison       ::= Term (("<" | "<=" | ">" | ">=") Term)*

Term             ::= Factor (("+" | "-") Factor)*

Factor           ::= Unary (("*" | "/" | "%") Unary)*

Unary            ::= ("!" | "-") Unary | Call

Call             ::= Primary ( "(" Arguments? ")" | "[" Expression "]" )*

Arguments        ::= Expression ("," Expression)*              【max 255】

Primary          ::= "𓆑"                    -- true
                   | "𓃽"                    -- false
                   | NUMBER
                   | STRING
                   | IDENTIFIER
                   | "(" Expression ")"
                   | "[" Elements? "]"

Elements         ::= Expression ("," Expression)*
```

---

## 12. Built-in Functions

### 12.1 `𓂀` — print

```
𓂀(expression);
```

Outputs the string representation of the argument to the console (`console.log`), returns `null`.

**Stringification rules:**

| Value | Output |
|-------|--------|
| `null` | `null` |
| `true` / `𓆑` | `𓆑` |
| `false` / `𓃽` | `𓃽` |
| Number | Decimal; trailing `.0` stripped |
| String | Preserved verbatim |
| Array | `[elem1, elem2, ...]` (recursive) |
| Other | JavaScript `String(value)` |

---

## 13. Static Checker

The compiler's static analysis module (`src/checker/`) analyzes the AST **before** execution and outputs diagnostic messages.

### 13.1 Severity Levels

| Level | Meaning | Exit Behavior |
|-------|---------|---------------|
| **error** | Must be fixed | `--check` mode exits with code 1 |
| **warning** | Suggested fix | Does not affect exit code |
| **info** | Informational | Does not affect exit code |

### 13.2 Check Items

| # | Check | Level |
|---|-------|-------|
| 1 | Use of undefined variable | error |
| 2 | Assignment to undefined variable | error |
| 3 | Defined but never used variable/parameter | warning |
| 4 | Variable redefinition (shadowing) | warning |
| 5 | Function call argument count mismatch | warning |
| 6 | `return` outside function | warning |
| 7 | Unreachable code after `return` | info |

### 13.3 Output Format

```
[line <number>] <severity>: <message>

Examples:
[line 5] error: Undefined variable "𓃇"
[line 11] warning: Function "𓃑" expects 1 argument(s) but got 0
[line 14] warning: Return statement outside of function
[line 0] warning: Unused variable "𓃃"

4 issue(s): 1 error(s), 3 warning(s), 0 info(s)
```

---

## 14. Compiler Architecture

```
                    ┌──────────┐
  source.maat ─────→│  Lexer   │────→ Token[]
                    └──────────┘
                         │
                    ┌──────────┐
                    │  Parser  │────→ AST
                    └──────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
         ┌─────────┐          ┌─────────────┐
         │ Checker │          │ Interpreter │
         │(static) │          │ (execution) │
         └─────────┘          └─────────────┘
              │                     │
         Diagnostic[]          Program output
```

**Strict separation principle:**
- Lexer contains no parsing logic
- Parser contains no execution logic
- CLI contains no compiler internals

**Source structure:**

```
src/
├── index.ts               # CLI entry point
├── lexer/
│   ├── token.ts           # Token types + keyword table
│   └── lexer.ts           # Lexer (Unicode-aware)
├── parser/
│   ├── ast.ts             # AST nodes (Visitor pattern)
│   └── parser.ts          # Recursive descent parser
├── interpreter/
│   └── interpreter.ts     # Tree-walking interpreter
└── checker/
    ├── diagnostic.ts      # Diagnostic types + scope chain
    └── checker.ts         # Static checker
```

**Tech stack:** TypeScript → CommonJS, target ES2016, strict mode

---

## 15. Command-Line Usage

### 15.1 Installation

```bash
npm run build    # Compile TypeScript → dist/
npm link         # Register global command 'maat'
```

### 15.2 Commands

```bash
# Run a .maat program (check + execute)
maat <file.maat>

# Static check only (no execution)
maat --check <file.maat>
```

### 15.3 Sacred-Script Path Rules

The **filename stem** (excluding `.maat` extension) must consist entirely of hieroglyphic characters (U+13000–U+1342F). Violations produce an error:

```
Sacred-script violation: File name "test" contains non-sacred-script character U+74
Ma'at file paths must use only Egyptian hieroglyph characters (U+13000–U+1342F)
```

### 15.4 Shebang Support

`.maat` files may begin with `#!/usr/bin/env maat` (using the `#` comment syntax), allowing direct `./file.maat` execution on Unix-like systems.

---

## 16. Code Examples

### 16.1 Hello World — `𓂀/𓂀.maat`

```
𓂀("Hello, Ma-at!");
```

### 16.2 Arithmetic — `𓂀/𓈖.maat`

```
𓈖 𓃀 = 10;
𓈖 𓏏 = 3;
𓈖 𓃁 = 𓃀 + 𓏏 * 2;
𓂀(𓃁);    // 16 — multiplication precedes addition
```

### 16.3 FizzBuzz — `𓂀/𓃋.maat`

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

### 16.4 Factorial (Recursive) — `𓂀/𓂁.maat`

```
𓍢 factorial(n) {
  𓎡 (n <= 1) {
    𓇋 1;
  } 𓁐 {
    𓇋 n * factorial(n - 1);
  }
}
𓂀(factorial(7));  // 5040
```

### 16.5 Fibonacci (Recursive) — `𓂀/𓃍.maat`

```
𓍢 fib(n) {
  𓎡 (n <= 1) {
    𓇋 n;
  } 𓁐 {
    𓇋 fib(n - 1) + fib(n - 2);
  }
}
𓈖 i = 0;
𓍯 (i < 15) {
  𓂀(fib(i));
  i = i + 1;
}
```

### 16.6 Fibonacci (Iterative) — `𓂀/𓃀𓏏.maat`

```
𓈖 a = 0;
𓈖 b = 1;
𓈖 i = 0;
𓈖 n = 15;
𓍯 (i < n) {
  𓂀(a);
  𓈖 tmp = a + b;
  a = b;
  b = tmp;
  i = i + 1;
}
```

### 16.7 Sieve of Eratosthenes — `𓂀/𓃌.maat`

```
𓈖 n = 50;
𓈖 sieve = [];
𓈖 i = 0;

# Initialize array: mark all as true
𓍯 (i <= n) {
  sieve[i] = 𓆑;
  i = i + 1;
}

# Sieve
𓈖 i = 2;
𓍯 (i * i <= n) {
  𓎡 (sieve[i]) {
    𓈖 j = i * i;
    𓍯 (j <= n) {
      sieve[j] = 𓃽;
      j = j + i;
    }
  }
  i = i + 1;
}

# Output primes
𓈖 i = 2;
𓍯 (i <= n) {
  𓎡 (sieve[i]) {
    𓂀(i);
  }
  i = i + 1;
}
```

### 16.8 Comments — `𓂀/𓃓.maat`

```
// Line comment
𓈖 n = 1;

/* Block comment
   can span multiple lines
*/
𓂀(n); /* inline block comment */
n = n + 1; // trailing comment
𓂀(n);

# Hash comment (also usable as shebang)
```

---

## 17. Turing Completeness

Ma'at satisfies the three requirements for Turing completeness:

| Condition | Ma'at Support |
|-----------|---------------|
| **Conditional branching** | `𓎡` / `𓁐` (if/else) |
| **Looping** | `𓍯` (while) |
| **Mutable state** | `𓈖` variable declaration + `=` assignment + array index assignment |

Verified implementations (all possible in Ma'at):

| Program | Capability Verified |
|---------|---------------------|
| Fibonacci iterative | while + variable update |
| Fibonacci recursive | Function + self-recursion |
| Factorial recursive | Function + recursion + condition |
| FizzBuzz | Modulo + else-if chain |
| Sieve of Eratosthenes | Array + nested loops + conditions |
| Arbitrary while programs | μ-recursion → Turing complete |

---

> *"Ma'at is the ancient Egyptian concept of truth, balance, order, harmony, law, morality, and justice."*

---

**Version:** 1.0.0 | **Compiler:** TypeScript strict mode | **License:** Private
