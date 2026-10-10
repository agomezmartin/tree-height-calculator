import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const PUBLIC_URL = 'https://agomezmartin.github.io/tree-height-calculator/';

test('static HTML provides complete, unique social metadata for the GitHub Pages project URL', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const workflow = await readFile(new URL('../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');
  const document = new JSDOM(html).window.document;
  const contentFor = (selector) => {
    const matches = document.querySelectorAll(selector);
    assert.equal(matches.length, 1, `Expected one ${selector} element`);
    return matches[0].content;
  };
  const title = document.querySelector('title')?.textContent.trim();
  const description = contentFor('meta[name="description"]');

  assert.ok(title, 'Static HTML should provide a crawler-visible title');
  assert.ok(description.length >= 50, 'Static HTML should provide a useful description');
  assert.equal(document.querySelector('link[rel="canonical"]')?.href, PUBLIC_URL);
  assert.equal(contentFor('meta[property="og:type"]'), 'website');
  assert.equal(contentFor('meta[property="og:title"]'), title);
  assert.equal(contentFor('meta[property="og:description"]'), description);
  assert.equal(contentFor('meta[property="og:url"]'), PUBLIC_URL);
  assert.equal(contentFor('meta[property="og:site_name"]'), title);
  assert.ok(contentFor('meta[property="og:image:alt"]').length > 0);
  assert.equal(contentFor('meta[property="og:image:width"]'), '1200');
  assert.equal(contentFor('meta[property="og:image:height"]'), '630');
  assert.equal(contentFor('meta[property="og:image:type"]'), 'image/png');
  assert.equal(contentFor('meta[name="twitter:card"]'), 'summary_large_image');
  assert.equal(contentFor('meta[name="twitter:title"]'), title);
  assert.equal(contentFor('meta[name="twitter:description"]'), description);

  const imageUrl = new URL(contentFor('meta[property="og:image"]'));
  assert.equal(imageUrl.protocol, 'https:');
  assert.equal(imageUrl.origin, new URL(PUBLIC_URL).origin);
  assert.ok(imageUrl.pathname.startsWith(new URL(PUBLIC_URL).pathname));
  assert.equal(contentFor('meta[name="twitter:image"]'), imageUrl.href);

  const localImagePath = imageUrl.pathname.slice(new URL(PUBLIC_URL).pathname.length);
  assert.ok(localImagePath, 'Social image path should be inside the project base path');
  const image = await readFile(new URL(`../${localImagePath}`, import.meta.url));
  assert.equal(image.toString('ascii', 1, 4), 'PNG');
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
  assert.match(workflow, /uses:\s*actions\/upload-pages-artifact@v3[\s\S]*?with:\s*path:\s*\./);
  assert.match(workflow, /uses:\s*actions\/deploy-pages@v4/);

  for (const property of [
    'og:type',
    'og:title',
    'og:description',
    'og:url',
    'og:image',
    'og:image:width',
    'og:image:height',
    'og:image:alt',
    'og:site_name',
  ]) {
    assert.equal(document.querySelectorAll(`meta[property="${property}"]`).length, 1, `${property} must not be duplicated`);
  }
});
