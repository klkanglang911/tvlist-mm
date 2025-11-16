import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const htmlPath = join(process.cwd(), 'app', 'login-simple.html');
    const htmlContent = readFileSync(htmlPath, 'utf8');

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Login page not found' }, { status: 404 });
  }
}