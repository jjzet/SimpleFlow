import { NextRequest, NextResponse } from 'next/server';

const MAX_RETRIES = 1;
const TIMEOUT_MS = 30000; // 30 seconds

export async function POST(req: NextRequest) {
  try {
    console.log('LUSID API: Worker deployment request received');

    const { baseUrl, accessToken, scope, code, requestBody } = await req.json();

    if (!baseUrl || !accessToken) {
      console.log(
        'LUSID API: Missing required parameters for worker deployment'
      );
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    if (!scope || !code) {
      console.log('LUSID API: Missing scope or code for worker deployment');
      return NextResponse.json(
        { error: 'Missing scope or code' },
        { status: 400 }
      );
    }

    // Determine if this is a create or update operation based on existence
    // For now, we'll just try creating and fall back to updating if it exists
    // In a more robust implementation, we would check existence first

    // Prepare the endpoint path - we'll start with create endpoint
    let endpointPath = '/workflow/api/workers';
    let method = 'POST';

    // For now, let's always try to create, and LUSID will return an error if the worker already exists
    console.log(
      `LUSID API: Attempting to deploy worker at ${baseUrl}${endpointPath}`
    );

    let lastError = null;
    let retryCount = 0;

    // Try with retries
    while (retryCount <= MAX_RETRIES) {
      try {
        console.log(
          `LUSID API: Worker deployment attempt ${retryCount + 1} of ${MAX_RETRIES + 1}`
        );

        // Make the initial create request
        let response = await fetch(`${baseUrl}${endpointPath}`, {
          method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          // Set timeout
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        console.log(
          `LUSID API: Worker ${method} response status: ${response.status}`
        );

        // If we get a conflict/already exists error, try updating instead
        if (response.status === 409) {
          console.log('LUSID API: Worker already exists, attempting update');
          method = 'PUT';
          endpointPath = `/workflow/api/workers/${scope}/${code}`;

          response = await fetch(`${baseUrl}${endpointPath}`, {
            method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            // Set timeout
            signal: AbortSignal.timeout(TIMEOUT_MS),
          });

          console.log(
            `LUSID API: Worker update response status: ${response.status}`
          );
        }

        // Check for successful responses
        if (response.ok) {
          let data;
          try {
            data = await response.json();
          } catch (e) {
            data = { message: 'Deployment successful' };
          }

          console.log('LUSID API: Worker deployed successfully');
          return NextResponse.json({
            success: true,
            operation: method === 'POST' ? 'created' : 'updated',
            data,
          });
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
          `LUSID API: Worker deployment error: ${response.status} ${response.statusText}, Details: ${errorDetail}`
        );
      } catch (error: any) {
        console.error(
          `LUSID API: Worker deployment fetch error: ${error.message}`,
          error
        );

        lastError = {
          message: error.message,
          type: error.constructor.name,
        };
      }

      // Retry after incrementing counter
      retryCount++;

      if (retryCount <= MAX_RETRIES) {
        // Add a small delay between retries
        const delayMs = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
        console.log(`LUSID API: Retrying worker deployment in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    // If we got here, all attempts failed
    return NextResponse.json(
      {
        error: `Failed to deploy worker after ${MAX_RETRIES + 1} attempts`,
        lastError,
      },
      { status: 502 }
    );
  } catch (error: any) {
    // General error handler
    console.error(
      `LUSID API: Unhandled worker deployment error: ${error.message}`,
      error
    );
    return NextResponse.json(
      {
        error: 'Failed to deploy worker to LUSID API',
        message: error.message,
        type: error.constructor.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
