#!/bin/bash

# Install VS Code Extensions for SEO and Development
echo "Installing VS Code extensions for SEO optimization..."

# SEO & HTML
code --install-extension mkaufman.HTMLHint
echo "✓ HTMLHint installed"

# Spell Checker (English + Hebrew)
code --install-extension streetsidesoftware.code-spell-checker
code --install-extension streetsidesoftware.code-spell-checker-hebrew
echo "✓ Code Spell Checker (Hebrew) installed"

# SEO Helper
code --install-extension Jericho-Coding.seo-peek
echo "✓ SEO Helper installed"

# Code Formatting
code --install-extension esbenp.prettier-vscode
echo "✓ Prettier installed"

# Development Server
code --install-extension ritwickdey.LiveServer
echo "✓ Live Server installed"

# Minifier
code --install-extension HookyQR.minify
echo "✓ Minify installed"

echo ""
echo "✅ All extensions installed successfully!"
echo "Restart VS Code to activate the extensions."
