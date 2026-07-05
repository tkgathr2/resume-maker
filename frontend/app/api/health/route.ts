import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'resume-maker', version: '1.0.0' });
}
