import os
import re
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote

WORKSPACE_DIR = "/Users/kojotakayuki/Dev/UbuntureHP/site"

class LinkHTMLParser(HTMLParser):
    def __init__(self, filepath):
        super().__init__()
        self.filepath = filepath
        self.anchors = set()
        self.links = []
        self.canonicals = []
        self.alternates = []
        self.ids = set()
        self.duplicate_ids = []
        self.title = ""
        self.description = ""
        self._in_title = False
        self._in_menu = False
        self._in_foot_nav = False

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        
        # Track if we are inside primary navigation menu or footer navigation
        if tag == "ul" and attrs_dict.get("id") == "menu":
            self._in_menu = True
        if tag == "nav" and "foot-nav" in attrs_dict.get("class", ""):
            self._in_foot_nav = True

        # Track IDs
        if "id" in attrs_dict:
            element_id = attrs_dict["id"]
            if element_id in self.ids:
                self.duplicate_ids.append(element_id)
            else:
                self.ids.add(element_id)

        # Track title tag
        if tag == "title":
            self._in_title = True

        # Track meta description
        if tag == "meta" and attrs_dict.get("name") == "description":
            self.description = attrs_dict.get("content", "")

        # Track canonical link
        if tag == "link" and attrs_dict.get("rel") == "canonical":
            href = attrs_dict.get("href")
            if href:
                self.canonicals.append(href)

        # Track alternate hreflang
        if tag == "link" and attrs_dict.get("rel") == "alternate":
            href = attrs_dict.get("href")
            hreflang = attrs_dict.get("hreflang")
            if href:
                self.alternates.append((hreflang, href))

        # Track anchor tags and image/script/link sources
        href = attrs_dict.get("href")
        src = attrs_dict.get("src")

        if href:
            # Enforce that header/footer menus cannot use internal page anchors (except #top)
            is_nav_link = self._in_menu or self._in_foot_nav
            self.links.append(("href", href, self.get_starttag_text(), is_nav_link))
        if src:
            self.links.append(("src", src, self.get_starttag_text(), False))

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        if tag == "ul" and self._in_menu:
            self._in_menu = False
        if tag == "nav" and self._in_foot_nav:
            self._in_foot_nav = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data

def get_html_files(root_dir):
    html_files = []
    for root, dirs, files in os.walk(root_dir):
        # Exclude directories like .git
        if ".git" in root.split(os.sep):
            continue
        for file in files:
            if file.endswith(".html"):
                # Ignore Google verification files
                if file.startswith("google") and file.endswith(".html"):
                    continue
                html_files.append(os.path.join(root, file))
    return html_files

def check_file_links(file_path, parser, all_files_by_relpath, root_dir):
    errors = []
    warnings = []
    file_dir = os.path.dirname(file_path)

    # Check duplicate IDs
    for dup_id in parser.duplicate_ids:
        errors.append(f"Duplicate ID found: '{dup_id}'")

    # Check Title and Description (except for root redirect index.html)
    is_root_index = file_path == os.path.join(root_dir, "index.html")
    if not is_root_index:
        if not parser.title.strip():
            errors.append("Empty or missing <title> tag")
        if not parser.description.strip():
            errors.append("Empty or missing <meta name=\"description\"> tag")

    # Check Canonical Link
    if not parser.canonicals and not is_root_index:
        errors.append("Missing <link rel=\"canonical\">")
    else:
        for canonical in parser.canonicals:
            # Check if canonical is valid format
            if not (canonical.startswith("https://ubunture.github.io/site/") or canonical.startswith("./") or canonical.startswith("../") or canonical.endswith(".html")):
                warnings.append(f"Canonical URL format might be incorrect: '{canonical}'")

    # Check links (href, src)
    for link_type, target, context, is_nav_link in parser.links:
        # Clean target
        target = target.strip()
        
        # Skip absolute external URLs unless they are pointing to our site
        parsed_url = urlparse(target)
        if parsed_url.scheme in ["http", "https"]:
            if parsed_url.netloc == "ubunture.github.io" and parsed_url.path.startswith("/site/"):
                # Pointing to our site, map it to local relative path
                rel_path = parsed_url.path.replace("/site/", "", 1)
                local_path = os.path.join(root_dir, unquote(rel_path))
                if parsed_url.fragment:
                    local_path += "#" + parsed_url.fragment
            else:
                # External URL, skip verification for now
                continue
        elif parsed_url.scheme in ["mailto", "tel"]:
            continue
        elif target.startswith("#"):
            # Navigation link inside menu or foot-nav should not be anchor (except #top)
            if is_nav_link and target != "#top":
                errors.append(f"Header/Footer navigation link must not be an anchor: '{target}' (Context: {context})")
                continue
            
            # Internal anchor on the same page
            anchor_name = target[1:]
            if anchor_name and anchor_name not in parser.ids and anchor_name != "top":
                errors.append(f"Broken internal anchor: '{target}' (Context: {context})")
            continue
        else:
            # Relative local link
            # Remove fragment if present for file check
            clean_path = target.split("#")[0]
            if not clean_path:
                continue
            
            # Resolve relative path
            resolved_path = os.path.normpath(os.path.join(file_dir, unquote(clean_path)))
            
            # Verify file exists
            if not os.path.exists(resolved_path):
                errors.append(f"Broken local link: '{target}' (Resolved: '{resolved_path}') (Context: {context})")
            else:
                # If there's a fragment, check if it exists in target file
                if "#" in target:
                    fragment = target.split("#")[1]
                    if fragment and fragment != "top":
                        # We will verify this after parsing all files
                        pass

    return errors, warnings

def main():
    print("=== UBUNTURE LINK VALIDATOR ===")
    print(f"Target Directory: {WORKSPACE_DIR}")
    
    html_files = get_html_files(WORKSPACE_DIR)
    parsers = {}
    
    # First pass: Parse all HTML files to collect IDs and links
    for filepath in html_files:
        rel_path = os.path.relpath(filepath, WORKSPACE_DIR)
        parser = LinkHTMLParser(filepath)
        try:
            print(f"Parsing: {rel_path}...")
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            parser.feed(content)
            parser.close()
            parsers[filepath] = parser
        except Exception as e:
            print(f"Error parsing {rel_path}: {e}")

    total_errors = 0
    total_warnings = 0

    # Second pass: Validate links and references
    for filepath, parser in parsers.items():
        rel_path = os.path.relpath(filepath, WORKSPACE_DIR)
        print(f"Validating: {rel_path}...")
        errors, warnings = check_file_links(filepath, parser, parsers, WORKSPACE_DIR)
        
        # Extra check: Verify fragments on other files
        file_dir = os.path.dirname(filepath)
        for link_type, target, context, is_nav_link in parser.links:
            if not target.startswith("#") and "#" in target:
                clean_path, fragment = target.split("#", 1)
                if fragment and fragment != "top":
                    resolved_path = os.path.normpath(os.path.join(file_dir, unquote(clean_path)))
                    if os.path.exists(resolved_path) and resolved_path in parsers:
                        target_parser = parsers[resolved_path]
                        if fragment not in target_parser.ids:
                            errors.append(f"Broken anchor fragment: '{target}' (Anchor '{fragment}' not found in {os.path.relpath(resolved_path, WORKSPACE_DIR)})")

        if errors or warnings:
            print(f"\n[{rel_path}]")
            for err in errors:
                print(f"  ❌ ERROR: {err}")
                total_errors += 1
            for warn in warnings:
                print(f"  ⚠️ WARNING: {warn}")
                total_warnings += 1

    print("\n=== SUMMARY ===")
    print(f"Total HTML files checked: {len(html_files)}")
    print(f"Total Errors: {total_errors}")
    print(f"Total Warnings: {total_warnings}")
    
    if total_errors > 0:
        print("❌ Validation FAILED!")
        exit(1)
    else:
        print("✅ Validation PASSED!")
        exit(0)

if __name__ == "__main__":
    main()
