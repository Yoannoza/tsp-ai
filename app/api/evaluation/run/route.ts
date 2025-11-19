import { NextResponse } from 'next/server';

// Evaluation APIs removed — return gone
export async function POST() {
  return new NextResponse(JSON.stringify({
    success: false,
    error: 'Evaluation APIs removed'
  }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function GET() {
  return new NextResponse(JSON.stringify({
    message: 'Evaluation APIs removed'
  }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' }
  });
}
