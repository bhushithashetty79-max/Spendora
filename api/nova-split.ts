// Vercel Serverless Function (server only).
// Nova reads a split request in plain English and returns who owes what.
// The AI only EXTRACTS (total, description, names). The math is done here in code.

export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `You extract a bill-splitting request into JSON.
Return ONLY a JSON object, no other text, matching exactly this shape:
{"total": number or null, "description": short 2-5 word summary, "participants": [first names of the OTHER people], "includeSelf": boolean}

Rules:
- total is the full bill amount as a plain number (no currency symbol). If no amount is given, use null.
- participants are only the people the user wants to split WITH, not the user.
- includeSelf is true if the user is also paying a share (default true, e.g. "split with Rahul" means user and Rahul each pay). It is false only if the user clearly says they are NOT paying, e.g. "Rahul and Priya owe me for dinner, I already paid my part".
- Never invent names or amounts that are not in the message.`;

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export default async function handler(req: Request): Promise<Response> {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return json({ error: 'Nova is not configured' }, 501);

    let text: string;
    try {
        const body = await req.json();
        text = String(body.text ?? '').slice(0, 300);
        if (!text.trim()) throw new Error('empty');
    } catch {
        return json({ error: 'Missing text' }, 400);
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
                temperature: 0.1,
                max_tokens: 200,
                response_format: { type: 'json_object' },
            }),
        });

        if (!groqRes.ok) return json({ error: 'AI request failed' }, 502);

        const data = await groqRes.json();
        const parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? '{}');

        const total = Number(parsed.total);
        const names: string[] = Array.isArray(parsed.participants)
            ? parsed.participants
                .map((n: unknown) => String(n).trim().slice(0, 30))
                .filter((n: string) => n.length > 0)
                .slice(0, 10)
            : [];
        const includeSelf = parsed.includeSelf !== false;

        if (!Number.isFinite(total) || total <= 0 || total > 1000) {
            return json({ error: 'I could not find a valid amount. Try: "split the $60 dinner with Rahul"' }, 422);
        }
        if (names.length === 0) {
            return json({ error: 'I could not find who to split with. Try: "split the $60 dinner with Rahul"' }, 422);
        }

        // Math in code, in cents, so the shares always add up exactly.
        const totalCents = Math.round(total * 100);
        const headcount = names.length + (includeSelf ? 1 : 0);
        const baseShare = Math.floor(totalCents / headcount);
        const remainder = totalCents - baseShare * headcount;

        const shares = names.map((name, i) => ({
            name,
            amount: (baseShare + (i < remainder ? 1 : 0)) / 100,
        }));
        const yourShare = includeSelf ? (totalCents - shares.reduce((s, p) => s + Math.round(p.amount * 100), 0)) / 100 : 0;

        const description =
            typeof parsed.description === 'string' && parsed.description.trim()
                ? parsed.description.trim().slice(0, 60)
                : 'Split bill';

        return json({ description, total, currency: 'USD', yourShare, shares });
    } catch {
        return json({ error: 'Nova could not understand that' }, 502);
    }
}