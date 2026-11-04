import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveDerivToken } from '../../../lib/platform-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED = new Set(["auth.js","dashboard-metrics.js","deriv-realtime.js","history-target-fix.js","language-context.js","language-symbols-fix.js","live-analysis.js","professional-ui.js","risk-warning.js","safe-start-confirm.js","slogan.js","stake-controls-596.js","stake-controls.js","theme-toggle.js","trading-enhancements.js","ui-layout-symbol-fix.js"]);

export async function GET(request: NextRequest, context: { params: Promise<{ file: string }> }) {
  try {
    const session = await resolveDerivToken(request);
    if (!session) return new NextResponse(null, {status:404,headers:{'Cache-Control':'no-store'}});
    const {file}=await context.params;
    if (!ALLOWED.has(file) || !file.endsWith('.js')) return new NextResponse(null,{status:404,headers:{'Cache-Control':'no-store'}});
    const source=await readFile(join(process.cwd(),'private','dashboard-assets',file),'utf8');
    return new NextResponse(source,{status:200,headers:{
      'Content-Type':'application/javascript; charset=utf-8',
      'Cache-Control':'private, no-store, max-age=0',
      'Vary':'Cookie',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'same-origin',
    }});
  } catch (error) {
    console.error('Protected dashboard asset error:',error instanceof Error?error.message:'unknown');
    return new NextResponse(null,{status:404,headers:{'Cache-Control':'no-store'}});
  }
}
