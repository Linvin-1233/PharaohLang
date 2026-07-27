import * as fs from 'fs';
import * as path from 'path';
import { Lexer } from './lexer/lexer';
import { Parser } from './parser/parser';
import { Interpreter } from './interpreter/interpreter';
import { Checker } from './checker/checker';

function isHieroglyph(cp: number): boolean {
  return cp >= 0x13000 && cp <= 0x1342F;
}

function validateSacredPath(filePath: string): string | null {
  const parsed = path.parse(filePath);
  if (parsed.ext !== '.maat') {
    return `File extension must be ".maat"`;
  }

  const check = (part: string): string | null => {
    if (part.length === 0) return null;
    for (let i = 0; i < part.length;) {
      const cp = part.codePointAt(i)!;
      i += cp > 0xFFFF ? 2 : 1;
      if (!isHieroglyph(cp)) return `"${part}" contains non-sacred-script character U+${cp.toString(16).toUpperCase()}`;
    }
    return null;
  };

  const nameErr = check(parsed.name);
  if (nameErr) return `File name ${nameErr}`;

  return null;
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: pharaoh [--check] <file.maat>');
    process.exit(1);
  }

  let checkOnly = false;
  let fileArg = args[0];

  if (args[0] === '--check') {
    checkOnly = true;
    if (args.length < 2) {
      console.error('Usage: pharaoh --check <file.maat>');
      process.exit(1);
    }
    fileArg = args[1];
  }

  const filePath = path.resolve(fileArg);

  const sacredError = validateSacredPath(filePath);
  if (sacredError !== null) {
    console.error(`Sacred-script violation: ${sacredError}`);
    console.error('Ma\'at file paths must use only Egyptian hieroglyph characters (U+13000–U+1342F)');
    process.exit(1);
  }

  let source = '';
  try {
    source = fs.readFileSync(filePath, 'utf-8');
  } catch {
    console.error(`Error: Could not read file "${filePath}"`);
    process.exit(1);
  }

  const lexer = new Lexer(source);
  const tokens = lexer.scanTokens();

  if (lexer.errors.length > 0) {
    for (const err of lexer.errors) {
      console.error(err);
    }
    process.exit(1);
  }

  const parser = new Parser(tokens);
  const program = parser.parse();

  if (parser.errors.length > 0) {
    for (const err of parser.errors) {
      console.error(err);
    }
    process.exit(1);
  }

  const checker = new Checker();
  const diagnostics = checker.check(program);

  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');
  const infos = diagnostics.filter((d) => d.severity === 'info');

  const hasIssues = errors.length > 0 || warnings.length > 0 || infos.length > 0;

  if (hasIssues) {
    console.log('');
    for (const d of diagnostics) {
      console.log(d.toString());
    }
    console.log(
      `\n${diagnostics.length} issue(s): ${errors.length} error(s), ${warnings.length} warning(s), ${infos.length} info(s)`,
    );
  } else {
    console.log('No issues found.');
  }

  if (checkOnly) {
    if (errors.length > 0) process.exit(1);
    return;
  }

  const interpreter = new Interpreter();
  try {
    interpreter.interpret(program);
  } catch (e) {
    if (e instanceof Error) {
      console.error(`Runtime error: ${e.message}`);
    }
    process.exit(1);
  }
}

main();
