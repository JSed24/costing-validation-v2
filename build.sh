#!/bin/bash
# Create a dist folder for deployment
rm -rf dist
mkdir -p dist

# Copy all files from src to dist
cp -r src/* dist/

# Copy public folder contents to dist (assets like images and CSV)
if [ -d "public" ]; then
  cp -r public/* dist/
fi

echo "Build complete! Files ready in dist folder"
ls -la dist/
