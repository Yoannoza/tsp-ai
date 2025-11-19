import { NextResponse } from 'next/server';

// Evaluation features were removed. Keep the route to return a clear status
export async function GET() {
  return new NextResponse(JSON.stringify({
    success: false,
    error: 'Evaluation APIs removed'
  }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' }
  });
}
