// Copies gist contents (kept up to date by productive-box / github-stats-box) into README.md
// between <!-- MARKER:START --> and <!-- MARKER:END -->.
const fs = require('fs');
const path = require('path');

const README = path.join(__dirname, '..', '..', 'README.md');
const GISTS = [
    { marker: 'GIST-PRODUCTIVE', id: '35d87951dac97313c4d7fc436c18ef0c' },
    { marker: 'GIST-STATS', id: 'bf3bbf4683d899681c691c81caacb2a3' },
];

// Unauthenticated on purpose: Actions' GITHUB_TOKEN can't access the Gist API (403), and public gists don't need auth.
async function fetchGist(id) {
    const res = await fetch(`https://api.github.com/gists/${id}`, {
        headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) throw new Error(`gist ${id}: ${res.status} ${res.statusText}`);

    const gist = await res.json();
    const file = Object.values(gist.files)[0];
    return { title: file.filename, content: file.content.trimEnd(), url: gist.html_url };
}

async function main() {
    const original = fs.readFileSync(README, 'utf8');
    const eol = original.includes('\r\n') ? '\r\n' : '\n';
    let readme = original;

    for (const { marker, id } of GISTS) {
        const start = `<!-- ${marker}:START -->`;
        const end = `<!-- ${marker}:END -->`;
        const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
        if (!pattern.test(readme)) throw new Error(`marker ${marker} not found in README.md`);

        const { title, content, url } = await fetchGist(id);
        const block = [start, `**[${title}](${url})**`, '```text', content, '```', end].join('\n');
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
