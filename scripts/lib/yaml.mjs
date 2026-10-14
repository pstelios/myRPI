// A small YAML subset parser: block maps and sequences, flow maps and sequences, plain and
// quoted scalars, comments, integers, booleans, and null. Anything else fails loudly with a line number.

export class YamlError extends Error {}

function fail(message, line) {
  throw new YamlError(`YAML line ${line}: ${message}`);
}

// Removes a trailing comment that is outside quotes.
function stripComment(text) {
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) {
        if (quote === "'" && text[i + 1] === "'") i += 1;
        else quote = null;
      } else if (ch === '\\' && quote === '"') i += 1;
    } else if (ch === '"' || ch === "'") {
      if (i === 0 || /[\s[{,:]/.test(text[i - 1])) quote = ch;
    } else if (ch === '#' && (i === 0 || /\s/.test(text[i - 1]))) {
      return text.slice(0, i).trimEnd();
    }
  }
  return text.trimEnd();
}

function plainScalar(raw) {
  const s = raw.trim();
  if (s === '' || s === '~' || s === 'null') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s)) return Number(s);
  return s;
}

// Parses a flow value (scalar, quoted string, {map}, or [sequence]) starting at text[pos].
function parseFlow(text, line) {
  let pos = 0;
  const ws = () => { while (pos < text.length && /\s/.test(text[pos])) pos += 1; };

  function quoted() {
    const q = text[pos];
    pos += 1;
    let out = '';
    while (pos < text.length) {
      const ch = text[pos];
      if (q === "'" && ch === "'") {
        if (text[pos + 1] === "'") { out += "'"; pos += 2; continue; }
        pos += 1;
        return out;
      }
      if (q === '"' && ch === '"') { pos += 1; return out; }
      if (q === '"' && ch === '\\') {
        const next = text[pos + 1];
        const map = { n: '\n', t: '\t', '"': '"', '\\': '\\', '/': '/' };
        if (!(next in map)) fail(`unsupported escape \\${next}`, line);
        out += map[next];
        pos += 2;
        continue;
      }
      out += ch;
      pos += 1;
    }
    return fail('unterminated quoted string', line);
  }

  function scalar(stops) {
    ws();
    if (text[pos] === '"' || text[pos] === "'") return quoted();
    let start = pos;
    while (pos < text.length && !stops.includes(text[pos])) pos += 1;
    return plainScalar(text.slice(start, pos));
  }

  function value(stops) {
    ws();
    if (text[pos] === '{') return map();
    if (text[pos] === '[') return seq();
    return scalar(stops);
  }

  function map() {
    pos += 1;
    const out = {};
    for (;;) {
      ws();
      if (text[pos] === '}') { pos += 1; return out; }
      if (pos >= text.length) fail('unclosed {', line);
      const key = scalar([':', ',', '}']);
      if (text[pos] !== ':') fail(`expected ":" after key ${key}`, line);
      pos += 1;
      out[String(key)] = value([',', '}']);
      ws();
      if (text[pos] === ',') pos += 1;
      else if (text[pos] !== '}') fail('expected "," or "}"', line);
    }
  }

  function seq() {
    pos += 1;
    const out = [];
    for (;;) {
      ws();
      if (text[pos] === ']') { pos += 1; return out; }
      if (pos >= text.length) fail('unclosed [', line);
      out.push(value([',', ']']));
      ws();
      if (text[pos] === ',') pos += 1;
      else if (text[pos] !== ']') fail('expected "," or "]"', line);
    }
  }

  const result = value([]);
  ws();
  if (pos < text.length) fail(`unexpected text "${text.slice(pos)}"`, line);
  return result;
}

// Splits "key: value" at the first ": " (or a trailing ":") outside quotes.
function splitKey(content, line) {
  let quote = null;
  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    if (quote) { if (ch === quote) quote = null; continue; }
    if ((ch === '"' || ch === "'") && i === 0) { quote = ch; continue; }
    if (ch === ':' && (i === content.length - 1 || content[i + 1] === ' ')) {
      let key = content.slice(0, i).trim();
      if (/^(["']).*\1$/.test(key)) key = key.slice(1, -1);
      return [key, content.slice(i + 1).trim()];
    }
  }
  return fail(`expected "key: value", got "${content}"`, line);
}

export function parseYaml(source, firstLine = 1) {
  const lines = [];
  source.split(/\r?\n/).forEach((raw, i) => {
    if (/^\s*(#.*)?$/.test(raw)) return;
    if (/\t/.test(raw.match(/^\s*/)[0])) fail('tabs are not allowed for indentation', firstLine + i);
    const text = stripComment(raw);
    if (!text.trim()) return;
    lines.push({ indent: text.match(/^ */)[0].length, content: text.trim(), line: firstLine + i });
  });
  let index = 0;

  function inlineValue(text, line) {
    if (text === '|' || text === '>' || /^[|>][-+]?$/.test(text)) fail('block scalars are not supported', line);
    return parseFlow(text, line);
  }

  function block(indent) {
    const first = lines[index];
    if (!first || first.indent !== indent) return null;
    return first.content.startsWith('- ') || first.content === '-' ? sequence(indent) : mapping(indent);
  }

  function nested(parentIndent, line, allowSameIndentSeq) {
    const next = lines[index];
    if (next && next.indent > parentIndent) return block(next.indent);
    if (allowSameIndentSeq && next && next.indent === parentIndent && next.content.startsWith('- ')) return sequence(parentIndent);
    void line;
    return null;
  }

  function mapping(indent) {
    const out = {};
    while (index < lines.length) {
      const cur = lines[index];
      if (cur.indent < indent) break;
      if (cur.indent > indent) fail('unexpected indentation', cur.line);
      if (cur.content.startsWith('- ')) break;
      const [key, rest] = splitKey(cur.content, cur.line);
      index += 1;
      out[key] = rest === '' ? nested(indent, cur.line, true) : inlineValue(rest, cur.line);
    }
    return out;
  }

  function sequence(indent) {
    const out = [];
    while (index < lines.length) {
      const cur = lines[index];
      if (cur.indent < indent) break;
      if (cur.indent > indent) fail('unexpected indentation', cur.line);
      if (!(cur.content.startsWith('- ') || cur.content === '-')) break;
      const item = cur.content === '-' ? '' : cur.content.slice(2).trim();
      index += 1;
      if (item === '') {
        out.push(nested(indent, cur.line, false));
      } else if (/^[{["']/.test(item) || !/:( |$)/.test(item)) {
        out.push(inlineValue(item, cur.line));
      } else {
        // "- key: value" starts a map whose further keys are indented to the item's column.
        const itemIndent = indent + 2;
        lines.splice(index, 0, { indent: itemIndent, content: item, line: cur.line });
        out.push(mapping(itemIndent));
      }
    }
    return out;
  }

  if (!lines.length) return null;
  const result = block(lines[0].indent);
  if (index < lines.length) fail('inconsistent indentation', lines[index].line);
  return result;
}
