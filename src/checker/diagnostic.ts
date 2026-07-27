export enum Severity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export class Diagnostic {
  constructor(
    public readonly severity: Severity,
    public readonly line: number,
    public readonly message: string,
  ) {}

  toString(): string {
    return `[line ${this.line}] ${this.severity}: ${this.message}`;
  }
}

class SymbolInfo {
  used = false;
}

class Scope {
  private symbols: Map<string, SymbolInfo> = new Map();

  define(name: string): void {
    this.symbols.set(name, new SymbolInfo());
  }

  markUsed(name: string): void {
    const info = this.symbols.get(name);
    if (info) info.used = true;
  }

  isDefined(name: string): boolean {
    return this.symbols.has(name);
  }

  getUnused(): string[] {
    const result: string[] = [];
    for (const [name, info] of this.symbols) {
      if (!info.used) result.push(name);
    }
    return result;
  }
}

interface FnSignature {
  params: string[];
  line: number;
}

export class ScopeChain {
  private scopes: Scope[] = [new Scope()];
  private functions: Map<string, FnSignature> = new Map();

  push(): void {
    this.scopes.push(new Scope());
  }

  pop(): string[] {
    const scope = this.scopes.pop()!;
    return scope.getUnused();
  }

  define(name: string): void {
    this.currentScope().define(name);
  }

  isDefined(name: string): boolean {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].isDefined(name)) return true;
    }
    return false;
  }

  markUsed(name: string): void {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].isDefined(name)) {
        this.scopes[i].markUsed(name);
        return;
      }
    }
  }

  defineFn(name: string, params: string[], line: number): void {
    this.functions.set(name, { params, line });
  }

  getFn(name: string): FnSignature | null {
    return this.functions.get(name) ?? null;
  }

  private currentScope(): Scope {
    return this.scopes[this.scopes.length - 1];
  }
}
