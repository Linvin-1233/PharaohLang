import { Token, TokenType, lookupKeyword } from './token';

function isHieroglyph(cp: number): boolean {
  return cp >= 0x13000 && cp <= 0x1342F;
}

function isDigit(cp: number): boolean {
  return cp >= 0x30 && cp <= 0x39;
}

function isAlpha(cp: number): boolean {
  if (isHieroglyph(cp)) return true;
  if (cp >= 0x41 && cp <= 0x5A) return true;  // A-Z
  if (cp >= 0x61 && cp <= 0x7A) return true;  // a-z
  if (cp === 0x5F) return true;               // _
  return false;
}

function isAlphanumeric(cp: number): boolean {
  return isAlpha(cp) || isDigit(cp);
}

export class Lexer {
  private readonly source: string;
  private start = 0;
  private current = 0;
  private line = 1;
  public errors: string[] = [];

  constructor(source: string) {
    this.source = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  scanTokens(): Token[] {
    const tokens: Token[] = [];

    while (!this.isAtEnd()) {
      this.start = this.current;
      this.scanToken(tokens);
    }

    tokens.push(new Token(TokenType.EOF, '', null, this.line));
    return tokens;
  }

  private scanToken(tokens: Token[]): void {
    const cp = this.advance();

    switch (cp) {
      case 0x28: this.addToken(tokens, TokenType.LEFT_PAREN); break;
      case 0x29: this.addToken(tokens, TokenType.RIGHT_PAREN); break;
      case 0x7B: this.addToken(tokens, TokenType.LEFT_BRACE); break;
      case 0x7D: this.addToken(tokens, TokenType.RIGHT_BRACE); break;
      case 0x5B: this.addToken(tokens, TokenType.LEFT_BRACKET); break;
      case 0x5D: this.addToken(tokens, TokenType.RIGHT_BRACKET); break;
      case 0x2C: this.addToken(tokens, TokenType.COMMA); break;
      case 0x3B: this.addToken(tokens, TokenType.SEMICOLON); break;
      case 0x3A: this.addToken(tokens, TokenType.COLON); break;
      case 0x2E: this.addToken(tokens, TokenType.DOT); break;
      case 0x2B: this.addToken(tokens, TokenType.PLUS); break;
      case 0x2D: this.addToken(tokens, TokenType.MINUS); break;
      case 0x2A: this.addToken(tokens, TokenType.STAR); break;
      case 0x25: this.addToken(tokens, TokenType.PERCENT); break;

      case 0x21:
        this.addToken(tokens, this.match(0x3D) ? TokenType.NOT_EQ : TokenType.BANG);
        break;
      case 0x3D:
        this.addToken(tokens, this.match(0x3D) ? TokenType.EQ_EQ : TokenType.EQUAL);
        break;
      case 0x3C:
        this.addToken(tokens, this.match(0x3D) ? TokenType.LESS_EQ : TokenType.LESS);
        break;
      case 0x3E:
        this.addToken(tokens, this.match(0x3D) ? TokenType.GREATER_EQ : TokenType.GREATER);
        break;

      case 0x26:
        if (this.match(0x26)) {
          this.addToken(tokens, TokenType.AND);
        } else {
          this.error('Unexpected character "&"');
        }
        break;
      case 0x7C:
        if (this.match(0x7C)) {
          this.addToken(tokens, TokenType.OR);
        } else {
          this.error('Unexpected character "|"');
        }
        break;

      case 0x2F:
        if (this.match(0x2F)) {
          while (this.peek() !== 0x0A && !this.isAtEnd()) this.advance();
        } else if (this.match(0x2A)) {
          this.blockComment();
        } else {
          this.addToken(tokens, TokenType.SLASH);
        }
        break;

      case 0x23:
        while (this.peek() !== 0x0A && !this.isAtEnd()) this.advance();
        break;

      case 0x20:
      case 0x09:
      case 0x0A:
      case 0x0D:
        break;

      case 0x22:
        this.string(tokens, 0x22);
        break;
      case 0x27:
        this.string(tokens, 0x27);
        break;

      default:
        if (isDigit(cp)) {
          this.number(tokens);
        } else if (isAlpha(cp)) {
          this.identifier(tokens);
        } else {
          this.error(`Unexpected character "${String.fromCodePoint(cp)}"`);
        }
        break;
    }
  }

  private identifier(tokens: Token[]): void {
    while (isAlphanumeric(this.peek())) {
      this.advance();
    }

    const lexeme = this.source.slice(this.start, this.current);
    const keyword = lookupKeyword(lexeme);
    if (keyword !== null) {
      this.addToken(tokens, keyword);
    } else {
      this.addToken(tokens, TokenType.IDENTIFIER);
    }
  }

  private number(tokens: Token[]): void {
    while (isDigit(this.peek())) {
      this.advance();
    }

    if (this.peek() === 0x2E && isDigit(this.peekNext())) {
      this.advance();
      while (isDigit(this.peek())) {
        this.advance();
      }
    }

    const lexeme = this.source.slice(this.start, this.current);
    this.addToken(tokens, TokenType.NUMBER, parseFloat(lexeme));
  }

  private string(tokens: Token[], quote: number): void {
    while (this.peek() !== quote && this.peek() !== 0x0A && !this.isAtEnd()) {
      if (this.peek() === 0x5C) {
        this.advance();
      }
      this.advance();
    }

    if (this.isAtEnd() || this.peek() === 0x0A) {
      this.error('Unterminated string literal');
      return;
    }

    this.advance();

    const raw = this.source.slice(this.start + 1, this.current - 1);
    const value = this.unescapeString(raw);
    this.addToken(tokens, TokenType.STRING, value);
  }

  private unescapeString(raw: string): string {
    let result = '';
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === '\\' && i + 1 < raw.length) {
        switch (raw[i + 1]) {
          case 'n': result += '\n'; i++; break;
          case 't': result += '\t'; i++; break;
          case '\\': result += '\\'; i++; break;
          case '"': result += '"'; i++; break;
          case "'": result += "'"; i++; break;
          case 'r': result += '\r'; i++; break;
          default: result += '\\' + raw[i + 1]; i++; break;
        }
      } else {
        result += raw[i];
      }
    }
    return result;
  }

  private blockComment(): void {
    while (!this.isAtEnd()) {
      if (this.peek() === 0x2A) {
        this.advance();
        if (this.peek() === 0x2F) {
          this.advance();
          return;
        }
      } else {
        this.advance();
      }
    }

    this.error('Unterminated block comment');
  }

  private codePointAt(pos: number): number {
    if (pos >= this.source.length) return -1;
    return this.source.codePointAt(pos)!;
  }

  private codePointWidth(cp: number): number {
    return cp > 0xFFFF ? 2 : 1;
  }

  private peek(): number {
    return this.codePointAt(this.current);
  }

  private peekNext(): number {
    const cp = this.codePointAt(this.current);
    const nextPos = this.current + this.codePointWidth(cp);
    return this.codePointAt(nextPos);
  }

  private advance(): number {
    const cp = this.codePointAt(this.current);
    this.current += this.codePointWidth(cp);
    if (cp === 0x0A) {
      this.line++;
    }
    return cp;
  }

  private match(expected: number): boolean {
    if (this.codePointAt(this.current) !== expected) return false;
    this.current += this.codePointWidth(expected);
    return true;
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private addToken(tokens: Token[], type: TokenType, literal: unknown = null): void {
    const lexeme = this.source.slice(this.start, this.current);
    tokens.push(new Token(type, lexeme, literal, this.line));
  }

  private error(message: string): void {
    this.errors.push(`[line ${this.line}] Lex error: ${message}`);
  }
}
