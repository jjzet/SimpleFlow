import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: 'Missing URL parameter' },
        { status: 400 }
      );
    }

    console.log(`Testing connection to: ${url}`);

    try {
      // Just attempt to connect to the domain without authentication
      // This helps diagnose network/CORS issues separately from auth issues
      const testUrl = new URL(url);
      const connectionTestUrl = `${testUrl.protocol}//${testUrl.host}`;

      console.log(`Simplified connection test to: ${connectionTestUrl}`);

      const response = await fetch(connectionTestUrl, {
        method: 'HEAD',
        // Short timeout to avoid long waits
        signal: AbortSignal.timeout(5000),
      });

      return NextResponse.json({
        success: true,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: connectionTestUrl,
      });
    } catch (fetchError: any) {
      console.error(`Connection test error: ${fetchError.message}`, fetchError);
      return NextResponse.json(
        {
          success: false,
          error: 'Connection test failed',
          message: fetchError.message,
          type: fetchError.constructor.name,
          name: fetchError.name,
        },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error(`Test connection unhandled error: ${error.message}`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Test connection failed',
        message: error.message,
        type: error.constructor.name,
      },
      { status: 500 }
    );
  }
}
