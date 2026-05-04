import re
import os

html_file = r'c:\Users\Suhail Ahmad\Desktop\stock\stock\index.html'

with open(html_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Directory setup
os.makedirs(r'c:\Users\Suhail Ahmad\Desktop\stock\stock\assets\css', exist_ok=True)
os.makedirs(r'c:\Users\Suhail Ahmad\Desktop\stock\stock\assets\js', exist_ok=True)
os.makedirs(r'c:\Users\Suhail Ahmad\Desktop\stock\stock\views', exist_ok=True)
os.makedirs(r'c:\Users\Suhail Ahmad\Desktop\stock\stock\api', exist_ok=True)

# 1. Extract CSS
style_match = re.search(r'<style>(.*?)</style>', content, re.DOTALL)
if style_match:
    with open(r'c:\Users\Suhail Ahmad\Desktop\stock\stock\assets\css\style.css', 'w', encoding='utf-8') as f:
        f.write(style_match.group(1).strip())

# 2. Extract JS
script_match = re.search(r'<script>(.*?)</script>', content, re.DOTALL)
if script_match:
    with open(r'c:\Users\Suhail Ahmad\Desktop\stock\stock\assets\js\main.js', 'w', encoding='utf-8') as f:
        f.write(script_match.group(1).strip())

# 3. Extract Tabs
tabs = [
    'dashboard', 'dataEntry', 'orders', 'categories', 'customers', 'stockList', 'lowStockReport'
]

for tab in tabs:
    # Match <div id="tabName" class="tab-content" ...>...</div>
    # Using generic regex to match the start, and we will find the matching closing div.
    pattern = rf'<div\s+id="{tab}"\s+class="tab-content[^"]*"'
    match = re.search(pattern, content)
    if match:
        start_idx = match.start()
        # Find the matching closing </div>
        depth = 0
        end_idx = -1
        i = start_idx
        while i < len(content):
            if content.startswith('<div', i):
                depth += 1
                i += 4
            elif content.startswith('</div', i):
                depth -= 1
                if depth == 0:
                    end_idx = i + 6
                    break
                i += 5
            else:
                i += 1
                
        if end_idx != -1:
            tab_content = content[start_idx:end_idx]
            # Convert camelCase to snake_case for filename
            filename = re.sub(r'(?<!^)(=[A-Z])', r'_\1', tab).lower()
            with open(rf'c:\Users\Suhail Ahmad\Desktop\stock\stock\views\{filename}.php', 'w', encoding='utf-8') as f:
                f.write(tab_content.strip())
                
# Settings panel
match = re.search(r'<div\s+id="settingsPanel"', content)
if match:
    start_idx = match.start()
    depth = 0
    end_idx = -1
    i = start_idx
    while i < len(content):
        if content.startswith('<div', i):
            depth += 1
            i += 4
        elif content.startswith('</div', i):
            depth -= 1
            if depth == 0:
                end_idx = i + 6
                break
            i += 5
        else:
            i += 1
            
    if end_idx != -1:
        tab_content = content[start_idx:end_idx]
        with open(rf'c:\Users\Suhail Ahmad\Desktop\stock\stock\views\settings.php', 'w', encoding='utf-8') as f:
            f.write(tab_content.strip())

# Login Page
match = re.search(r'<div\s+id="loginPage"', content)
if match:
    start_idx = match.start()
    depth = 0
    end_idx = -1
    i = start_idx
    while i < len(content):
        if content.startswith('<div', i):
            depth += 1
            i += 4
        elif content.startswith('</div', i):
            depth -= 1
            if depth == 0:
                end_idx = i + 6
                break
            i += 5
        else:
            i += 1
            
    if end_idx != -1:
        tab_content = content[start_idx:end_idx]
        with open(rf'c:\Users\Suhail Ahmad\Desktop\stock\stock\views\login.php', 'w', encoding='utf-8') as f:
            f.write(tab_content.strip())

# Modals
match = re.search(r'<!-- Modals -->\s*(<div\s+id="invoiceModal".*?)<script>', content, re.DOTALL)
if match:
    # Get all html from Modals up to script
    modals_content = match.group(1).strip()
    with open(rf'c:\Users\Suhail Ahmad\Desktop\stock\stock\views\modals.php', 'w', encoding='utf-8') as f:
        f.write(modals_content)
        
print("Extraction complete!")
