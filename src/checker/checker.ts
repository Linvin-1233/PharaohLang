import {
  Stmt, Expr, StmtVisitor, ExprVisitor,
  ProgramStmt, LetStmt, ExpressionStmt, IfStmt, WhileStmt, FnStmt, ReturnStmt, BlockStmt,
  ImportStmt, ExportStmt, SpawnStmt,
  BinaryExpr, UnaryExpr, CallExpr, AssignExpr, VariableExpr, LiteralExpr,
  ArrayLiteralExpr, ObjectLiteralExpr, IndexExpr, IndexAssignExpr, GetExpr, SetExpr,
  AwaitExpr, Param,
} from '../parser/ast';
import { TokenType, getLangConfig } from '../lexer/token';
import { Diagnostic, Severity, ScopeChain } from './diagnostic';

export class Checker implements StmtVisitor<void>, ExprVisitor<void> {
  private diagnostics: Diagnostic[] = [];
  private scopes: ScopeChain = new ScopeChain();
  private insideFunction = false;
  private hasReturned = false;

  check(program: ProgramStmt): Diagnostic[] {
    this.diagnostics = [];
    this.scopes = new ScopeChain();
    this.insideFunction = false;
    this.hasReturned = false;

    const config = getLangConfig();
    for (const builtin of config.builtins) {
      this.scopes.define(builtin.glyph);
      this.scopes.markUsed(builtin.glyph);
    }

    this.visitProgramStmt(program);

    const topUnused = this.scopes.pop();
    for (const name of topUnused) this.report(Severity.WARNING, 0, `Unused variable "${name}"`);
    this.diagnostics.sort((a, b) => a.line - b.line);
    return this.diagnostics;
  }

  private report(severity: Severity, line: number, message: string): void {
    this.diagnostics.push(new Diagnostic(severity, line, message));
  }

  visitProgramStmt(stmt: ProgramStmt): void { for (const s of stmt.statements) s.accept(this); }

  visitLetStmt(stmt: LetStmt): void {
    const name = stmt.name.lexeme;
    if (this.scopes.isDefined(name)) this.report(Severity.WARNING, stmt.name.line, `Variable "${name}" already defined, shadowing`);
    stmt.initializer.accept(this);
    this.scopes.define(name);
  }

  visitExpressionStmt(stmt: ExpressionStmt): void {
    if (this.hasReturned) this.report(Severity.INFO, 0, 'Unreachable code after return');
    stmt.expression.accept(this);
  }

  visitIfStmt(stmt: IfStmt): void {
    stmt.condition.accept(this);
    this.scopes.push();
    stmt.thenBranch.accept(this);
    const thenUnused = this.scopes.pop();
    for (const name of thenUnused) this.report(Severity.WARNING, 0, `Unused variable "${name}" in if branch`);
    if (stmt.elseBranch) {
      this.scopes.push();
      stmt.elseBranch.accept(this);
      for (const name of this.scopes.pop()) this.report(Severity.WARNING, 0, `Unused variable "${name}" in else branch`);
    }
  }

  visitWhileStmt(stmt: WhileStmt): void {
    stmt.condition.accept(this);
    this.scopes.push();
    const savedReturned = this.hasReturned;
    this.hasReturned = false;
    stmt.body.accept(this);
    for (const name of this.scopes.pop()) this.report(Severity.WARNING, 0, `Unused variable "${name}" in while body`);
    this.hasReturned = savedReturned;
  }

  visitFnStmt(stmt: FnStmt): void {
    const name = stmt.name.lexeme;
    const paramNames = stmt.params.map((p) => p.name.lexeme);
    this.scopes.defineFn(name, paramNames, stmt.name.line);
    this.scopes.define(name);

    this.scopes.push();
    const savedInside = this.insideFunction;
    this.insideFunction = true;
    this.hasReturned = false;

    for (const p of stmt.params) this.scopes.define(p.name.lexeme);
    stmt.body.accept(this);

    for (const n of this.scopes.pop()) this.report(Severity.WARNING, 0, `Unused parameter "${n}" in function "${name}"`);
    this.insideFunction = savedInside;
    this.hasReturned = false;
  }

  visitReturnStmt(stmt: ReturnStmt): void {
    if (!this.insideFunction) this.report(Severity.WARNING, stmt.keyword.line, 'Return statement outside of function');
    if (stmt.value) stmt.value.accept(this);
    this.hasReturned = true;
  }

  visitBlockStmt(stmt: BlockStmt): void {
    this.scopes.push();
    for (const s of stmt.statements) s.accept(this);
    for (const name of this.scopes.pop()) this.report(Severity.WARNING, 0, `Unused variable "${name}" in block`);
  }

  visitImportStmt(_stmt: ImportStmt): void {}
  visitExportStmt(stmt: ExportStmt): void { stmt.declaration.accept(this); }

  visitSpawnStmt(stmt: SpawnStmt): void {
    stmt.call.callee.accept(this);
    for (const a of stmt.call.args) a.accept(this);
  }

  visitBinaryExpr(expr: BinaryExpr): void { expr.left.accept(this); expr.right.accept(this); }
  visitUnaryExpr(expr: UnaryExpr): void { expr.right.accept(this); }

  visitCallExpr(expr: CallExpr): void {
    expr.callee.accept(this);
    for (const arg of expr.args) arg.accept(this);
    if (expr.callee instanceof VariableExpr) {
      const sig = this.scopes.getFn(expr.callee.name.lexeme);
      if (sig && expr.args.length !== sig.params.length) {
        this.report(Severity.WARNING, expr.paren.line, `Function "${expr.callee.name.lexeme}" expects ${sig.params.length} argument(s) but got ${expr.args.length}`);
      }
    }
  }

  visitAssignExpr(expr: AssignExpr): void {
    const name = expr.name.lexeme;
    if (!this.scopes.isDefined(name)) this.report(Severity.ERROR, expr.name.line, `Assignment to undefined variable "${name}"`);
    this.scopes.markUsed(name);
    expr.value.accept(this);
  }

  visitVariableExpr(expr: VariableExpr): void {
    const name = expr.name.lexeme;
    if (!this.scopes.isDefined(name)) this.report(Severity.ERROR, expr.name.line, `Undefined variable "${name}"`);
    this.scopes.markUsed(name);
  }

  visitLiteralExpr(_expr: LiteralExpr): void {}

  visitArrayLiteralExpr(expr: ArrayLiteralExpr): void { for (const e of expr.elements) e.accept(this); }

  visitObjectLiteralExpr(expr: ObjectLiteralExpr): void {
    for (const [, val] of expr.entries) val.accept(this);
  }

  visitIndexExpr(expr: IndexExpr): void { expr.object.accept(this); expr.index.accept(this); }

  visitIndexAssignExpr(expr: IndexAssignExpr): void {
    expr.object.accept(this); expr.index.accept(this); expr.value.accept(this);
  }

  visitGetExpr(expr: GetExpr): void { expr.object.accept(this); }

  visitSetExpr(expr: SetExpr): void {
    expr.object.accept(this); expr.value.accept(this);
  }

  visitAwaitExpr(expr: AwaitExpr): void { expr.expression.accept(this); }
}
