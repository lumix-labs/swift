import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy endpoint to download files from external sources
 * This helps bypass CORS restrictions when downloading repository zip files
 */
export async function GET(request: NextRequest) {
  try {
    // Get the target URL and filename from query parameters
    const url = request.nextUrl.searchParams.get('url');
    const filename = request.nextUrl.searchParams.get('filename') || 'download.zip';

    // Validate URL
    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Only allow GitHub codeload URLs for security
    if (!url.startsWith('https://codeload.github.com/')) {
      return NextResponse.json(
        { error: 'Only GitHub codeload URLs are allowed' },
        { status: 403 }
      );
    }

    // Fetch the file
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Swift Web Application',
        'Origin': 'http://localhost'
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to download: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the file content
    const fileBuffer = await response.arrayBuffer();

    // Create a new response with the file content
    const newResponse = new NextResponse(fileBuffer);

    // Set appropriate headers
    newResponse.headers.set('Content-Type', 'application/zip');
    newResponse.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Add CORS headers
    const origin = request.headers.get('origin') || 'http://localhost';
    newResponse.headers.set('Access-Control-Allow-Origin', origin);
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return newResponse;
  } catch (error) {
    console.error('Error in download proxy:', error);
    return NextResponse.json(
      { error: 'Failed to proxy download' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  // Handle preflight requests
  const origin = request.headers.get('origin') || 'http://localhost';
  
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  return response;
}
