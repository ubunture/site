#!/usr/bin/env node
// Single source of truth for the site header (nav) and footer, shared by every
// ja/*.html and en/*.html page. Edit HEADER() / FOOTER_JA() / FOOTER_EN() below,
// then run `node scripts/sync-header-footer.mjs` to apply the change to every
// page at once (matches the existing pattern in scripts/update-news.mjs).
//
// Pages are matched by filename between the <!-- Header -->/<!-- Footer -->
// markers and </header>/</footer>. ja/project.html and en/project.html are
// intentionally skipped — they are legacy pages no longer linked from the nav.

import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SKIP = new Set(["project.html"]);

// slug -> which nav key(s) should be marked active
const PAGE_NAV = {
  "index.html": { top: "home" },
  "message.html": { top: "about", sub: "message" },
  "name.html": { top: "about", sub: "name" },
  "mission.html": { top: "about", sub: "mission" },
  "history.html": { top: "about", sub: "history" },
  "about.html": { top: "about" },
  "our-activity.html": { top: "activity" },
  "team.html": { top: "team", sub: "member" },
  "recruit.html": { top: "team", sub: "recruit" },
  "news.html": { top: "news" },
  "contact.html": { top: "contact", sub: "contactus" },
  "support.html": { top: "contact", sub: "support" },
};

function cls(...names) {
  const list = names.filter(Boolean);
  return list.length ? ` class="${list.join(" ")}"` : "";
}

function HEADER(lang, slug) {
  const nav = PAGE_NAV[slug] || {};
  const isHome = slug === "index.html";
  const brandHref = isHome ? "#top" : "./index.html";
  const jaPressed = lang === "ja" ? "true" : "false";
  const enPressed = lang === "en" ? "true" : "false";

  const a = (key) => (nav.top === key ? " active" : "");
  const s = (key) => (nav.sub === key ? " active" : "");

  const L = lang === "ja"
    ? { name: "名前の由来", mission: "Mission・Vision・Value", member: "Member", recruit: "Recruit", contactus: "Contact us", support: "Support", home: "Home", activity: "Our Activity", team: "Team", news: "News", history: "History", message: "Message", about: "About", contact: "Contact" }
    : { name: "Origin of Ubunture", mission: "Mission, Vision & Value", member: "Member", recruit: "Recruit", contactus: "Contact us", support: "Support", home: "Home", activity: "Our Activity", team: "Team", news: "News", history: "History", message: "Message", about: "About", contact: "Contact" };

  return `<!-- Header -->
    <header>
      <nav class="nav" aria-label="Primary">
        <div class="brand-wrap">
          <a class="brand" href="${brandHref}"><img src="../assets/img/logo.png" alt="Ubunture" /><span>Ubunture</span></a>
          <div class="lang-switch" role="group" aria-label="Language switch">
            <a class="lang-btn" href="../ja/${slug}" role="button" aria-pressed="${jaPressed}">JP</a>
            <a class="lang-btn" href="../en/${slug}" role="button" aria-pressed="${enPressed}">EN</a>
          </div>
        </div>
        <button class="menu-btn" aria-expanded="false" aria-controls="menu"><span></span><span></span><span></span></button>
        <ul id="menu" role="menubar">
          <li role="none"><a role="menuitem" href="./index.html"${cls(nav.top === "home" && "active")}>${L.home}</a></li>
          <li role="none" class="has-dropdown">
            <a role="menuitem" href="./about.html" class="dropdown-toggle${a("about")}" aria-haspopup="true">${L.about}<span class="dropdown-caret" aria-hidden="true"></span></a>
            <ul class="dropdown-menu" role="menu" aria-label="About">
              <li role="none"><a role="menuitem" href="./message.html"${cls(s("message") && "active")}>${L.message}</a></li>
              <li role="none"><a role="menuitem" href="./name.html"${cls(s("name") && "active")}>${L.name}</a></li>
              <li role="none"><a role="menuitem" href="./mission.html"${cls(s("mission") && "active")}>${L.mission}</a></li>
              <li role="none"><a role="menuitem" href="./history.html"${cls(s("history") && "active")}>${L.history}</a></li>
            </ul>
          </li>
          <li role="none"><a role="menuitem" href="./our-activity.html"${cls(nav.top === "activity" && "active")}>${L.activity}</a></li>
          <li role="none" class="has-dropdown">
            <a role="menuitem" href="./team.html" class="dropdown-toggle${a("team")}" aria-haspopup="true">${L.team}<span class="dropdown-caret" aria-hidden="true"></span></a>
            <ul class="dropdown-menu" role="menu" aria-label="Team">
              <li role="none"><a role="menuitem" href="./team.html"${cls(s("member") && "active")}>${L.member}</a></li>
              <li role="none"><a role="menuitem" href="./recruit.html"${cls(s("recruit") && "active")}>${L.recruit}</a></li>
            </ul>
          </li>
          <li role="none"><a role="menuitem" href="./news.html"${cls(nav.top === "news" && "active")}>${L.news}</a></li>
          <li role="none" class="has-dropdown">
            <a role="menuitem" href="./contact.html" class="dropdown-toggle${a("contact")}" aria-haspopup="true">${L.contact}<span class="dropdown-caret" aria-hidden="true"></span></a>
            <ul class="dropdown-menu" role="menu" aria-label="Contact">
              <li role="none"><a role="menuitem" href="./contact.html"${cls(s("contactus") && "active")}>${L.contactus}</a></li>
              <li role="none"><a role="menuitem" href="./support.html"${cls(s("support") && "active")}>${L.support}</a></li>
            </ul>
          </li>
        </ul>
      </nav>
    </header>`;
}

function FOOTER(lang) {
  const rep = lang === "ja" ? "代表：澤近大地" : "Representative: Daichi Sawachika";
  const brand = lang === "ja" ? "Ubunture © 2026" : "Ubunture UTokyo © 2026";
  const L = lang === "ja"
    ? { about: "About", activity: "Our Activity", team: "Team", news: "News", contact: "Contact" }
    : { about: "About", activity: "Our Activity", team: "Team", news: "News", contact: "Contact" };

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
            <img src="../assets/img/logo.png" alt="Ubunture logo" width="22" height="22" />
            ${brand}
          </div>

          <nav class="foot-nav" aria-label="Footer">
            <a href="./about.html">${L.about}</a>
            <a href="./our-activity.html">${L.activity}</a>
            <a href="./team.html">${L.team}</a>
            <a href="./news.html">${L.news}</a>
            <a href="./contact.html">${L.contact}</a>
          </nav>

          <div class="social-links" style="display:flex; gap:14px;">
            <a href="https://note.com/ubunture" target="_blank" rel="noopener">
              <img src="../assets/img/note.webp" alt="Note" width="40" height="40" loading="lazy" />
            </a>
            <a href="https://medium.com/@ubunture.tokyo" target="_blank" rel="noopener">
              <img src="../assets/img/medium.png" alt="Medium" width="40" height="40" loading="lazy" />
            </a>
            <a href="https://x.com/ubunture" target="_blank" rel="noopener">
              <img src="../assets/img/x.png" alt="X (formerly Twitter)" width="40" height="40" loading="lazy" />
            </a>
            <a href="https://instagram.com/ubunture" target="_blank" rel="noopener">
              <img src="../assets/img/instagram.webp" alt="Instagram" width="40" height="40" loading="lazy" />
            </a>
            <a href="https://linkedin.com/company/ubunture" target="_blank" rel="noopener">
              <img src="../assets/img/linkedin.png" alt="LinkedIn" width="40" height="40" loading="lazy" />
            </a>
            <a href="https://facebook.com/ubunture" target="_blank" rel="noopener">
              <img src="../assets/img/facebook.webp" alt="Facebook" width="40" height="40" loading="lazy" />
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

async function processFile(lang, slug) {
  const file = path.join(ROOT, lang, slug);
  let html = await readFile(file, "utf8");
  let changed = false;

  let r = replaceBlock(html, "<!-- Header -->", "</header>", HEADER(lang, slug));
  html = r.html; changed = changed || r.changed;

  r = replaceBlock(html, "<!-- Footer -->", "</footer>", FOOTER(lang));
  html = r.html; changed = changed || r.changed;

  if (changed) {
    await writeFile(file, html, "utf8");
    console.log(`updated ${lang}/${slug}`);
  } else {
    console.log(`skipped ${lang}/${slug} (no header/footer markers found)`);
  }
}

async function main() {
  for (const lang of ["ja", "en"]) {
    const dir = path.join(ROOT, lang);
    const files = (await readdir(dir)).filter((f) => f.endsWith(".html") && !SKIP.has(f));
    for (const f of files) {
      await processFile(lang, f);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
