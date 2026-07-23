import { NextRequest, NextResponse } from 'next/server';

const MAX_RETRIES = 2;
const TIMEOUT_MS = 45000; // 45 seconds

export async function POST(req: NextRequest) {
  try {
    // Log request received
    console.log('LUSID API Proxy: Received providers request');

    const { baseUrl, accessToken, cacheBust } = await req.json();

    if (!baseUrl || !accessToken) {
      console.log('LUSID API Proxy: Missing required parameters');
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Use the specific LUSID endpoint
    const endpointPath = '/honeycomb/api/Catalog/providers';
    // Add cache busting if provided
    const cacheBusterParam = cacheBust ? `?_cb=${cacheBust}` : '';
    const fullUrl = `${baseUrl}${endpointPath}${cacheBusterParam}`;

    console.log(
      `LUSID API Proxy: Attempting to fetch providers from ${fullUrl}`
    );

    let lastError = null;
    let retryCount = 0;

    // Try with retries
    while (retryCount <= MAX_RETRIES) {
      try {
        console.log(
          `LUSID API Proxy: Request attempt ${retryCount + 1} of ${MAX_RETRIES + 1}`
        );

        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
          // Set timeout
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        console.log(`LUSID API Proxy: Response status: ${response.status}`);

        if (response.ok) {
          const data = await response.json();
          console.log('LUSID API Proxy: Successfully retrieved providers data');

          // Process the response data to ensure consistent format
          let result;

          if (Array.isArray(data)) {
            result = { providers: data };
          } else if (data && typeof data === 'object') {
            if (data.providers && Array.isArray(data.providers)) {
              result = data;
            } else {
              // Search for array properties that might contain providers
              const arrayProps = Object.entries(data).filter(
                ([_, v]) => Array.isArray(v) && v.length > 0
              );

              if (arrayProps.length > 0) {
                const largestArrayProp = arrayProps.sort(
                  (a, b) => (b[1] as any[]).length - (a[1] as any[]).length
                )[0][0];

                result = { providers: data[largestArrayProp] };
              } else {
                // If we can't determine providers, just return the data
                result = data;
              }
            }
          } else {
            // Unexpected data format
            result = { providers: [] };
          }

          // Create response with cache control headers
          const nextResponse = NextResponse.json(result);

          // Set cache control headers
          nextResponse.headers.set(
            'Cache-Control',
            'no-cache, no-store, must-revalidate'
          );
          nextResponse.headers.set('Pragma', 'no-cache');
          nextResponse.headers.set('Expires', '0');

          return nextResponse;
        }

        // Handle error response
        let errorDetail = '';
        try {
          const errorData = await response.json();
          errorDetail = JSON.stringify(errorData);
        } catch (e) {
          try {
            errorDetail = await response.text();
          } catch (e2) {
            errorDetail = 'Could not parse error details';
          }
        }

        lastError = {
          status: response.status,
          statusText: response.statusText,
          details: errorDetail,
        };

        console.error(
          `LUSID API Proxy: Error response: ${response.status} ${response.statusText}, Details: ${errorDetail}`
        );
      } catch (error: any) {
        console.error(`LUSID API Proxy: Fetch error: ${error.message}`, error);

        lastError = {
          message: error.message,
          type: error.constructor.name,
        };
      }

      // Retry after incrementing counter
      retryCount++;

      if (retryCount <= MAX_RETRIES) {
        // Add a small delay between retries (exponential backoff)
        const delayMs = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
        console.log(`LUSID API Proxy: Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    // If we got here, all attempts failed
    return NextResponse.json(
      {
        error: `Failed to fetch providers from LUSID API after ${MAX_RETRIES + 1} attempts`,
        endpoint: '/honeycomb/api/Catalog/providers',
        lastError,
      },
      { status: 502 }
    );
  } catch (error: any) {
    // General error handler
    console.error(`LUSID API Proxy: Unhandled error: ${error.message}`, error);
    return NextResponse.json(
      {
        error: 'Failed to connect to LUSID API',
        message: error.message,
        type: error.constructor.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
