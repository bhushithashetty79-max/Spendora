// Vercel Serverless Function (server only).
// Captures a PayPal order after the buyer has approved it.

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

    let orderId: string;
    try {
        const body = await req.json();
        orderId = String(body.orderId ?? '');
        if (!/^[A-Za-z0-9]{10,30}$/.test(orderId)) throw new Error('bad id');
    } catch {
        return json({ error: 'Invalid orderId' }, 400);
    }

    try {
        const token = await getAccessToken();

        const capRes = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await capRes.json();
        if (!capRes.ok) return json({ error: 'PayPal capture failed', details: data }, 502);

        const capture = data?.purchase_units?.[0]?.payments?.captures?.[0];
        return json({
            orderId: data.id,
            status: data.status,
            captureId: capture?.id ?? null,
            amount: capture?.amount?.value ?? null,
            currency: capture?.amount?.currency_code ?? null,
        });
    } catch {
        return json({ error: 'PayPal request failed' }, 502);
    }
}