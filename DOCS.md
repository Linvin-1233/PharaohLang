# Ma'at (法老语言) 语言规范

## 目录

1. [概述](#1-概述)
2. [圣书体字母表](#2-圣书体字母表)
3. [词法结构](#3-词法结构)
4. [注释](#4-注释)
5. [数据类型](#5-数据类型)
6. [变量与作用域](#6-变量与作用域)
7. [运算符](#7-运算符)
8. [语句](#8-语句)
9. [函数](#9-函数)
10. [数组](#10-数组)
11. [完整语法](#11-完整语法)
12. [内置函数](#12-内置函数)
13. [静态检查器](#13-静态检查器)
14. [编译器架构](#14-编译器架构)
15. [命令行用法](#15-命令行用法)
16. [代码示例](#16-代码示例)
17. [图灵完备性](#17-图灵完备性)

---

## 1. 概述

Ma'at（古埃及语中的"真理、秩序"）是一门以**圣书体**（埃及象形文字）为核心标识符的编程语言。编译器用严格 TypeScript 编写，遵循经典的 Lexer → Parser → AST → Interpreter 流水线。

- **文件名后缀**: `.maat`
- **字符编码**: UTF-8
- **标识符**: 优先使用圣书体字符（范围 U+13000–U+1342F），也支持拉丁字母 A-Z、a-z 和下划线用于文档、互操作和测试
- **分号**: 语句必须以 `;` 结尾

---

## 2. 圣书体字母表

### 2.1 关键字

Ma'at 的 8 个关键字均为**单字符圣书体**，每个对应一个 Unicode 码点：

| 关键字 | 含义 | Unicode | UTF-16 代理对 | 字形 |
|--------|------|---------|---------------|------|
| `let` | 变量声明 | U+13216 | `\uD80C\uDE16` | 𓈖 |
| `if` | 条件分支 | U+133A1 | `\uD80C\uDFA1` | 𓎡 |
| `else` | 否则分支 | U+13310 | `\uD80C\uDF10` | 𓁐 |
| `while` | 循环 | U+1336F | `\uD80C\uDF6F` | 𓍯 |
| `fn` | 函数定义 | U+13362 | `\uD80C\uDF62` | 𓍢 |
| `return` | 返回值 | U+1330B | `\uD80C\uDF0B` | 𓇋 |
| `true` | 布尔真 | U+13391 | `\uD80C\uDF91` | 𓆑 |
| `false` | 布尔假 | U+1337D | `\uD80C\uDF7D` | 𓃽 |

### 2.2 内置函数

| 名称 | 功能 | Unicode | 字形 | 参数 |
|------|------|---------|------|------|
| print | 输出到控制台 | U+13080 | 𓂀 | 1 个参数 |

### 2.3 标识符可用范围

用户自定义标识符可使用**全部**埃及象形文字 Unicode 区块：**U+13000 ～ U+1342F**（共 1072 个可显示码位），但不能是上述 8 个关键字字符。同时支持拉丁字母 A–Z、a–z 和下划线 `_`。

> 示例标识符: `𓃀`, `𓏏`, `𓃁`, `𓂀𓃀𓏏`, `myVar`, `_counter`

---

## 3. 词法结构

### 3.1 数字字面量

仅支持**整数**，一个或多个 ASCII 数字 `0–9`。

```
42
0
9999
```

不支持小数、科学计数法或十六进制。

### 3.2 字符串字面量

支持**双引号** `"..."` 和**单引号** `'...'`。不能跨行。

```
"Hello, Ma'at!"
'单引号也是合法的'
```

#### 转义序列

| 转义 | 含义 |
|------|------|
| `\n` | 换行 |
| `\t` | 制表符 |
| `\r` | 回车 |
| `\\` | 反斜杠 |
| `\"` | 双引号 |
| `\'` | 单引号 |

未识别的转义序列（如 `\x`）会保持原样输出 `\x`。

### 3.3 布尔字面量

- `𓆑` — `true` (U+13391)
- `𓃽` — `false` (U+1337D)

### 3.4 标识符

标识符必须以字母（圣书体、A–Z、a–z 或 `_`）开头，后续可跟字母或数字。当一个标识符的完整字符串恰好匹配某个关键字时，关键字优先。

```
𓃀              // ✓ 有效标识符
𓃀𓏏            // ✓ 多字符标识符
my_var_42       // ✓ 拉丁标识符
𓈖              // ✗ 被解析为关键字 let，不是标识符
ʔhello          // ✗ 不是合法起始字符
```

### 3.5 空白字符

空格、制表符、换行符（LF/CR/CRLF）均被忽略。CRLF 和 CR 在词法分析前被规范化成 LF。

---

## 4. 注释

Ma'at 支持**三种**注释形式：

### 4.1 行注释 `//`

```
// 这是行注释，到行尾为止
𓈖 x = 5;  // 也可以跟在代码后面
```

### 4.2 块注释 `/* */`

```
/*
   跨行块注释
   p 注释掉整段代码
*/
𓈖 y = 10;
𓂀(/* 行内注释 */ y);
```

### 4.3 哈希注释 `#`

```
# 这也是行注释（到行尾结束）
# 支持 Unix shebang: #!/usr/bin/env maat
𓈖 z = 42;
```

哈希注释使 `.maat` 文件可以以 `#!/usr/bin/env maat` 开头，在类 Unix 系统上直接作为可执行文件运行。

---

## 5. 数据类型

### 5.1 运行时类型

| 类型 | 示例 | 说明 |
|------|------|------|
| `number` | `42`, `0`, `-7` | 整数（底层为 JavaScript number） |
| `string` | `"hello"`, `'world'` | 字符串 |
| `boolean` | `𓆑`, `𓃽` | 布尔值 |
| `array` | `[]`, `[1, 2, 3]` | 数组，动态，0 索引 |
| `function` | `𓍢 f(n) { ... }` | 一等函数 |
| `null` | `null` | 空值（默认返回值） |

### 5.2 真值判断

`if`、`while`、`!`、`&&`、`||` 判断真值时的规则：

| 值 | 真值？ |
|----|--------|
| `null` | **假** |
| `false` / `𓃽` | **假** |
| 数字 `0` | **假** |
| 空字符串 `""` | **假** |
| 其他所有值 | **真** |

### 5.3 相等判断

- `null == null` → `true`
- `null == 其他任何值` → `false`
- 其他比较使用 JavaScript 严格相等 `===`

### 5.4 类型强制规则

| 运算符 | 规则 |
|--------|------|
| `+` | 任一操作数为字符串则拼接，否则数值加 |
| `-` `*` `/` `%` | 两个操作数必须都是数字（否则运行时错误） |
| `<` `<=` `>` `>=` | 两个操作数必须都是数字 |
| `&&` `\|\|` | 按真值短路评估，返回布尔值 |
| `!` | 返回真值的布尔取反 |
| `-x`（一元） | 操作数必须是数字 |

---

## 6. 变量与作用域

### 6.1 变量声明

```
𓈖 name = expression;
```

- `𓈖`（let）声明一个变量
- 必须带初始化表达式 `= expr`
- 变量名是标识符

```
𓈖 x = 5;
𓈖 𓃀 = 10;
```

### 6.2 赋值

```
name = expression;
```

赋值会沿着词法作用域链查找并更新最近的绑定。

```
x = x + 1;
```

### 6.3 作用域

Ma'at 使用**块级词法作用域**。每个 `{ }` 块创建一个新作用域，内层可以访问外层变量，但外层不能访问内层变量。

```
𓈖 a = 1;
{
  𓈖 b = 2;     // b 只在此块内可见
  𓂀(a + b);    // 3 —— 可以访问外层的 a
}
𓂀(b);           // 运行时错误：未定义 b
```

函数调用时创建新的作用域，其父作用域为函数定义时的闭包环境。

---

## 7. 运算符

### 7.1 运算符优先级表（从低到高）

| 优先级 | 运算符 | 结合性 | 类别 |
|--------|--------|--------|------|
| 1 (最低) | `=` | 右 | 赋值 |
| 2 | `\|\|` | 左 | 逻辑或 |
| 3 | `&&` | 左 | 逻辑与 |
| 4 | `==` `!=` | 左 | 相等 |
| 5 | `<` `<=` `>` `>=` | 左 | 比较 |
| 6 | `+` `-` | 左 | 加减 |
| 7 | `*` `/` `%` | 左 | 乘除模 |
| 8 | `!` `-` （一元） | 右 | 一元 |
| 9 (最高) | `f()` `a[i]` | 左 | 调用/索引（后缀） |

### 7.2 运算符语义

| 运算符 | 含义 | 操作数类型 |
|--------|------|-----------|
| `+` | 加法/拼接 | 两个数字 或 至少一个字符串 |
| `-` | 减法 | 两个数字 |
| `*` | 乘法 | 两个数字 |
| `/` | 除法 | 两个数字（除零抛错） |
| `%` | 取模 | 两个数字 |
| `==` | 等于 | 任意 |
| `!=` | 不等于 | 任意 |
| `<` | 小于 | 两个数字 |
| `<=` | 小于等于 | 两个数字 |
| `>` | 大于 | 两个数字 |
| `>=` | 大于等于 | 两个数字 |
| `&&` | 逻辑与 | 任意（返回布尔） |
| `\|\|` | 逻辑或 | 任意（返回布尔） |
| `!` | 逻辑非 | 任意（返回布尔） |
| `-x` | 取负 | 数字 |

---

## 8. 语句

### 8.1 表达式语句

```
expression;
```

```
𓂀("hello");
x = x + 1;
```

### 8.2 块语句

```
{
  statement1;
  statement2;
  ...
}
```

### 8.3 条件语句

```
𓎡 (condition) {
  statements;
} 𓁐 {
  statements;    // else 分支可选
}
```

支持 `else if` 链：

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

### 8.4 循环语句

```
𓍯 (condition) {
  statements;
}
```

循环条件在每次迭代开始时求值。循环体可以包含 `break` 吗？目前不支持——仅支持 `while` 循环不变式和条件退出。

### 8.5 返回语句

```
𓇋 expression;
𓇋 ;            // 返回 null
```

- 必须位于函数体内，否则检查器报警告
- 不带表达式时返回 `null`

---

## 9. 函数

### 9.1 函数定义

```
𓍢 function_name(param1, param2, ...) {
  body;
}
```

- 参数列表可为空 `()`
- 最多 255 个参数
- 函数体是一个块 `{ ... }`

### 9.2 函数调用

```
function_name(arg1, arg2, ...);
```

- 参数从左到右求值
- 调用时参数个数必须与声明一致，否则检查器报警告
- 最多 255 个参数

### 9.3 闭包

函数捕获定义时的词法作用域（闭包）。调用时创建新作用域，以闭包为父作用域。

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

### 9.4 返回值

- 显式 `𓇋 value;` 返回指定值
- 函数末尾隐式返回 `null`

### 9.5 递归

函数可以递归调用自身：

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

## 10. 数组

### 10.1 数组字面量

```
[element1, element2, ...]
```

空数组：`[]`

```
𓈖 arr = [1, 2, 3];
𓈖 empty = [];
```

### 10.2 索引访问

```
array[index]
```

索引必须是数字，目标必须是数组。

```
𓂀(arr[0]);  // 1
```

### 10.3 索引赋值

```
array[index] = value;
```

```
arr[2] = 99;
𓂀(arr);  // [1, 2, 99]
```

---

## 11. 完整语法

以下为 Ma'at 的完整 EBNF 语法（起始符号：`Program`）：

```ebnf
Program          ::= Declaration*

Declaration      ::= FnDeclaration | LetDeclaration | Statement

FnDeclaration    ::= "𓍢" IDENTIFIER "(" Parameters? ")" Block
Parameters       ::= IDENTIFIER ("," IDENTIFIER)*             【最多 255 个】

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
                     -- 赋值目标：VariableExpr 或 IndexExpr
                     -- 其他目标抛出 "Invalid assignment target"

Or               ::= And ("||" And)*

And              ::= Equality ("&&" Equality)*

Equality         ::= Comparison (("==" | "!=") Comparison)*

Comparison       ::= Term (("<" | "<=" | ">" | ">=") Term)*

Term             ::= Factor (("+" | "-") Factor)*

Factor           ::= Unary (("*" | "/" | "%") Unary)*

Unary            ::= ("!" | "-") Unary | Call

Call             ::= Primary ( "(" Arguments? ")" | "[" Expression "]" )*

Arguments        ::= Expression ("," Expression)*              【最多 255 个】

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

## 12. 内置函数

### 12.1 `𓂀` — print

```
𓂀(expression);
```

将参数的字符串表示输出到控制台（`console.log`），返回 `null`。

**字符串化规则：**

| 值 | 输出 |
|----|------|
| `null` | `null` |
| `true` / `𓆑` | `𓆑` |
| `false` / `𓃽` | `𓃽` |
| 数字 | 十进制；若以 `.0` 结尾则去除 `.0` |
| 字符串 | 保持原样 |
| 数组 | `[elem1, elem2, ...]`（递归） |
| 其他 | JavaScript `String(value)` |

---

## 13. 静态检查器

编译器的静态分析模块（`src/checker/`）在解释执行**之前**对 AST 进行分析，输出诊断信息。

### 13.1 严重级别

| 级别 | 含义 | 退出行为 |
|------|------|----------|
| **error** | 必须修复 | `--check` 模式退出码 1 |
| **warning** | 建议修复 | 不影响退出码 |
| **info** | 信息 | 不影响退出码 |

### 13.2 检查项

| # | 检查 | 级别 |
|---|------|------|
| 1 | 使用未定义的变量 | error |
| 2 | 给未定义的变量赋值 | error |
| 3 | 定义但从未使用的变量/参数 | warning |
| 4 | 变量重复定义（shadowing） | warning |
| 5 | 函数调用参数个数不匹配 | warning |
| 6 | 在函数外使用 `return` | warning |
| 7 | `return` 后的不可达代码 | info |

### 13.3 输出格式

```
[line <行号>] <severity>: <message>

示例:
[line 5] error: Undefined variable "𓃇"
[line 11] warning: Function "𓃑" expects 1 argument(s) but got 0
[line 14] warning: Return statement outside of function
[line 0] warning: Unused variable "𓃃"

4 issue(s): 1 error(s), 3 warning(s), 0 info(s)
```

---

## 14. 编译器架构

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
         │(静态分析) │          │  (执行)     │
         └─────────┘          └─────────────┘
              │                     │
         Diagnostic[]          程序输出
```

**严格分离原则：**
- 词法分析器不含解析逻辑
- 解析器不含执行逻辑
- CLI 不含编译器内部逻辑

**源码结构：**

```
src/
├── index.ts               # CLI 入口
├── lexer/
│   ├── token.ts           # Token 类型 + 关键字表
│   └── lexer.ts           # 词法分析器（Unicode 感知）
├── parser/
│   ├── ast.ts             # AST 节点（访问者模式）
│   └── parser.ts          # 递归下降解析器
├── interpreter/
│   └── interpreter.ts     # 树遍历解释器
└── checker/
    ├── diagnostic.ts      # 诊断类型 + 作用域链
    └── checker.ts         # 静态检查器
```

**技术栈：** TypeScript → CommonJS，目标 ES2016，严格模式

---

## 15. 命令行用法

### 15.1 安装

```bash
npm run build    # 编译 TypeScript → dist/
npm link         # 注册全局命令 maat
```

### 15.2 命令

```bash
# 运行 .maat 程序（检查 + 执行）
maat <file.maat>

# 仅静态检查（不执行）
maat --check <file.maat>
```

### 15.3 圣书体路径规则

`.maat` 文件的**文件名主体**（不含 `.maat` 扩展名）必须全部由圣书体字符（U+13000–U+1342F）组成。违反则报错：

```
Sacred-script violation: File name "test" contains non-sacred-script character U+74
Ma'at file paths must use only Egyptian hieroglyph characters (U+13000–U+1342F)
```

### 15.4 Shebang 支持

`.maat` 文件可以以 `#!/usr/bin/env maat` 开头（利用 `#` 注释），在类 Unix 系统上可以直接 `./file.maat` 执行。

---

## 16. 代码示例

### 16.1 Hello World — `𓂀/𓂀.maat`

```
𓂀("Hello, Ma-at!");
```

### 16.2 算术 — `𓂀/𓈖.maat`

```
𓈖 𓃀 = 10;
𓈖 𓏏 = 3;
𓈖 𓃁 = 𓃀 + 𓏏 * 2;
𓂀(𓃁);    // 16 —— 乘法优先于加法
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

### 16.4 阶乘（递归） — `𓂀/𓂁.maat`

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

### 16.5 斐波那契（递归） — `𓂀/𓃍.maat`

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

### 16.6 斐波那契（迭代） — `𓂀/𓃀𓏏.maat`

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

### 16.7 质数筛（埃拉托斯特尼） — `𓂀/𓃌.maat`

```
𓈖 n = 50;
𓈖 sieve = [];
𓈖 i = 0;

# 初始化数组：全部标记为 true
𓍯 (i <= n) {
  sieve[i] = 𓆑;
  i = i + 1;
}

# 筛法
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

# 输出质数
𓈖 i = 2;
𓍯 (i <= n) {
  𓎡 (sieve[i]) {
    𓂀(i);
  }
  i = i + 1;
}
```

### 16.8 注释 — `𓂀/𓃓.maat`

```
// 行注释
𓈖 n = 1;

/* 块注释
   可以跨行
*/
𓂀(n); /* 行内块注释 */
n = n + 1; // 行尾注释
𓂀(n);

# 哈希注释（也可用作 shebang）
```

---

## 17. 图灵完备性

Ma'at 满足图灵完备的三个必要条件：

| 条件 | Ma'at 支持 |
|------|-----------|
| **条件分支** | `𓎡` / `𓁐` （if/else） |
| **循环** | `𓍯` （while） |
| **可变状态** | `𓈖` 变量声明 + `=` 赋值 + 数组索引赋值 |

实际验证（均可在 Ma'at 中实现）：

| 程序 | 验证能力 |
|------|----------|
| 斐波那契迭代 | while + 变量更新 |
| 斐波那契递归 | 函数定义 + 自递归 |
| 阶乘递归 | 函数 + 递归 + 条件 |
| FizzBuzz | 取模 + else-if 链 |
| 埃拉托斯特尼筛法 | 数组 + 嵌套循环 + 条件 |
| 任意 while 程序 | μ-递归 → 图灵完备 |

---

> *"Ma'at is the ancient Egyptian concept of truth, balance, order, harmony, law, morality, and justice."*

---

**版本:** 1.0.0 | **编译器:** TypeScript strict mode | **协议:** 私有
