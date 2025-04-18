# Cloudflare Pages Deployment Guide

## Issue Resolution

The build failures were due to two main issues:

1. **Missing dependencies**: The build was failing with `Cannot find module '@tailwindcss/postcss'`
2. **Lock file synchronization**: The `npm ci` command was failing because package-lock.json was out of sync with package.json

## Recommended Build Settings

Update your Cloudflare Pages settings as follows:

### Build Configuration
- **Build command:** `bash ./cloudflare-pages-build.sh`
- **Build output directory:** `/out`
- **Build system version:** `2 (latest)`
- **Root directory:** `/web`

### Environment Variables
- `NEXT_TELEMETRY_DISABLED`: `1`
- `NODE_ENV`: `production`
- `NODE_VERSION`: `20.12.1`
- `NPM_VERSION`: `10.5.0`

## Changes Made

1. **Updated package.json**:
   - Fixed dependency versions with exact version numbers to prevent mismatches
   - Added a cloudflare-build script

2. **Created build script**:
   - Created `cloudflare-pages-build.sh` to handle the build process
   - Uses `npm install` instead of `npm ci` to update the lock file
   - Explicitly installs TailwindCSS dependencies with exact versions

3. **Updated PostCSS configuration**:
   - Fixed the plugin order and added missing plugins

4. **Added Cloudflare configuration**:
   - Created cloudflare.toml with proper configuration

## Alternative Manual Deployment Steps

If the script approach doesn't work, you can also try these manual steps in the Cloudflare Pages dashboard:

1. Change the build command to:
   ```
   npm install --no-engine-strict && npm install --no-engine-strict tailwindcss@3.4.1 postcss@8.4.38 autoprefixer@10.4.19 postcss-import@16.0.1 && npm run build
   ```

2. Keep all other settings the same (output directory: `/out`, etc.)

## Troubleshooting

If you continue to encounter issues:

1. Try removing the package-lock.json file before deployment to force a fresh generation
2. Ensure Node.js version compatibility (using 20.x)
3. Consider temporarily disabling asset optimization in Cloudflare Pages settings
4. Check if the repository has been recently updated with the changes
