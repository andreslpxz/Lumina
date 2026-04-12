import { NextResponse } from 'next/server';
import { sandboxManager } from '@/lib/e2b/sandbox';

export async function GET() {
  const url = sandboxManager.getPreviewUrl();
  return NextResponse.json({ url });
}
