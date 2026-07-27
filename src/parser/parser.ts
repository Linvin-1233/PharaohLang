import { Token, TokenType } from '../lexer/token';
import {
  Stmt, Expr,
  ProgramStmt, LetStmt, ExpressionStmt, IfStmt, WhileStmt, FnStmt, ReturnStmt, BlockStmt,
  ImportStmt, ExportStmt, SpawnStmt,
  BinaryExpr, UnaryExpr, CallExpr, AssignExpr, VariableExpr, LiteralExpr,
  ArrayLiteralExpr, ObjectLiteralExpr, IndexExpr, IndexAssignExpr, GetExpr, SetExpr,
  AwaitExpr, Param,
} from './ast';

class ParseError extends Error {
  constructor(message: string) { super(message); }
}

export class Parser {
  private readonly tokens: Token[];
  private current = 0;
  public errors: string[] = [];

  constructor(tokens: Token[]) { this.tokens = tokens; }

  parse(): ProgramStmt {
    const statements: Stmt[] = [];
    while (!this.isAtEnd()) {
      try {
        const stmt = this.declaration();
        if (stmt !== null) statements.push(stmt);
      } catch (e) {
        if (e instanceof ParseError) this.synchronize();
        else throw e;
      }
    }
    return new ProgramStmt(statements);
  }

  private declaration(): Stmt | null {
    try {
      if (this.match(TokenType.EXPORT)) return this.exportDeclaration();
      if (this.match(TokenType.IMPORT)) return this.importDeclaration();
      if (this.match(TokenType.SPAWN)) return this.spawnStatement();
      if (this.match(TokenType.ASYNC)) return this.fnDeclaration(true);
      if (this.match(TokenType.FN)) return this.fnDeclaration(false);
      if (this.match(TokenType.LET)) return this.letDeclaration();
      return this.statement();
    } catch (e) {
      if (e instanceof ParseError) { this.synchronize(); return null; }
      throw e;
    }
  }

  private exportDeclaration(): ExportStmt {
    const decl = this.declaration();
    if (decl === null) throw this.error(this.previous(), 'Expected declaration after export');
    return new ExportStmt(decl);
  }

  private importDeclaration(): ImportStmt {
    const path = this.consume(TokenType.STRING, 'Expected module path string after import');
    this.consume(TokenType.SEMICOLON, 'Expected ";" after import');
    return new ImportStmt(path);
  }

  private spawnStatement(): SpawnStmt {
    const callee = this.primary();
    this.consume(TokenType.LEFT_PAREN, 'Expected "(" after spawn function');
    const call = this.finishCall(callee);
    this.consume(TokenType.SEMICOLON, 'Expected ";" after spawn');
    return new SpawnStmt(call);
  }

  private fnDeclaration(isAsync: boolean): FnStmt {
    const name = this.consume(TokenType.IDENTIFIER, 'Expected function name');
    this.consume(TokenType.LEFT_PAREN, 'Expected "(" after function name');

    const params: Param[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (params.length >= 255) this.error(this.peek(), 'Cannot have more than 255 parameters');
        const pName = this.consume(TokenType.IDENTIFIER, 'Expected parameter name');
        const pType = this.typeAnnotation();
        params.push(new Param(pName, pType));
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_PAREN, 'Expected ")" after parameters');
    const returnType = this.typeAnnotation();
    this.consume(TokenType.LEFT_BRACE, 'Expected "{" before function body');
    const body = new BlockStmt(this.blockStatements());

    return new FnStmt(name, params, returnType, isAsync, body);
  }

  private letDeclaration(): LetStmt {
    const name = this.consume(TokenType.IDENTIFIER, 'Expected variable name');
    const typeAnnot = this.typeAnnotation();

    let initializer: Expr;
    if (this.match(TokenType.EQUAL)) {
      initializer = this.expression();
    } else {
      initializer = new LiteralExpr(null);
    }

    this.consume(TokenType.SEMICOLON, 'Expected ";" after variable declaration');
    return new LetStmt(name, typeAnnot, initializer);
  }

  private typeAnnotation(): Token | null {
    if (this.match(TokenType.COLON)) {
      return this.consume(TokenType.IDENTIFIER, 'Expected type name after ":"');
    }
    return null;
  }

  private statement(): Stmt {
    if (this.match(TokenType.IF)) return this.ifStatement();
    if (this.match(TokenType.WHILE)) return this.whileStatement();
    if (this.match(TokenType.RETURN)) return this.returnStatement();
    if (this.match(TokenType.LEFT_BRACE)) return new BlockStmt(this.blockStatements());
    return this.expressionStatement();
  }

  private blockStatements(): Stmt[] {
    const statements: Stmt[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const stmt = this.declaration();
      if (stmt !== null) statements.push(stmt);
    }
    this.consume(TokenType.RIGHT_BRACE, 'Expected "}" after block');
    return statements;
  }

  private ifStatement(): IfStmt {
    this.consume(TokenType.LEFT_PAREN, 'Expected "(" after "if"');
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, 'Expected ")" after if condition');
    const thenBranch = this.statement();
    let elseBranch: Stmt | null = null;
    if (this.match(TokenType.ELSE)) elseBranch = this.statement();
    return new IfStmt(condition, thenBranch, elseBranch);
  }

  private whileStatement(): WhileStmt {
    this.consume(TokenType.LEFT_PAREN, 'Expected "(" after "while"');
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, 'Expected ")" after while condition');
    const body = this.statement();
    return new WhileStmt(condition, body);
  }

  private returnStatement(): ReturnStmt {
    const keyword = this.previous();
    let value: Expr | null = null;
    if (!this.check(TokenType.SEMICOLON) && !this.check(TokenType.RIGHT_BRACE)) {
      value = this.expression();
    }
    this.consume(TokenType.SEMICOLON, 'Expected ";" after return value');
    return new ReturnStmt(keyword, value);
  }

  private expressionStatement(): ExpressionStmt {
    const expr = this.expression();
    this.consume(TokenType.SEMICOLON, 'Expected ";" after expression');
    return new ExpressionStmt(expr);
  }

  private expression(): Expr { return this.assignment(); }

  private assignment(): Expr {
    const expr = this.or();

    if (this.match(TokenType.EQUAL)) {
      const equals = this.previous();
      const value = this.assignment();

      if (expr instanceof VariableExpr) return new AssignExpr(expr.name, value);
      if (expr instanceof IndexExpr) return new IndexAssignExpr(expr.object, expr.index, value);
      if (expr instanceof GetExpr) return new SetExpr(expr.object, expr.name, value);

      this.error(equals, 'Invalid assignment target');
    }

    return expr;
  }

  private or(): Expr {
    let expr = this.and();
    while (this.match(TokenType.OR)) {
      const op = this.previous();
      expr = new BinaryExpr(expr, op, this.and());
    }
    return expr;
  }

  private and(): Expr {
    let expr = this.equality();
    while (this.match(TokenType.AND)) {
      const op = this.previous();
      expr = new BinaryExpr(expr, op, this.equality());
    }
    return expr;
  }

  private equality(): Expr {
    let expr = this.comparison();
    while (this.match(TokenType.EQ_EQ, TokenType.NOT_EQ)) {
      const op = this.previous();
      expr = new BinaryExpr(expr, op, this.comparison());
    }
    return expr;
  }

  private comparison(): Expr {
    let expr = this.term();
    while (this.match(TokenType.LESS, TokenType.LESS_EQ, TokenType.GREATER, TokenType.GREATER_EQ)) {
      const op = this.previous();
      expr = new BinaryExpr(expr, op, this.term());
    }
    return expr;
  }

  private term(): Expr {
    let expr = this.factor();
    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const op = this.previous();
      expr = new BinaryExpr(expr, op, this.factor());
    }
    return expr;
  }

  private factor(): Expr {
    let expr = this.unary();
    while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.PERCENT)) {
      const op = this.previous();
      expr = new BinaryExpr(expr, op, this.unary());
    }
    return expr;
  }

  private unary(): Expr {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      const op = this.previous();
      return new UnaryExpr(op, this.unary());
    }
    return this.call();
  }

  private call(): Expr {
    let expr = this.primary();

    while (true) {
      if (this.match(TokenType.LEFT_PAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.LEFT_BRACKET)) {
        const index = this.expression();
        const bracket = this.consume(TokenType.RIGHT_BRACKET, 'Expected "]" after index');
        expr = new IndexExpr(expr, index, bracket);
      } else if (this.match(TokenType.DOT)) {
        const name = this.consume(TokenType.IDENTIFIER, 'Expected property name after "."');
        expr = new GetExpr(expr, name);
      } else {
        break;
      }
    }

    return expr;
  }

  finishCall(callee: Expr): CallExpr {
    const args: Expr[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (args.length >= 255) this.error(this.peek(), 'Cannot have more than 255 arguments');
        args.push(this.expression());
      } while (this.match(TokenType.COMMA));
    }
    const paren = this.consume(TokenType.RIGHT_PAREN, 'Expected ")" after arguments');
    return new CallExpr(callee, paren, args);
  }

  private primary(): Expr {
    if (this.match(TokenType.AWAIT)) return new AwaitExpr(this.primary());
    if (this.match(TokenType.TRUE)) return new LiteralExpr(true);
    if (this.match(TokenType.FALSE)) return new LiteralExpr(false);
    if (this.match(TokenType.NUMBER, TokenType.STRING)) return new LiteralExpr(this.previous().literal);
    if (this.match(TokenType.IDENTIFIER)) return new VariableExpr(this.previous());

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, 'Expected ")" after expression');
      return expr;
    }

    if (this.match(TokenType.LEFT_BRACKET)) {
      const elements: Expr[] = [];
      if (!this.check(TokenType.RIGHT_BRACKET)) {
        do { elements.push(this.expression()); }
        while (this.match(TokenType.COMMA));
      }
      this.consume(TokenType.RIGHT_BRACKET, 'Expected "]" after array elements');
      return new ArrayLiteralExpr(elements);
    }

    if (this.match(TokenType.LEFT_BRACE)) {
      const entries = new Map<string, Expr>();
      if (!this.check(TokenType.RIGHT_BRACE)) {
        do {
          let key: string;
          if (this.match(TokenType.IDENTIFIER)) {
            key = this.previous().lexeme;
          } else if (this.match(TokenType.STRING)) {
            key = this.previous().literal as string;
          } else {
            throw this.error(this.peek(), 'Expected property name');
          }
          this.consume(TokenType.COLON, 'Expected ":" after property name');
          const value = this.expression();
          entries.set(key, value);
        } while (this.match(TokenType.COMMA));
      }
      this.consume(TokenType.RIGHT_BRACE, 'Expected "}" after object literal');
      return new ObjectLiteralExpr(entries);
    }

    throw this.error(this.peek(), 'Expected expression');
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) { if (this.check(type)) { this.advance(); return true; } }
    return false;
  }

  private check(type: TokenType): boolean { return !this.isAtEnd() && this.peek().type === type; }
  private advance(): Token { if (!this.isAtEnd()) this.current++; return this.previous(); }
  private isAtEnd(): boolean { return this.peek().type === TokenType.EOF; }
  private peek(): Token { return this.tokens[this.current]; }
  private previous(): Token { return this.tokens[this.current - 1]; }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw this.error(this.peek(), message);
  }

  private error(token: Token, message: string): ParseError {
    const tag = token.type === TokenType.EOF ? 'end' : `"${token.lexeme}"`;
    this.errors.push(`[line ${token.line}] Parse error at ${tag}: ${message}`);
    return new ParseError(message);
  }

  private synchronize(): void {
    this.advance();
    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.SEMICOLON) return;
      switch (this.peek().type) {
        case TokenType.LET: case TokenType.FN: case TokenType.IF:
        case TokenType.WHILE: case TokenType.RETURN: case TokenType.IMPORT:
        case TokenType.EXPORT: case TokenType.ASYNC:
          return;
      }
      this.advance();
    }
  }
}
