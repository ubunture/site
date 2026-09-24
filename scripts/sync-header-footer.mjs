#!/usr/bin/env node
// Single source of truth for the site header (nav) and footer, shared by every
// page in PAGES (ja/ and en/). Edit PAGES / LABELS / HEADER() / FOOTER() below,
// then run `node scripts/sync-header-footer.mjs` to apply the change to every
// page at once (matches the existing pattern in scripts/update-news.mjs).
//
// Pages are listed in PAGES below and matched between the <!-- Header -->/
// <!-- Footer --> markers and </header>/</footer>. ja/project.html and
// en/project.html are legacy pages not in PAGES, so they are left alone.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Site structure. Keys are paths relative to ja/ and en/ (both languages share
// the same tree). `top` = primary nav item, `sub` = dropdown item (also the label
// key). `h1` optionally overrides the hero heading per language.
const ASSET_VERSION = "4";

const PAGES = {
  "index.html": { top: "home" },
  "about/index.html": { top: "about" },
  "about/message.html": { top: "about", sub: "message", h1: { en: "Representative's Message" } },
  "about/name.html": { top: "about", sub: "name" },
  "about/mission-vision-value.html": { top: "about", sub: "mission", h1: { ja: "ミッション・ビジョン・バリュー" } },
  "about/history.html": { top: "about", sub: "history" },
  "activity/index.html": { top: "activity", sub: "overview", h1: { ja: "活動紹介" } },
  "activity/documents.html": { top: "activity", sub: "documents" },
  "team/index.html": { top: "team", h1: { ja: "チーム", en: "Team" } },
  "team/members.html": { top: "team", sub: "member", h1: { ja: "メンバー" } },
  "team/recruit.html": { top: "team", sub: "recruit" },
  "news/index.html": { top: "news" },
  "news/article-template.html": { top: "news", template: true },
  "contact/contact-us.html": { top: "contact", sub: "contactus" },
  "contact/support.html": { top: "contact", sub: "support" },
};

// Parent page of each dropdown group (null = the group heading is not a link).
const GROUP_HREF = {
  about: "about/index.html",
  activity: "activity/index.html",
  team: "team/index.html",
  news: "news/index.html",
  contact: null,
};

const LABELS = {
  ja: { home: "Home", about: "概要", message: "代表メッセージ", name: "名前の由来", mission: "ミッション・ビジョン・バリュー", history: "沿革",
    activity: "我々の活動", overview: "活動紹介", documents: "団体資料", team: "チーム", member: "メンバー", recruit: "興味のある学生へ",
    news: "最新情報", contact: "お問い合わせ", contactus: "連絡先", support: "ご支援について" },
  en: { home: "Home", about: "About", message: "Representative's Message", name: "Origin of Name", mission: "Mission, Vision & Value", history: "History",
    activity: "Our Activity", overview: "Overview", documents: "Documents", team: "Team", member: "Member", recruit: "Recruit",
    news: "News", contact: "Contact", contactus: "Contact us", support: "Support" },
};

const depthOf = (file) => file.split("/").length - 1;
// relative URL from page `from` to page `to` (both inside the same language dir)
const rel = (from, to) => {
  const r = path.posix.relative(path.posix.dirname(from), to);
  return r.startsWith(".") ? r : "./" + r;
};
const cls = (...names) => {
  const list = names.filter(Boolean);
  return list.length ? ` class="${list.join(" ")}"` : "";
};

function HEADER(lang, file) {
  const nav = PAGES[file] || {};
  const L = LABELS[lang];
  const up = "../".repeat(depthOf(file));
  const brandHref = file === "index.html" ? "#top" : rel(file, "index.html");
  const ja = lang === "ja" ? "true" : "false";
  const en = lang === "en" ? "true" : "false";
  const href = (target) => rel(file, target);
  const top = (key) => (nav.top === key ? " active" : "");
  const item = (target, label, active) =>
    `<li role="none"><a role="menuitem" href="${href(target)}"${cls(active && "active")}>${label}</a></li>`;

  const group = (key, children) => {
    const parent = GROUP_HREF[key];
    const toggle = parent
      ? `<a role="menuitem" href="${href(parent)}" class="dropdown-toggle${top(key)}" aria-haspopup="true">${L[key]}<span class="dropdown-caret" aria-hidden="true"></span></a>`
      : `<a role="menuitem" tabindex="0" class="dropdown-toggle no-link${top(key)}" aria-haspopup="true">${L[key]}<span class="dropdown-caret" aria-hidden="true"></span></a>`;
    const lis = children.map(([target, label, sub]) => item(target, L[label], nav.sub === sub)).join("\n              ");
    return `<li role="none" class="has-dropdown">
            ${toggle}
            <ul class="dropdown-menu" role="menu" aria-label="${L[key]}">
              ${lis}
            </ul>
          </li>`;
  };

  return `<!-- Header -->
    <header>
      <nav class="nav" aria-label="Primary">
        <div class="brand-wrap">
          <a class="brand" href="${brandHref}"><img src="${up}../assets/img/logo.png" alt="Ubunture" /><span>Ubunture</span></a>
          <div class="lang-switch" role="group" aria-label="Language switch">
            <a class="lang-btn" href="${up}../ja/${file}" role="button" aria-pressed="${ja}">JP</a>
            <a class="lang-btn" href="${up}../en/${file}" role="button" aria-pressed="${en}">EN</a>
          </div>
        </div>
        <button class="menu-btn" aria-expanded="false" aria-controls="menu"><span></span><span></span><span></span></button>
        <ul id="menu" role="menubar">
          <li role="none"><a role="menuitem" href="${href("index.html")}"${cls(nav.top === "home" && "active")}>${L.home}</a></li>
          ${group("about", [
            ["about/message.html", "message", "message"],
            ["about/name.html", "name", "name"],
            ["about/mission-vision-value.html", "mission", "mission"],
            ["about/history.html", "history", "history"],
          ])}
          ${group("activity", [
            ["activity/index.html", "overview", "overview"],
            ["activity/documents.html", "documents", "documents"],
          ])}
          ${group("team", [
            ["team/members.html", "member", "member"],
            ["team/recruit.html", "recruit", "recruit"],
          ])}
          <li role="none"><a role="menuitem" href="${href("news/index.html")}"${cls(nav.top === "news" && "active")}>${L.news}</a></li>
          ${group("contact", [
            ["contact/contact-us.html", "contactus", "contactus"],
            ["contact/support.html", "support", "support"],
          ])}
        </ul>
      </nav>
    </header>`;
}

// Breadcrumbs, <title>, hero eyebrow/heading and canonical/hreflang/og:url are
// derived from the page's position in PAGES.
function applyMeta(html, lang, file) {
  const nav = PAGES[file];
  if (!nav || nav.top === "home") return html;
  const L = LABELS[lang];
  const label = L[nav.sub || nav.top];
  const site = lang === "ja" ? "Ubunture" : "Ubunture UTokyo";
  const parentHref = GROUP_HREF[nav.top];
  const crumbs = [`<a href="${rel(file, "index.html")}">Home</a>`];
  if (nav.sub) crumbs.push(parentHref ? `<a href="${rel(file, parentHref)}">${L[nav.top]}</a>` : L[nav.top]);
  crumbs.push(label);

  if (!nav.template) html = html.replace(/<title>[^<]*<\/title>/, `<title>${label} | ${site}</title>`);
  html = html.replace(/(<meta property="og:title" content=")[^"]*/, nav.template ? "$&" : `$1${label} | ${site}`);
  html = html.replace(/<div class="breadcrumbs">[\s\S]*?<\/div>/, `<div class="breadcrumbs">${crumbs.join(" <span> / </span> ")}</div>`);
  html = html.replace(/(<section class="subpage-hero[\s\S]*?<div class="eyebrow">)[^<]*/, `$1${L[nav.top]}`);
  const h1 = nav.h1?.[lang];
  if (h1) html = html.replace(/(<h1 class="h-section"[^>]*>)[^<]*/, `$1${h1}`);
  html = html.replace(/(<section class="subpage-hero[^>]*aria-label=")[^"]*/, `$1${h1 || label}`);
  html = html.replace(
    /<(?:link rel="(?:canonical|alternate)"|meta property="og:url")[^>]*>/g,
    (tag) => tag.replace(/(site\/(?:ja|en)\/)[^"]*\.html/, `$1${file}`)
  );
  return html;
}

function FOOTER(lang, file) {
  const up = "../".repeat(depthOf(file));
  const rep = lang === "ja" ? "代表：澤近大地" : "Representative: Daichi Sawachika";
  const brand = lang === "ja" ? "Ubunture © 2026" : "Ubunture UTokyo © 2026";
  const L = LABELS[lang];

  return `<!-- Footer -->
    <footer>
      <div class="container">
        <div class="foot-grid">
          <div class="cta">
            <h3>CONTACT</h3>
            <p>
              <a href="mailto:ubunture.tokyo@gmail.com" style="color:#fff; text-decoration:none;">ubunture.tokyo@gmail.com</a><br />
              ${rep}
            </p>
          </div>
        </div>

        <div class="foot-bottom">
          <div style="display:flex; align-items:center; gap:10px; color:#d0d0d0;">
            <img src="${up}../assets/img/logo.png" alt="Ubunture logo" width="22" height="22" />
            ${brand}
          </div>

          <nav class="foot-nav" aria-label="Footer">
            <a href="${rel(file, "about/index.html")}">${L.about}</a>
            <a href="${rel(file, "activity/index.html")}">${L.activity}</a>
            <a href="${rel(file, "team/index.html")}">${L.team}</a>
            <a href="${rel(file, "news/index.html")}">${L.news}</a>
            <a href="${rel(file, "contact/contact-us.html")}">${L.contact}</a>
          </nav>

          <div class="social-links" style="display:flex; gap:14px;">
            <a href="https://note.com/ubunture" target="_blank" rel="noopener">
              <img src="${up}../assets/img/note.webp" alt="Note" width="40" height="40" loading="lazy" />
            </a>
            <a href="https://medium.com/@ubunture.tokyo" target="_blank" rel="noopener">
              <img src="${up}../assets/img/medium.png" alt="Medium" width="40" height="40" loading="lazy" />
            </a>
            <a href="https://x.com/ubunture" target="_blank" rel="noopener">
              <img src="${up}../assets/img/x.png" alt="X (formerly Twitter)" width="40" height="40" loading="lazy" />
            </a>
            <a href="https://instagram.com/ubunture" target="_blank" rel="noopener">
              <img src="${up}../assets/img/instagram.webp" alt="Instagram" width="40" height="40" loading="lazy" />
            </a>
            <a href="https://linkedin.com/company/ubunture" target="_blank" rel="noopener">
              <img src="${up}../assets/img/linkedin.png" alt="LinkedIn" width="40" height="40" loading="lazy" />
            </a>
            <a href="https://facebook.com/ubunture" target="_blank" rel="noopener">
              <img src="${up}../assets/img/facebook.webp" alt="Facebook" width="40" height="40" loading="lazy" />
            </a>
          </div>
        </div>
      </div>
    </footer>`;
}

function replaceBlock(html, startMarker, endTag, replacement) {
  const start = html.indexOf(startMarker);
  if (start === -1) return { html, changed: false };
  const end = html.indexOf(endTag, start);
  if (end === -1) return { html, changed: false };
  const endIdx = end + endTag.length;
  const before = html.slice(0, start);
  const after = html.slice(endIdx);
  return { html: before + replacement + after, changed: true };
}

async function processFile(lang, file) {
  const target = path.join(ROOT, lang, file);
  let html = await readFile(target, "utf8");
  let changed = false;

  let r = replaceBlock(html, "<!-- Header -->", "</header>", HEADER(lang, file));
  html = r.html; changed = changed || r.changed;

  r = replaceBlock(html, "<!-- Footer -->", "</footer>", FOOTER(lang, file));
  html = r.html; changed = changed || r.changed;

  html = applyMeta(html, lang, file);
  // bump ASSET_VERSION when CSS/JS change so browsers don't serve stale copies
  html = html.replace(/(assets\/(?:css\/styles\.css|js\/main\.js))(\?v=[\w.]+)?"/g, `$1?v=${ASSET_VERSION}"`);

  if (changed) {
    await writeFile(target, html, "utf8");
    console.log(`updated ${lang}/${file}`);
  } else {
    console.log(`skipped ${lang}/${file} (no header/footer markers found)`);
  }
}

async function main() {
  for (const lang of ["ja", "en"]) {
    for (const file of Object.keys(PAGES)) {
      await processFile(lang, file);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
