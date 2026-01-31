#!/bin/bash
# Cleanup script to remove duplicate and unnecessary files

set -e

echo "🧹 Starting project cleanup..."

# Backup important files first
echo "Creating backup..."
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Files and directories to remove
TO_REMOVE=(
    "supabase"                    # Duplicate of barber-backend/supabase
    "components"                   # Old component structure
    "services"                     # Old services folder
    "App.tsx"                      # Root-level React files
    "index.tsx"
    "index.html"
    "types.ts"
    "tsconfig.json"
    "vite.config.ts"
    "metadata.json"
    "interactive_test.py"          # Replaced by comprehensive_test.py
    ".env.local.example"           # Redundant
)

echo ""
echo "Files/folders to be removed:"
for item in "${TO_REMOVE[@]}"; do
    if [ -e "$item" ]; then
        echo "  - $item"
        # Create backup
        if [ -d "$item" ]; then
            cp -r "$item" "$BACKUP_DIR/" 2>/dev/null || true
        else
            cp "$item" "$BACKUP_DIR/" 2>/dev/null || true
        fi
    fi
done

echo ""
read -p "Proceed with cleanup? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Removing files..."
    for item in "${TO_REMOVE[@]}"; do
        if [ -e "$item" ]; then
            rm -rf "$item"
            echo "  ✓ Removed $item"
        fi
    done
    
    echo ""
    echo "✅ Cleanup complete!"
    echo "Backup saved to: $BACKUP_DIR"
    echo ""
    echo "Project structure:"
    tree -L 1 -I 'node_modules|.venv|.git|backup_*'
else
    echo "Cleanup cancelled"
    rm -rf "$BACKUP_DIR"
fi
