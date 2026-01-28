// api/utils/cql2parser.js
// Supports: =, !=, <, >, LIKE, IN, BETWEEN, AND, OR, NOT, parentheses

function tokenize(input) {
    const tokens = [];
    let i = 0;
  
    const isWs = (c) => /\s/.test(c);
    const isIdentStart = (c) => /[A-Za-z_]/.test(c);
    const isIdent = (c) => /[A-Za-z0-9_]/.test(c);
  
    while (i < input.length) {
      const c = input[i];
  
      if (isWs(c)) { i++; continue; }
  
      // punctuation
      if (c === '(' || c === ')' || c === ',') {
        tokens.push({ type: c, value: c }); i++; continue;
      }
  
      // operators
      if (c === '!' && input[i + 1] === '=') { tokens.push({ type: 'OP', value: '!=' }); i += 2; continue; }
      if (c === '=') { tokens.push({ type: 'OP', value: '=' }); i++; continue; }
      if (c === '<') { tokens.push({ type: 'OP', value: '<' }); i++; continue; }
      if (c === '>') { tokens.push({ type: 'OP', value: '>' }); i++; continue; }
  
      // string literal (single quotes)
      if (c === "'") {
        let j = i + 1;
        let s = '';
        while (j < input.length) {
          if (input[j] === "'" && input[j + 1] === "'") { // escaped ''
            s += "'";
            j += 2;
            continue;
          }
          if (input[j] === "'") break;
          s += input[j++];
        }
        if (j >= input.length || input[j] !== "'") throw new Error('Unterminated string literal');
        tokens.push({ type: 'STRING', value: s });
        i = j + 1;
        continue;
      }
  
      // number
      if (/[0-9]/.test(c)) {
        let j = i;
        while (j < input.length && /[0-9.]/.test(input[j])) j++;
        const raw = input.slice(i, j);
        const num = Number(raw);
        if (Number.isNaN(num)) throw new Error(`Invalid number: ${raw}`);
        tokens.push({ type: 'NUMBER', value: num });
        i = j;
        continue;
      }
  
      // identifier / keyword
      if (isIdentStart(c)) {
        let j = i + 1;
        while (j < input.length && isIdent(input[j])) j++;
        const word = input.slice(i, j);
        const upper = word.toUpperCase();
  
        const keywords = ['AND', 'OR', 'NOT', 'LIKE', 'IN', 'BETWEEN'];
        if (keywords.includes(upper)) tokens.push({ type: upper, value: upper });
        else tokens.push({ type: 'IDENT', value: word });
  
        i = j;
        continue;
      }
  
      throw new Error(`Unexpected character: ${c}`);
    }
  
    return tokens;
  }
  
  function parseCql2(input) {
    if (!input || !input.trim()) throw new Error('Filter must not be empty');
    const tokens = tokenize(input);
    let pos = 0;
  
    const peek = () => tokens[pos];
    const eat = (type) => {
      const t = tokens[pos];
      if (!t || t.type !== type) throw new Error(`Expected ${type} but got ${t ? t.type : 'EOF'}`);
      pos++;
      return t;
    };
  
    const parseLiteral = () => {
      const t = peek();
      if (!t) throw new Error('Expected literal but got EOF');
      if (t.type === 'STRING') { pos++; return { type: 'Literal', value: t.value }; }
      if (t.type === 'NUMBER') { pos++; return { type: 'Literal', value: t.value }; }
      // allow unquoted TRUE/FALSE/NULL if needed later
      throw new Error(`Expected literal but got ${t.type}`);
    };
  
    const parseIdentifier = () => {
      const t = eat('IDENT');
      return { type: 'Identifier', name: t.value };
    };
  
    const parsePredicate = () => {
      const left = parseIdentifier();
      const t = peek();
      if (!t) throw new Error('Expected operator but got EOF');
  
      if (t.type === 'OP') {
        const op = eat('OP').value;
        const right = parseLiteral();
        return { type: 'Compare', op, left, right };
      }
  
      if (t.type === 'LIKE') {
        eat('LIKE');
        const right = parseLiteral();
        return { type: 'Compare', op: 'LIKE', left, right };
      }
  
      if (t.type === 'IN') {
        eat('IN');
        eat('(');
        const values = [parseLiteral()];
        while (peek() && peek().type === ',') {
          eat(',');
          values.push(parseLiteral());
        }
        eat(')');
        return { type: 'In', left, values };
      }
  
      if (t.type === 'BETWEEN') {
        eat('BETWEEN');
        const low = parseLiteral();
        eat('AND');
        const high = parseLiteral();
        return { type: 'Between', left, low, high };
      }
  
      throw new Error(`Expected operator/LIKE/IN/BETWEEN but got ${t.type}`);
    };
  
    const parsePrimary = () => {
      if (peek() && peek().type === '(') {
        eat('(');
        const e = parseExpr();
        eat(')');
        return e;
      }
      return parsePredicate();
    };
  
    const parseNot = () => {
      if (peek() && peek().type === 'NOT') {
        eat('NOT');
        return { type: 'Not', expr: parseNot() };
      }
      return parsePrimary();
    };
  
    const parseAnd = () => {
      let left = parseNot();
      while (peek() && peek().type === 'AND') {
        eat('AND');
        const right = parseNot();
        left = { type: 'Logical', op: 'AND', left, right };
      }
      return left;
    };
  
    const parseExpr = () => {
      let left = parseAnd();
      while (peek() && peek().type === 'OR') {
        eat('OR');
        const right = parseAnd();
        left = { type: 'Logical', op: 'OR', left, right };
      }
      return left;
    };
  
    const ast = parseExpr();
    if (pos !== tokens.length) throw new Error(`Unexpected token at end: ${tokens[pos].type}`);
    return ast;
  }
  
  module.exports = { parseCql2 };
  