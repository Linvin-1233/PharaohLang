import * as fs from 'fs';
import * as path from 'path';

export enum TokenType {
  LET = 'LET',
  IF = 'IF',
  ELSE = 'ELSE',
  WHILE = 'WHILE',
  FN = 'FN',
  RETURN = 'RETURN',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  ASYNC = 'ASYNC',
  AWAIT = 'AWAIT',
  SPAWN = 'SPAWN',

  NUMBER = 'NUMBER',
  STRING = 'STRING',
  IDENTIFIER = 'IDENTIFIER',
  TYPE = 'TYPE',

  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  SLASH = 'SLASH',
  PERCENT = 'PERCENT',
  EQUAL = 'EQUAL',
  EQ_EQ = 'EQ_EQ',
  NOT_EQ = 'NOT_EQ',
  LESS = 'LESS',
  GREATER = 'GREATER',
  LESS_EQ = 'LESS_EQ',
  GREATER_EQ = 'GREATER_EQ',
  BANG = 'BANG',
  AND = 'AND',
  OR = 'OR',
  COLON = 'COLON',
  DOT = 'DOT',

  LEFT_PAREN = 'LEFT_PAREN',
  RIGHT_PAREN = 'RIGHT_PAREN',
  LEFT_BRACE = 'LEFT_BRACE',
  RIGHT_BRACE = 'RIGHT_BRACE',
  LEFT_BRACKET = 'LEFT_BRACKET',
  RIGHT_BRACKET = 'RIGHT_BRACKET',
  COMMA = 'COMMA',
  SEMICOLON = 'SEMICOLON',

  EOF = 'EOF',
}

const KEYWORD_NAME_TO_TYPE: Record<string, TokenType> = {
  let: TokenType.LET,
  if: TokenType.IF,
  else: TokenType.ELSE,
  while: TokenType.WHILE,
  fn: TokenType.FN,
  return: TokenType.RETURN,
  true: TokenType.TRUE,
  false: TokenType.FALSE,
  import: TokenType.IMPORT,
  export: TokenType.EXPORT,
  async: TokenType.ASYNC,
  await: TokenType.AWAIT,
  spawn: TokenType.SPAWN,
};

interface LangConfig {
  version: string;
  keywords: Record<string, string>;
  typeNames: Record<string, string>;
  builtins: Array<{ glyph: string; label: string; arity: number; impl: string }>;
}

let KEYWORD_CHARS: Map<string, TokenType> | null = null;
let LANG_CONFIG: LangConfig | null = null;

function loadConfig(): LangConfig {
  if (LANG_CONFIG) return LANG_CONFIG;

  const configPaths = [
    path.resolve(process.cwd(), 'maat-lang.json'),
    path.resolve(__dirname, '..', '..', 'maat-lang.json'),
    path.resolve(__dirname, '..', 'maat-lang.json'),
  ];

  for (const configPath of configPaths) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      LANG_CONFIG = JSON.parse(raw) as LangConfig;
      return LANG_CONFIG;
    } catch {
      // try next path
    }
  }

  throw new Error(
    'Cannot find maat-lang.json config file. Put it in the project root or working directory.',
  );
}

function buildKeywordMap(): Map<string, TokenType> {
  const config = loadConfig();
  const map = new Map<string, TokenType>();

  for (const [glyph, keywordName] of Object.entries(config.keywords)) {
    const tokenType = KEYWORD_NAME_TO_TYPE[keywordName];
    if (!tokenType) {
      throw new Error(`Unknown keyword "${keywordName}" for glyph "${glyph}" in maat-lang.json`);
    }
    map.set(glyph, tokenType);
  }

  return map;
}

export class Token {
  constructor(
    public readonly type: TokenType,
    public readonly lexeme: string,
    public readonly literal: unknown,
    public readonly line: number,
  ) {}
}

export function lookupKeyword(lexeme: string): TokenType | null {
  if (!KEYWORD_CHARS) KEYWORD_CHARS = buildKeywordMap();
  return KEYWORD_CHARS.get(lexeme) ?? null;
}

export function getLangConfig(): LangConfig {
  return loadConfig();
}
