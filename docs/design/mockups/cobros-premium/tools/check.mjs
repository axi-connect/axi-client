import fs from 'node:fs';
const files = process.argv.slice(2);
globalThis.setTimeout = (fn) => fn();
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const js = html.split('data-dc-script')[1].split('>').slice(1).join('>').split('</script>')[0];
  const DCLogic = class { constructor(p) { this.props = p; } setState(s) { this.state = { ...this.state, ...s }; } };
  const C = new Function('DCLogic', js + '\nreturn Component;')(DCLogic);
  const c = new C({});
  const bindings = [...html.matchAll(/\{\{([a-zA-Z.]+)\}\}/g)].map((m) => m[1]).filter((b) => !['true', 'false'].includes(b));
  let calls = 0;
  const walk = (v, depth = 0) => {
    if (depth > 3) return;
    if (typeof v === 'function') { v(); calls++; c.renderVals(); return; }
    if (Array.isArray(v)) v.forEach((x) => walk(x, depth + 1));
    else if (v && typeof v === 'object') Object.values(v).forEach((x) => walk(x, depth + 1));
  };
  const vals = c.renderVals();
  const missing = [...new Set(bindings.filter((b) => { const [h] = b.split('.'); return !(h in vals) && !['c','s','w','o','f','m','p','r'].includes(h); }))];
  walk(vals); walk(c.renderVals());
  console.log(f.split('/').pop(), 'ok · handlers', calls, missing.length ? 'MISSING ' + missing.join(',') : '');
}
