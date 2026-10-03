import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import type { ReactNode } from 'react';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
after(() => server.close());
type MarkdownContext = { sectionRel: string; pathToSlug: Map<string, string> };
const { renderMarkdown } = await server.ssrLoadModule('/src/components/portfolio/markdown.tsx') as {
    renderMarkdown: (markdown: string, context: MarkdownContext) => ReactNode;
};
const context: MarkdownContext = { sectionRel: 'projects.md', pathToSlug: new Map() };
const lines = [
    '# Projects',
    '',
    '- First item',
    '  - Nested item',
    '- Second item',
    '',
    '| Name | Platform |',
    '| --- | --- |',
    '| Example | Windows |',
    '',
    'Final paragraph.',
];
const expected = renderToStaticMarkup(renderMarkdown(lines.join('\n'), context));

for (const [name, ending] of [['LF', '\n'], ['CRLF', '\r\n'], ['CR', '\r']]) {
    test(`headings, lists, tables and paragraphs render identically with ${name}`, () => {
        const html = renderToStaticMarkup(renderMarkdown(lines.join(ending), context));
        assert.equal(html, expected);
        assert.match(html, /<h2[^>]*>Projects<\/h2>/);
        assert.equal((html.match(/<li\b/g) ?? []).length, 3);
        assert.match(html, /<table\b/);
        assert.match(html, /Final paragraph\./);
    });
}

test('a list item containing a Unicode line separator cannot stall the parser', () => {
    const html = renderToStaticMarkup(renderMarkdown('- First\u2028item\n- Second item', context));
    assert.equal((html.match(/<li\b/g) ?? []).length, 2);
    assert.match(html, /Second item/);
});
