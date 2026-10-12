// Minimal Gherkin reader: scenario titles with their effective tags, outline examples expanded.

// Returns [{ title, line, tags }]. Outline examples become "<name> - <cells joined by ', '>".
export function scenarios(text) {
  const out = [];
  let pending = [];
  let featureTags = [];
  let ruleTags = [];
  let outline = null; // { name, line, tags, inExamples, headerSeen }

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    const n = i + 1;
    if (!line || line.startsWith('#')) return;
    if (line.startsWith('@')) {
      pending.push(...line.split(/\s+/).filter((t) => t.startsWith('@')));
      return;
    }
    const keyword = line.match(/^(Feature|Rule|Background|Scenario Outline|Scenario Template|Scenario|Example|Examples|Scenarios):\s*(.*)$/);
    if (keyword) {
      const [, kind, name] = keyword;
      if (kind === 'Feature') { featureTags = pending; ruleTags = []; outline = null; }
      else if (kind === 'Rule') { ruleTags = pending; outline = null; }
      else if (kind === 'Background') { outline = null; }
      else if (kind === 'Examples' || kind === 'Scenarios') {
        if (outline) { outline.inExamples = true; outline.headerSeen = false; outline.exampleTags = pending; }
      } else {
        const tags = [...featureTags, ...ruleTags, ...pending];
        if (kind === 'Scenario Outline' || kind === 'Scenario Template') {
          outline = { name: name.trim(), line: n, tags, inExamples: false, headerSeen: false };
        } else {
          outline = null;
          out.push({ title: name.trim(), line: n, tags });
        }
      }
      pending = [];
      return;
    }
    if (outline?.inExamples && line.startsWith('|')) {
      if (!outline.headerSeen) { outline.headerSeen = true; return; }
      const cells = line.slice(1, line.endsWith('|') ? -1 : undefined).split('|').map((c) => c.trim());
      out.push({ title: `${outline.name} - ${cells.join(', ')}`, line: n, tags: [...outline.tags, ...(outline.exampleTags ?? [])] });
    }
  });
  return out;
}

export function agentScenarioTitles(text) {
  return scenarios(text).filter((s) => s.tags.includes('@agent'));
}
