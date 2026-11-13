// Tiny Python-flavoured highlighter: enough colour to read code, no library.

export type TokenKind = "kw" | "fn" | "str" | "num" | "punct" | "comment" | "type" | "plain";
export interface Token {
  text: string;
  kind: TokenKind;
}

const KEYWORDS = new Set([
  "def", "for", "in", "if", "elif", "else", "while", "return", "from", "import",
  "class", "True", "False", "None", "and", "or", "not", "del", "break", "continue", "lambda",
]);
const TYPES = new Set(["Counter", "float", "int", "str", "list", "dict", "set"]);

export function tokenizeLine(line: string): Token[] {
  const hash = line.search(/#(?=(?:[^"']|"[^"]*"|'[^']*')*$)/);
  const code = hash >= 0 ? line.slice(0, hash) : line;
  const out: Token[] = [];
  const re = /("[^"]*"|'[^']*')|([A-Za-z_]\w*)(?=\()|([A-Za-z_]\w*)|(\d+(?:\.\d+)?)|(\s+)|([^\sA-Za-z_\d"']+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    let kind: TokenKind = "plain";
    if (m[1]) kind = "str";
    else if (m[2]) kind = TYPES.has(m[2]) ? "type" : "fn";
    else if (m[3]) kind = KEYWORDS.has(m[3]) ? "kw" : TYPES.has(m[3]) ? "type" : "plain";
    else if (m[4]) kind = "num";
    else if (m[6]) kind = "punct";
    out.push({ text: m[0], kind });
  }
  if (hash >= 0) out.push({ text: line.slice(hash), kind: "comment" });
  return out;
}

export const TOKEN_CLASS: Record<TokenKind, string> = {
  kw: "text-[#b6a9ff]",
  fn: "text-[#7cc7ff]",
  str: "text-teal",
  num: "text-amber",
  punct: "text-dim",
  comment: "text-dim italic",
  type: "text-teal",
  plain: "text-[#d6dae3]",
};
