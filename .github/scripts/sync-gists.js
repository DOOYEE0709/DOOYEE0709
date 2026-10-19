// Copies gist contents (kept up to date by productive-box / github-stats-box) into README.md
// between <!-- MARKER:START --> and <!-- MARKER:END -->.
// Gists with `svg` are rendered as an image card instead of a code block, since block-element
// bars (▍ ░) render inconsistently across code fonts.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const README = path.join(ROOT, 'README.md');
const GISTS = [
    { marker: 'GIST-PRODUCTIVE', id: '35d87951dac97313c4d7fc436c18ef0c', svg: 'assets/productive.svg' },
    { marker: 'GIST-STATS', id: 'bf3bbf4683d899681c691c81caacb2a3' },
];

// Needs a PAT: Actions' GITHUB_TOKEN can't access the Gist API, and unauthenticated calls
// hit the per-IP rate limit shared across GitHub-hosted runners.
async function fetchGist(id) {
    const headers = { Accept: 'application/vnd.github+json' };
    if (process.env.GIST_TOKEN) headers.Authorization = `Bearer ${process.env.GIST_TOKEN}`;

    const res = await fetch(`https://api.github.com/gists/${id}`, { headers });
    if (!res.ok) throw new Error(`gist ${id}: ${res.status} ${res.statusText}`);

    const gist = await res.json();
    const file = Object.values(gist.files)[0];
    return { title: file.filename, content: file.content.trimEnd(), url: gist.html_url };
}

const escapeXml = (s) =>
    s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

// Parses productive-box lines like "🌞 Morning   156 commits  ███▍░░░  16.6%".
function parseProductive(content) {
    return content.split('\n').map((line) => {
        const m = line.match(/^(\S+)\s+(\S+)\s+(\d+) commits\s.*?([\d.]+)%\s*$/u);
        if (!m) throw new Error(`unexpected productive-box line: ${line}`);
        return { emoji: m[1], label: m[2], commits: +m[3], percent: +m[4] };
    });
}

// Styled to match the Top Langs card in README.md (github-readme-stats, compact layout).
function renderProductiveSvg(title, rows) {
    const BAR_X = 190;
    const BAR_WIDTH = 170;
    const items = rows
        .map(({ emoji, label, commits, percent }, i) => {
            const y = i * 25;
            const fill = Math.max((BAR_WIDTH * percent) / 100, percent > 0 ? 4 : 0).toFixed(2);
            return `
    <g transform="translate(25, ${y})">
      <text class="label" x="0" y="9">${emoji} ${escapeXml(label)}</text>
      <text class="label" x="${BAR_X - 15}" y="9" text-anchor="end">${commits} commits</text>
      <rect x="${BAR_X}" y="1" width="${BAR_WIDTH}" height="8" rx="4" fill="#2c3e50" fill-opacity="0.12"/>
      <rect x="${BAR_X}" y="1" width="${fill}" height="8" rx="4" fill="#e67e22"/>
      <text class="percent" x="400" y="9" text-anchor="end">${percent.toFixed(1)}%</text>
    </g>`;
        })
        .join('');

    return `<svg width="450" height="165" viewBox="0 0 450 165" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="titleId">
  <title id="titleId">${escapeXml(title)}</title>
  <style>
    .header { font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif; fill: #e67e22; }
    .label { font: 400 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: #2c3e50; }
    .percent { font: 600 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: #2c3e50; }
  </style>
  <defs>
    <linearGradient id="gradient" gradientTransform="rotate(45)" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fff3b0"/>
      <stop offset="100%" stop-color="#87ceeb"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" rx="20" width="449" height="164" stroke="#e4e2e2" fill="url(#gradient)"/>
  <text class="header" x="25" y="35">${escapeXml(title)}</text>
  <g transform="translate(0, 62)">${items}
  </g>
</svg>
`;
}

async function main() {
    const original = fs.readFileSync(README, 'utf8');
    const eol = original.includes('\r\n') ? '\r\n' : '\n';
    let readme = original;

    for (const { marker, id, svg } of GISTS) {
        const start = `<!-- ${marker}:START -->`;
        const end = `<!-- ${marker}:END -->`;
        const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
        if (!pattern.test(readme)) throw new Error(`marker ${marker} not found in README.md`);

        const { title, content, url } = await fetchGist(id);
        let body;
        if (svg) {
            fs.mkdirSync(path.dirname(path.join(ROOT, svg)), { recursive: true });
            fs.writeFileSync(path.join(ROOT, svg), renderProductiveSvg(title, parseProductive(content)));
            body = [`[![${title}](${svg})](${url})`];
        } else {
            body = [`**[${title}](${url})**`, '```text', content, '```'];
        }
        const block = [start, ...body, end].join('\n');
        readme = readme.replace(pattern, () => block.replace(/\r?\n/g, eol));
    }

    if (readme === original) {
        console.info('README.md is already up to date');
        return;
    }
    fs.writeFileSync(README, readme);
    console.info('README.md updated');
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
