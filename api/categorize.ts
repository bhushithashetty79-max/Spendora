// Vercel Serverless Function.
// Runs on the server only — the GROQ_API_KEY env var here is NEVER sent to the browser
// (unlike VITE_ prefixed vars, which do get bundled into client code).
//
// Set GROQ_API_KEY in Vercel: Project → Settings → Environment Variables
// (no VITE_ prefix — this one must stay server-side).

export const config = { runtime: 'edge' };

const CATEGORIES = ['Food', 'Travel', 'Education', 'Entertainment', 'Shopping', 'Bills', 'Other'] as const;

const SYSTEM_PROMPT = `You classify a single student expense description into structured data.
Return ONLY a JSON object, no other text, matching exactly this shape:
{"category": one of ${JSON.stringify(CATEGORIES)}, "merchant": string or null, "note": a short 2-5 word summary}

Rules:
- Pick the category by MEANING, not just keyword matching. E.g. "monthly cab pass" -> Travel, "grabbed a bite" -> Food, "new headphones" -> Shopping.
- If genuinely ambiguous or unrelated to any category, use "Other".
- merchant: a proper-noun business/place name if mentioned (e.g. "Zomato", "The Mess"), else null.
- note: short human-readable summary of what was bought, not the raw input text.
- Never include an amount or currency in your response — that is handled separately.`;

export default async function handler(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'AI categorization not configured' }), { status: 501 });
    }

    let text: string;
    try {
        const body = await req.json();
        text = String(body.text ?? '').slice(0, 300);
        if (!text.trim()) throw new Error('empty');
    } catch {
        return new Response(JSON.stringify({ error: 'Missing text' }), { status: 400 });
    }

    try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-20b',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: text },
                ],
                temperature: 0.2,
                max_tokens: 150,
                response_format: { type: 'json_object' },
            }),
        });

        if (!groqRes.ok) {
            return new Response(JSON.stringify({ error: 'AI request failed' }), { status: 502 });
        }

        const data = await groqRes.json();
        const raw = data?.choices?.[0]?.message?.content ?? '{}';
        const parsed = JSON.parse(raw);

        const category = CATEGORIES.includes(parsed.category) ? parsed.category : 'Other';
        const merchant = typeof parsed.merchant === 'string' && parsed.merchant.trim() ? parsed.merchant.trim() : null;
        const note = typeof parsed.note === 'string' && parsed.note.trim() ? parsed.note.trim().slice(0, 60) : null;

        return new Response(JSON.stringify({ category, merchant, note }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch {
        return new Response(JSON.stringify({ error: 'AI categorization failed' }), { status: 502 });
    }
}