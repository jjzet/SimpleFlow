import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to update an existing event handler in LUSID
 * PUT /workflow/api/eventhandlers/{scope}/{code}
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { scope: string; code: string } }
) {
  try {
    const { scope, code } = params;
    const { requestBody, baseUrl, accessToken } = await request.json();

    if (!scope || !code || !baseUrl || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Call LUSID API to update the event handler
    const lusidEndpoint = `${baseUrl}/workflow/api/eventhandlers/${encodeURIComponent(scope)}/${encodeURIComponent(code)}`;

    const response = await fetch(lusidEndpoint, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: 'Failed to update event handler', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating event handler:', error);
    return NextResponse.json(
      {
        error: 'Failed to update event handler',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
