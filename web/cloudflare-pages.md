# Cloudflare Pages Build Configuration

## Recommended Build Settings

### Build Configuration
- **Build command:** `node cloudflare-build.js`
- **Build output directory:** `/out`
- **Build system version:** `2 (latest)`
- **Root directory:** `/web`

### Environment Variables
- `NEXT_TELEMETRY_DISABLED`: `1`
- `NODE_ENV`: `production`
- `NODE_VERSION`: `20.12.1`
- `NPM_VERSION`: `10.5.0`

## Compatibility Notes

This Next.js project has been configured to work with Cloudflare Pages using static exports. The following changes have been made:

1. Added required dependencies for Tailwind CSS and PostCSS
2. Updated the build process to ensure all dependencies are available
3. Configured Next.js to generate static exports
4. Ensured font loading is compatible with Cloudflare Pages

## Troubleshooting

If you encounter build issues:

1. Check if all dependencies are being installed correctly
2. Verify that the build output directory is set to `/out`
3. Ensure the Node.js version is set to 20.x
4. Review build logs for specific error messages
