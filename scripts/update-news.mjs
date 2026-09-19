#!/usr/bin/env node
// Fetches the latest posts from the Ubunture note.com RSS feed and rewrites the
// news cards on ja/index.html and ja/news/index.html between the NEWS_ITEMS_START /
// NEWS_ITEMS_END markers. Run via `node scripts/update-news.mjs` (Node 18+, no deps).
//
// English pages are intentionally left untouched — note.com content is Japanese,
// and the EN news section links to separate Medium posts.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const RSS_URL = "https://note.com/ubunture/rss";
const ITEM_COUNT = 3;
const TARGET_FILES = ["ja/index.html", "ja/news/index.html"];
const START_MARKER = "<!-- NEWS_ITEMS_START (auto-updated from note.com RSS — see .github/workflows/update-news.yml) -->";
const END_MARKER = "<!-- NEWS_ITEMS_END -->";

function decodeEntities(str) {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? decodeEntities(m[1].trim()) : "";
}

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(str, max) {
  if (str.length <= max) return str;
  return str.slice(0, max).trim() + "…";
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchItems() {
  const res = await fetch(RSS_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; UbuntureNewsBot/1.0)" },
  });
  if (!res.ok) throw new Error(`Failed to fetch RSS: ${res.status} ${res.statusText}`);
  const xml = await res.text();

  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  if (itemBlocks.length === 0) throw new Error("No <item> entries found in RSS feed");

  return itemBlocks.slice(0, ITEM_COUNT).map((block) => {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link") || extractTag(block, "guid");
    const description = extractTag(block, "description");
    const thumbMatch = block.match(/<media:thumbnail>([\s\S]*?)<\/media:thumbnail>/);
    const thumbnail = thumbMatch ? decodeEntities(thumbMatch[1].trim()) : "";
    const snippet = truncate(stripHtml(description), 60);
    return { title, link, thumbnail, snippet };
  });
}

function renderArticles(items) {
  return items
    .map((item, i) => {
      const delay = i === 0 ? "" : ` style="transition-delay:.${i * 5}s"`;
      const bg = item.thumbnail
        ? `<div class="ph" aria-hidden="true" style="background-image:url('${escapeHtml(item.thumbnail)}')"></div>`
        : `<div class="ph" aria-hidden="true"></div>`;
      return `              <article class="post reveal"${delay}>
                <a class="post-link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">
                  ${bg}
                  <div class="txt">
                    <div class="title">${escapeHtml(item.title)}</div>
                    <p class="snippet">${escapeHtml(item.snippet)}</p>
                  </div>
                </a>
              </article>`;
    })
    .join("\n");
}

async function updateFile(relPath, articlesHtml) {
  const filePath = path.join(ROOT, relPath);
  const original = await readFile(filePath, "utf8");

  const startIdx = original.indexOf(START_MARKER);
  const endIdx = original.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1) {
    console.warn(`[skip] ${relPath}: markers not found`);
    return false;
  }

  const before = original.slice(0, startIdx + START_MARKER.length);
  const after = original.slice(endIdx);
  const updated = `${before}\n${articlesHtml}\n              ${after}`;

  if (updated === original) {
    console.log(`[unchanged] ${relPath}`);
    return false;
  }

  await writeFile(filePath, updated, "utf8");
  console.log(`[updated] ${relPath}`);
  return true;
}

async function main() {
  const items = await fetchItems();
  console.log(`Fetched ${items.length} item(s) from note.com RSS.`);
  const articlesHtml = renderArticles(items);

  let anyChanged = false;
  for (const relPath of TARGET_FILES) {
    const changed = await updateFile(relPath, articlesHtml);
    anyChanged = anyChanged || changed;
  }

  if (!anyChanged) {
    console.log("No changes needed.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
