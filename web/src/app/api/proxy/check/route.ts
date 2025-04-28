import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy endpoint to check if a URL is valid and accessible
 * This helps bypass CORS restrictions when validating download URLs
 */
export async function GET(request: NextRequest) {
  try {
    // Get the target URL from query parameters
    const url = request.nextUrl.searchParams.get('url');

    // Validate URL
    if (!url) {
      return NextResponse.json(
        { valid: false, error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Only allow GitHub codeload URLs for security
    if (!url.startsWith('https://codeload.github.com/')) {
      return NextResponse.json(
        { valid: false, error: 'Only GitHub codeload URLs are allowed' },
        { status: 403 }
      );
    }

    // Check if the URL is accessible
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Swift Web Application',
        'Origin': 'http://localhost'
      }
    });

    // Set CORS headers
    const origin = request.headers.get('origin') || 'http://localhost';
    const responseWithCors = NextResponse.json(
      { valid: response.ok, status: response.status },
      { status: 200 }
    );
    
    responseWithCors.headers.set('Access-Control-Allow-Origin', origin);
    responseWithCors.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    responseWithCors.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return responseWithCors;
  } catch (error) {
    console.error('Error in URL validation proxy:', error);
    
    // Set CORS headers even for error responses
    const origin = request.headers.get('origin') || 'http://localhost';
    const errorResponse = NextResponse.json(
      { valid: false, error: 'Failed to validate URL' },
      { status: 500 }
    );
    
    errorResponse.headers.set('Access-Control-Allow-Origin', origin);
    errorResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return errorResponse;
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
