import { Token } from '../lexer/token';

export interface Stmt {
  accept<T>(visitor: StmtVisitor<T>): T;
}

export interface Expr {
  accept<T>(visitor: ExprVisitor<T>): T;
}

export interface StmtVisitor<T> {
  visitProgramStmt(stmt: ProgramStmt): T;
  visitLetStmt(stmt: LetStmt): T;
  visitExpressionStmt(stmt: ExpressionStmt): T;
  visitIfStmt(stmt: IfStmt): T;
  visitWhileStmt(stmt: WhileStmt): T;
  visitFnStmt(stmt: FnStmt): T;
  visitReturnStmt(stmt: ReturnStmt): T;
  visitBlockStmt(stmt: BlockStmt): T;
  visitImportStmt(stmt: ImportStmt): T;
  visitExportStmt(stmt: ExportStmt): T;
  visitSpawnStmt(stmt: SpawnStmt): T;
}

export interface ExprVisitor<T> {
  visitBinaryExpr(expr: BinaryExpr): T;
  visitUnaryExpr(expr: UnaryExpr): T;
  visitCallExpr(expr: CallExpr): T;
  visitAssignExpr(expr: AssignExpr): T;
  visitVariableExpr(expr: VariableExpr): T;
  visitLiteralExpr(expr: LiteralExpr): T;
  visitArrayLiteralExpr(expr: ArrayLiteralExpr): T;
  visitObjectLiteralExpr(expr: ObjectLiteralExpr): T;
  visitIndexExpr(expr: IndexExpr): T;
  visitIndexAssignExpr(expr: IndexAssignExpr): T;
  visitGetExpr(expr: GetExpr): T;
  visitSetExpr(expr: SetExpr): T;
  visitAwaitExpr(expr: AwaitExpr): T;
}

export class ProgramStmt implements Stmt {
  constructor(public readonly statements: Stmt[]) {}
  accept<T>(visitor: StmtVisitor<T>): T { return visitor.visitProgramStmt(this); }
}

export class LetStmt implements Stmt {
  constructor(
    public readonly name: Token,
    public readonly typeAnnotation: Token | null,
    public readonly initializer: Expr,
  ) {}
  accept<T>(visitor: StmtVisitor<T>): T { return visitor.visitLetStmt(this); }
}

export class ExpressionStmt implements Stmt {
  constructor(public readonly expression: Expr) {}
  accept<T>(visitor: StmtVisitor<T>): T { return visitor.visitExpressionStmt(this); }
}

export class IfStmt implements Stmt {
  constructor(
    public readonly condition: Expr,
    public readonly thenBranch: Stmt,
    public readonly elseBranch: Stmt | null,
  ) {}
  accept<T>(visitor: StmtVisitor<T>): T { return visitor.visitIfStmt(this); }
}

export class WhileStmt implements Stmt {
  constructor(public readonly condition: Expr, public readonly body: Stmt) {}
  accept<T>(visitor: StmtVisitor<T>): T { return visitor.visitWhileStmt(this); }
}

export class FnStmt implements Stmt {
  constructor(
    public readonly name: Token,
    public readonly params: Param[],
    public readonly returnType: Token | null,
    public readonly isAsync: boolean,
    public readonly body: BlockStmt,
  ) {}
  accept<T>(visitor: StmtVisitor<T>): T { return visitor.visitFnStmt(this); }
}

export class Param {
  constructor(
    public readonly name: Token,
    public readonly typeAnnotation: Token | null,
  ) {}
}

export class ReturnStmt implements Stmt {
  constructor(public readonly keyword: Token, public readonly value: Expr | null) {}
  accept<T>(visitor: StmtVisitor<T>): T { return visitor.visitReturnStmt(this); }
}

export class BlockStmt implements Stmt {
  constructor(public readonly statements: Stmt[]) {}
  accept<T>(visitor: StmtVisitor<T>): T { return visitor.visitBlockStmt(this); }
}

export class ImportStmt implements Stmt {
  constructor(public readonly path: Token) {}
  accept<T>(visitor: StmtVisitor<T>): T { return visitor.visitImportStmt(this); }
}

export class ExportStmt implements Stmt {
  constructor(public readonly declaration: Stmt) {}
  accept<T>(visitor: StmtVisitor<T>): T { return visitor.visitExportStmt(this); }
}

export class SpawnStmt implements Stmt {
  constructor(public readonly call: CallExpr) {}
  accept<T>(visitor: StmtVisitor<T>): T { return visitor.visitSpawnStmt(this); }
}

export class BinaryExpr implements Expr {
  constructor(
    public readonly left: Expr,
    public readonly operator: Token,
    public readonly right: Expr,
  ) {}
  accept<T>(visitor: ExprVisitor<T>): T { return visitor.visitBinaryExpr(this); }
}

export class UnaryExpr implements Expr {
  constructor(public readonly operator: Token, public readonly right: Expr) {}
  accept<T>(visitor: ExprVisitor<T>): T { return visitor.visitUnaryExpr(this); }
}

export class CallExpr implements Expr {
  constructor(
    public readonly callee: Expr,
    public readonly paren: Token,
    public readonly args: Expr[],
  ) {}
  accept<T>(visitor: ExprVisitor<T>): T { return visitor.visitCallExpr(this); }
}

export class AssignExpr implements Expr {
  constructor(public readonly name: Token, public readonly value: Expr) {}
  accept<T>(visitor: ExprVisitor<T>): T { return visitor.visitAssignExpr(this); }
}

export class VariableExpr implements Expr {
  constructor(public readonly name: Token) {}
  accept<T>(visitor: ExprVisitor<T>): T { return visitor.visitVariableExpr(this); }
}

export class LiteralExpr implements Expr {
  constructor(public readonly value: unknown) {}
  accept<T>(visitor: ExprVisitor<T>): T { return visitor.visitLiteralExpr(this); }
}

export class ArrayLiteralExpr implements Expr {
  constructor(public readonly elements: Expr[]) {}
  accept<T>(visitor: ExprVisitor<T>): T { return visitor.visitArrayLiteralExpr(this); }
}

export class ObjectLiteralExpr implements Expr {
  constructor(public readonly entries: Map<string, Expr>) {}
  accept<T>(visitor: ExprVisitor<T>): T { return visitor.visitObjectLiteralExpr(this); }
}

export class IndexExpr implements Expr {
  constructor(public readonly object: Expr, public readonly index: Expr, public readonly bracket: Token) {}
  accept<T>(visitor: ExprVisitor<T>): T { return visitor.visitIndexExpr(this); }
}

export class IndexAssignExpr implements Expr {
  constructor(
    public readonly object: Expr,
    public readonly index: Expr,
    public readonly value: Expr,
  ) {}
  accept<T>(visitor: ExprVisitor<T>): T { return visitor.visitIndexAssignExpr(this); }
}

export class GetExpr implements Expr {
  constructor(public readonly object: Expr, public readonly name: Token) {}
  accept<T>(visitor: ExprVisitor<T>): T { return visitor.visitGetExpr(this); }
}

export class SetExpr implements Expr {
  constructor(
    public readonly object: Expr,
    public readonly name: Token,
    public readonly value: Expr,
  ) {}
  accept<T>(visitor: ExprVisitor<T>): T { return visitor.visitSetExpr(this); }
}

export class AwaitExpr implements Expr {
  constructor(public readonly expression: Expr) {}
  accept<T>(visitor: ExprVisitor<T>): T { return visitor.visitAwaitExpr(this); }
}
