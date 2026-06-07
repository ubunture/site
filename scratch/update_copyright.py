import os

def update_copyright(directory):
    count = 0
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.html'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                if 'Ubunture © 2025' in content:
                    updated = content.replace('Ubunture © 2025', 'Ubunture © 2026')
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(updated)
                    print(f"Updated: {path}")
                    count += 1
    print(f"Done. Updated {count} files.")

if __name__ == '__main__':
    update_copyright('/Users/kojotakayuki/Dev/UbuntureHP/site')
