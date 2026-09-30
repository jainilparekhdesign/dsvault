import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { currentOwner } from './owner';

type Handler<P> = (owner: string, req: Request, ctx: { params: P }) => Promise<Response>;

/** Wraps a route handler: 401 when signed out, 400 on validation errors. */
export function withOwner<P = Record<string, string>>(fn: Handler<P>) {
  return async (req: Request, ctx: { params: P }) => {
    const owner = await currentOwner();
    if (!owner) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    try {
      return await fn(owner, req, ctx);
    } catch (err) {
      if (err instanceof ZodError) return NextResponse.json({ error: 'That content isn’t valid.', issues: err.issues.slice(0, 5) }, { status: 400 });
      if (err instanceof Error && err.name === 'ImportError') return NextResponse.json({ error: err.message }, { status: 400 });
      console.error(err);
      return NextResponse.json({ error: 'Something went wrong on the server.' }, { status: 500 });
    }
  };
}

export const notFound = () => NextResponse.json({ error: 'That system doesn’t exist.' }, { status: 404 });
