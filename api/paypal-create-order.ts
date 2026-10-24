// Vercel Serverless Function (server only).
// PAYPAL_CLIENT_ID and PAYPAL_SECRET are read from env vars, never from the browser.

export const config = { runtime: 'edge' };

const BASE = 'https://api-m.sandbox.paypal.com';

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

async function getAccessToken(): Promise<string> {
    const id = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_SECRET;
    if (!id || !secret) throw new Error('PayPal not configured');

    const res = await fetch(`${BASE}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });
    if (!res.ok) throw new Error('PayPal auth failed');
    const data = await res.json();
    return data.access_token;
}

export default async function handler(req: Request): Promise<Response> {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    let amount: number;
    let description: string;
    try {
        const body = await req.json();
        amount = Number(body.amount);
        description = String(body.description ?? 'Spendora payment').slice(0, 120);
        if (!Number.isFinite(amount) || amount <= 0 || amount > 1000) throw new Error('bad amount');
    } catch {
        return json({ error: 'Invalid amount' }, 400);
    }

    try {
        const token = await getAccessToken();
        const origin = new URL(req.url).origin;

        const orderRes = await fetch(`${BASE}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        description,
                        amount: { currency_code: 'USD', value: amount.toFixed(2) },
                    },
                ],
                payment_source: {
                    paypal: {
                        experience_context: {
                            user_action: 'PAY_NOW',
                            return_url: `${origin}/?paypal=success`,
                            cancel_url: `${origin}/?paypal=cancel`,
                        },
                    },
                },
            }),
        });

        const order = await orderRes.json();
        if (!orderRes.ok) return json({ error: 'PayPal order failed', details: order }, 502);

        const link = (order.links ?? []).find(
            (l: { rel: string }) => l.rel === 'payer-action' || l.rel === 'approve'
        );
        return json({ id: order.id, status: order.status, approveUrl: link?.href ?? null });
    } catch {
        return json({ error: 'PayPal request failed' }, 502);
    }
}