import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { TokenType } from '../lexer/token';
import { getLangConfig } from '../lexer/token';
import { Lexer } from '../lexer/lexer';
import { Parser } from '../parser/parser';
import {
  Stmt, Expr,
  ProgramStmt, LetStmt, ExpressionStmt, IfStmt, WhileStmt, FnStmt, ReturnStmt, BlockStmt,
  ImportStmt, ExportStmt, SpawnStmt,
  StmtVisitor, ExprVisitor,
  BinaryExpr, UnaryExpr, CallExpr, AssignExpr, VariableExpr, LiteralExpr,
  ArrayLiteralExpr, ObjectLiteralExpr, IndexExpr, IndexAssignExpr, GetExpr, SetExpr,
  AwaitExpr, Param,
} from '../parser/ast';

class ReturnValue {
  constructor(public readonly value: unknown) {}
}

class Environment {
  private readonly values: Map<string, unknown> = new Map();
  private readonly exports: Set<string> = new Set();

  constructor(private readonly enclosing: Environment | null = null) {}

  define(name: string, value: unknown): void { this.values.set(name, value); }
  markExported(name: string): void { this.exports.add(name); }
  getExports(): Map<string, unknown> {
    const result = new Map<string, unknown>();
    for (const [name, value] of this.values) {
      if (this.exports.has(name)) result.set(name, value);
    }
    return result;
  }

  get(name: string): unknown {
    if (this.values.has(name)) return this.values.get(name);
    if (this.enclosing !== null) return this.enclosing.get(name);
    throw new Error(`Undefined name "${name}"`);
  }

  assign(name: string, value: unknown): void {
    if (this.values.has(name)) { this.values.set(name, value); return; }
    if (this.enclosing !== null) { this.enclosing.assign(name, value); return; }
    throw new Error(`Undefined name "${name}"`);
  }
}

interface FnValue {
  params: string[];
  body: BlockStmt;
  closure: Environment;
  isAsync: boolean;
}

interface NativeFnValue {
  arity: number;
  call: (args: unknown[]) => unknown;
}

function isNativeFn(v: unknown): v is NativeFnValue {
  return typeof v === 'object' && v !== null && 'call' in (v as Record<string, unknown>);
}
function isUserFn(v: unknown): v is FnValue {
  return typeof v === 'object' && v !== null && 'params' in (v as Record<string, unknown>);
}

type MaatObj = Record<string, unknown>;

export class Interpreter implements StmtVisitor<unknown>, ExprVisitor<unknown> {
  private readonly globals: Environment = new Environment();
  private environment: Environment;
  private currentModuleDir = '.';

  constructor() {
    this.environment = this.globals;
    this.registerBuiltins();
  }

  private registerBuiltins(): void {
    const config = getLangConfig();

    const impls: Record<string, (args: unknown[]) => unknown> = {
      print: (args) => { console.log(this.stringify(args[0])); return null; },
      readFile: (args) => fs.readFileSync(String(args[0]), 'utf-8'),
      writeFile: (args) => { fs.writeFileSync(String(args[0]), String(args[1])); return 0; },
      now: () => new Date().getTime(),
      parseInt: (args) => parseInt(String(args[0]), 10),
      sleep: (args) => new Promise((resolve) => setTimeout(() => resolve(null), Number(args[0]))),
      serve: (args) => {
        const port = Number(args[0]);
        const handler = args[1];
        if (!isUserFn(handler)) throw new Error('serve: second argument must be a function');

        const server = http.createServer((req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
          }

          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', () => {
            const url = new URL(req.url || '/', `http://localhost:${port}`);
            const requestObj: Record<string, unknown> = {
              method: req.method || 'GET',
              path: url.pathname,
              query: url.searchParams.toString(),
              body: body || null,
            };

            try {
              const result = this.callUserFn(handler as FnValue, [requestObj]);
              res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end(this.stringify(result));
            } catch (e) {
              res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end(String(e));
            }
          });
        });

        server.listen(port, () => {
          console.log(`[Ma'at] Server listening on http://localhost:${port}`);
        });
        return null;
      },
    };

    for (const builtin of config.builtins) {
      const impl = impls[builtin.impl];
      if (!impl) throw new Error(`Unknown builtin implementation "${builtin.impl}"`);
      this.globals.define(builtin.glyph, { arity: builtin.arity, call: impl } as NativeFnValue);
    }
  }

  private defineNative(name: string, arity: number, fn: (args: unknown[]) => unknown): void {
    this.globals.define(name, { arity, call: fn } as NativeFnValue);
  }

  interpret(program: ProgramStmt): unknown {
    try {
      return this.execute(program);
    } catch (e) {
      if (e instanceof ReturnValue) return e.value;
      throw e;
    }
  }

  getModuleExports(): Map<string, unknown> {
    return this.environment.getExports();
  }

  setModuleDir(dir: string): void { this.currentModuleDir = dir; }

  private execute(stmt: Stmt): unknown { return stmt.accept(this); }
  private evaluate(expr: Expr): unknown { return expr.accept(this); }

  visitProgramStmt(stmt: ProgramStmt): unknown {
    let result: unknown = null;
    for (const s of stmt.statements) result = this.execute(s);
    return result;
  }

  visitLetStmt(stmt: LetStmt): void {
    const value = this.evaluate(stmt.initializer);
    this.environment.define(stmt.name.lexeme, value);
  }

  visitExpressionStmt(stmt: ExpressionStmt): unknown { return this.evaluate(stmt.expression); }

  visitIfStmt(stmt: IfStmt): void {
    if (this.isTruthy(this.evaluate(stmt.condition))) this.execute(stmt.thenBranch);
    else if (stmt.elseBranch !== null) this.execute(stmt.elseBranch);
  }

  visitWhileStmt(stmt: WhileStmt): void {
    while (this.isTruthy(this.evaluate(stmt.condition))) this.execute(stmt.body);
  }

  visitFnStmt(stmt: FnStmt): void {
    const fn: FnValue = {
      params: stmt.params.map((p) => p.name.lexeme),
      body: stmt.body,
      closure: this.environment,
      isAsync: stmt.isAsync,
    };
    this.environment.define(stmt.name.lexeme, fn);
  }

  visitReturnStmt(stmt: ReturnStmt): void {
    const value = stmt.value !== null ? this.evaluate(stmt.value) : null;
    throw new ReturnValue(value);
  }

  visitBlockStmt(stmt: BlockStmt): unknown {
    const previous = this.environment;
    try {
      this.environment = new Environment(previous);
      let result: unknown = null;
      for (const s of stmt.statements) result = this.execute(s);
      return result;
    } finally {
      this.environment = previous;
    }
  }

  visitImportStmt(stmt: ImportStmt): void {
    const modulePath = path.resolve(this.currentModuleDir, stmt.path.literal as string);
    let source: string;
    try { source = fs.readFileSync(modulePath, 'utf-8'); }
    catch { throw new Error(`Cannot find module "${stmt.path.literal}"`); }

    const lexer = new Lexer(source);
    const tokens = lexer.scanTokens();
    const parser = new Parser(tokens);
    const program = parser.parse();

    const moduleInterpreter = new Interpreter();
    moduleInterpreter.setModuleDir(path.dirname(modulePath));
    moduleInterpreter.interpret(program);

    for (const [name, value] of moduleInterpreter.getModuleExports()) {
      this.environment.define(name, value);
    }
  }

  visitExportStmt(stmt: ExportStmt): void {
    if (stmt.declaration instanceof LetStmt) {
      this.visitLetStmt(stmt.declaration);
      this.environment.markExported(stmt.declaration.name.lexeme);
    } else if (stmt.declaration instanceof FnStmt) {
      this.visitFnStmt(stmt.declaration);
      this.environment.markExported(stmt.declaration.name.lexeme);
    } else {
      this.execute(stmt.declaration);
    }
  }

  visitSpawnStmt(stmt: SpawnStmt): unknown {
    const callee = this.evaluate(stmt.call.callee);
    const args = stmt.call.args.map((a) => this.evaluate(a));

    if (isNativeFn(callee)) {
      setTimeout(() => callee.call(args), 0);
    } else if (isUserFn(callee)) {
      setTimeout(() => this.callUserFn(callee, args), 0);
    }
    return null;
  }

  visitBinaryExpr(expr: BinaryExpr): unknown {
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.PLUS:
        if (typeof left === 'string' || typeof right === 'string') return this.stringify(left) + this.stringify(right);
        this.assertNumberOperands(expr.operator, left, right);
        return (left as number) + (right as number);
      case TokenType.MINUS: this.assertNumberOperands(expr.operator, left, right); return (left as number) - (right as number);
      case TokenType.STAR: this.assertNumberOperands(expr.operator, left, right); return (left as number) * (right as number);
      case TokenType.SLASH: this.assertNumberOperands(expr.operator, left, right); if ((right as number) === 0) throw new Error('Division by zero'); return (left as number) / (right as number);
      case TokenType.PERCENT: this.assertNumberOperands(expr.operator, left, right); return (left as number) % (right as number);
      case TokenType.LESS: this.assertNumberOperands(expr.operator, left, right); return (left as number) < (right as number);
      case TokenType.LESS_EQ: this.assertNumberOperands(expr.operator, left, right); return (left as number) <= (right as number);
      case TokenType.GREATER: this.assertNumberOperands(expr.operator, left, right); return (left as number) > (right as number);
      case TokenType.GREATER_EQ: this.assertNumberOperands(expr.operator, left, right); return (left as number) >= (right as number);
      case TokenType.EQ_EQ: return this.isEqual(left, right);
      case TokenType.NOT_EQ: return !this.isEqual(left, right);
      case TokenType.AND: return this.isTruthy(left) && this.isTruthy(right);
      case TokenType.OR: return this.isTruthy(left) || this.isTruthy(right);
    }
    return null;
  }

  visitUnaryExpr(expr: UnaryExpr): unknown {
    const right = this.evaluate(expr.right);
    switch (expr.operator.type) {
      case TokenType.MINUS: this.assertNumberOperand(expr.operator, right); return -(right as number);
      case TokenType.BANG: return !this.isTruthy(right);
    }
    return null;
  }

  visitCallExpr(expr: CallExpr): unknown {
    const callee = this.evaluate(expr.callee);
    const args = expr.args.map((a) => this.evaluate(a));

    if (isNativeFn(callee)) {
      if (args.length !== callee.arity) throw new Error(`Expected ${callee.arity} arguments but got ${args.length}`);
      return callee.call(args);
    }

    if (isUserFn(callee)) {
      if (args.length !== callee.params.length) throw new Error(`Expected ${callee.params.length} arguments but got ${args.length}`);
      const result = this.callUserFn(callee, args);
      if (callee.isAsync && result instanceof Promise) return result;
      return result;
    }

    throw new Error('Can only call functions');
  }

  private callUserFn(fn: FnValue, args: unknown[]): unknown {
    const previous = this.environment;
    try {
      this.environment = new Environment(fn.closure);
      for (let i = 0; i < fn.params.length; i++) this.environment.define(fn.params[i], args[i]);
      try { return this.execute(fn.body); }
      catch (e) { if (e instanceof ReturnValue) return e.value; throw e; }
    } finally { this.environment = previous; }
  }

  visitAssignExpr(expr: AssignExpr): unknown {
    const value = this.evaluate(expr.value);
    this.environment.assign(expr.name.lexeme, value);
    return value;
  }

  visitVariableExpr(expr: VariableExpr): unknown { return this.environment.get(expr.name.lexeme); }
  visitLiteralExpr(expr: LiteralExpr): unknown { return expr.value; }

  visitArrayLiteralExpr(expr: ArrayLiteralExpr): unknown { return expr.elements.map((e) => this.evaluate(e)); }

  visitObjectLiteralExpr(expr: ObjectLiteralExpr): unknown {
    const obj: MaatObj = {};
    for (const [key, valExpr] of expr.entries) obj[key] = this.evaluate(valExpr);
    return obj;
  }

  visitIndexExpr(expr: IndexExpr): unknown {
    const obj = this.evaluate(expr.object);
    const idx = this.evaluate(expr.index);
    if (Array.isArray(obj)) {
      if (typeof idx !== 'number') throw new Error('Array index must be a number');
      return (obj as unknown[])[idx];
    }
    if (typeof obj === 'object' && obj !== null) {
      const key = (typeof idx === 'number' && Number.isInteger(idx) && idx >= 0) ? String(idx) : this.stringify(idx);
      return (obj as MaatObj)[key];
    }
    throw new Error('Can only index arrays and objects');
  }

  visitIndexAssignExpr(expr: IndexAssignExpr): unknown {
    const obj = this.evaluate(expr.object);
    const idx = this.evaluate(expr.index);
    const val = this.evaluate(expr.value);
    if (Array.isArray(obj)) {
      if (typeof idx !== 'number') throw new Error('Array index must be a number');
      (obj as unknown[])[idx] = val;
      return val;
    }
    if (typeof obj === 'object' && obj !== null) {
      const key = (typeof idx === 'number' && Number.isInteger(idx) && idx >= 0) ? String(idx) : this.stringify(idx);
      (obj as MaatObj)[key] = val;
      return val;
    }
    throw new Error('Can only index arrays and objects');
  }

  visitGetExpr(expr: GetExpr): unknown {
    const obj = this.evaluate(expr.object);
    if (typeof obj === 'object' && obj !== null) {
      return (obj as MaatObj)[expr.name.lexeme];
    }
    throw new Error('Can only access properties on objects');
  }

  visitSetExpr(expr: SetExpr): unknown {
    const obj = this.evaluate(expr.object);
    const val = this.evaluate(expr.value);
    if (typeof obj === 'object' && obj !== null) {
      (obj as MaatObj)[expr.name.lexeme] = val;
      return val;
    }
    throw new Error('Can only set properties on objects');
  }

  visitAwaitExpr(expr: AwaitExpr): unknown {
    const promise = this.evaluate(expr.expression);
    if (promise instanceof Promise) {
      let result: unknown;
      let done = false;
      promise.then((v: unknown) => { result = v; done = true; });
      const start = Date.now();
      while (!done) {
        if (Date.now() - start > 30000) throw new Error('Await timed out');
      }
      return result;
    }
    return promise;
  }

  private isTruthy(value: unknown): boolean {
    if (value === null) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    return true;
  }

  private isEqual(a: unknown, b: unknown): boolean {
    if (a === null && b === null) return true;
    if (a === null) return false;
    return a === b;
  }

  private stringify(value: unknown): string {
    if (value === null) return 'null';
    if (typeof value === 'boolean') return value ? '\uD80C\uDF91' : '\uD80C\uDF7D';
    if (typeof value === 'number') { const t = String(value); return t.endsWith('.0') ? t.slice(0, -2) : t; }
    if (Array.isArray(value)) return '[' + value.map((v) => this.stringify(v)).join(', ') + ']';
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>).map(([k, v]) => `${k}: ${this.stringify(v)}`);
      return '{' + entries.join(', ') + '}';
    }
    return String(value);
  }

  private assertNumberOperands(op: { line: number }, l: unknown, r: unknown): void {
    if (typeof l === 'number' && typeof r === 'number') return;
    throw new Error(`[line ${op.line}] Operands must be numbers`);
  }

  private assertNumberOperand(op: { line: number }, o: unknown): void {
    if (typeof o === 'number') return;
    throw new Error(`[line ${op.line}] Operand must be a number`);
  }
}
