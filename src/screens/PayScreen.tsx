import { useEffect, useRef, useState } from 'react';
import { Wallet, Send, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useExpenses } from '@/hooks/useData';
import { CATEGORIES, type Category } from '@/types';

interface Share {
    name: string;
    amount: number;
}

interface Plan {
    description: string;
    total: number;
    currency: string;
    yourShare: number;
    shares: Share[];
}

interface PayLink {
    name: string;
    amount: number;
    approveUrl: string | null;
}

async function postJson(url: string, body: unknown) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    let data: any = null;
    try {
        data = await res.json();
    } catch {
        data = null;
    }
    return { ok: res.ok, data };
}

export function PayScreen() {
    const { addExpense } = useExpenses();
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [plan, setPlan] = useState<Plan | null>(null);
    const [links, setLinks] = useState<PayLink[]>([]);
    const [recorded, setRecorded] = useState<number | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const handledReturn = useRef(false);

    // When PayPal sends the buyer back here, capture the approved payment.
    useEffect(() => {
        if (handledReturn.current) return;
        const params = new URLSearchParams(window.location.search);
        const status = params.get('paypal');
        const token = params.get('token');
        if (!status) return;
        handledReturn.current = true;
        window.history.replaceState({}, '', window.location.pathname);

        if (status === 'cancel') {
            setNotice('Payment was cancelled. No money moved.');
            return;
        }
        if (status === 'success' && token) {
            (async () => {
                const { ok, data } = await postJson('/api/paypal-capture-order', { orderId: token });
                if (ok && (data?.status === 'COMPLETED' || data?.status === 'PENDING')) {
                    setNotice(
                        data.status === 'PENDING'
                            ? `Payment sent: ${data.amount} ${data.currency} (PayPal sandbox, pending bank clearing)`
                            : `Payment received: ${data.amount} ${data.currency} (PayPal sandbox)`
                    );
                } else {
                    const issue = data?.details?.details?.[0]?.issue ?? data?.error ?? 'unknown';
                    setError(`Could not confirm that payment (${issue}).`);
                }
            })();
        }
    }, []);

    async function askNova() {
        setError(null);
        setNotice(null);
        setPlan(null);
        setLinks([]);
        setRecorded(null);
        if (!text.trim()) {
            setError('Tell Nova what to split, e.g. "split the $60 dinner with Rahul and Priya"');
            return;
        }
        setLoading(true);
        const { ok, data } = await postJson('/api/nova-split', { text });
        setLoading(false);
        if (!ok || !data || data.error) {
            setError(data?.error ?? 'Nova could not understand that. Try again.');
            return;
        }
        setPlan(data as Plan);
    }

    async function pickCategory(description: string): Promise<Category> {
        const { ok, data } = await postJson('/api/categorize', { text: description });
        if (ok && data && (CATEGORIES as readonly string[]).includes(data.category)) {
            return data.category as Category;
        }
        return 'Other';
    }

    async function createRequests() {
        if (!plan) return;
        setError(null);
        setLoading(true);
        const results = await Promise.all(
            plan.shares.map(async (s) => {
                const { ok, data } = await postJson('/api/paypal-create-order', {
                    amount: s.amount,
                    description: `${plan.description} - ${s.name}`,
                });
                return {
                    name: s.name,
                    amount: s.amount,
                    approveUrl: ok && data?.approveUrl ? (data.approveUrl as string) : null,
                };
            })
        );
        setLinks(results);

        // Save only the user's own share as their expense.
        if (results.some((r) => r.approveUrl) && plan.yourShare > 0) {
            const category = await pickCategory(plan.description);
            const { error: saveError } = await addExpense({
                amount: plan.yourShare,
                category,
                merchant: null,
                note: `${plan.description} (your share of $${plan.total.toFixed(2)})`.slice(0, 120),
                source: 'text',
            });
            if (!saveError) setRecorded(plan.yourShare);
        }
        setLoading(false);

        if (results.some((r) => !r.approveUrl)) {
            setError('Some payment links could not be created. Try again.');
        }
    }

    return (
        <div className="px-4 pt-8 pb-28 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl gradient-mint flex items-center justify-center shadow-glow">
                    <Wallet className="w-5 h-5 text-slate-900" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-white">Nova Pay</h1>
                    <p className="text-sm text-slate-400">Split a bill in plain English, then collect with PayPal</p>
                </div>
            </div>

            {notice && (
                <div className="glass rounded-2xl p-4 mb-4 flex items-center gap-2 text-mint-300">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span className="text-sm">{notice}</span>
                </div>
            )}

            <div className="glass rounded-3xl p-5 space-y-3">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={3}
                    maxLength={300}
                    placeholder='e.g. "split the $60 dinner with Rahul and Priya"'
                    className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 outline-none"
                />
                <button
                    onClick={askNova}
                    disabled={loading}
                    className="btn-press w-full gradient-mint text-slate-900 font-semibold rounded-2xl px-4 py-3 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                    <Send className="w-4 h-4" />
                    {loading && !plan ? 'Nova is thinking…' : 'Ask Nova'}
                </button>
            </div>

            {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

            {plan && (
                <div className="glass rounded-3xl p-5 mt-5 space-y-3">
                    <p className="text-white font-medium">
                        {plan.description}: ${plan.total.toFixed(2)} total
                    </p>
                    <p className="text-sm text-slate-400">Your share: ${plan.yourShare.toFixed(2)}</p>
                    <ul className="space-y-2">
                        {plan.shares.map((s) => (
                            <li key={s.name} className="flex justify-between text-slate-200">
                                <span>{s.name}</span>
                                <span>${s.amount.toFixed(2)}</span>
                            </li>
                        ))}
                    </ul>
                    {links.length === 0 && (
                        <button
                            onClick={createRequests}
                            disabled={loading}
                            className="btn-press w-full gradient-mint text-slate-900 font-semibold rounded-2xl px-4 py-3 disabled:opacity-60"
                        >
                            {loading ? 'Creating PayPal requests…' : 'Create PayPal payment requests'}
                        </button>
                    )}
                </div>
            )}

            {links.length > 0 && (
                <div className="glass rounded-3xl p-5 mt-5 space-y-3">
                    <p className="text-white font-medium">Payment links (PayPal sandbox)</p>
                    {links.map((l) => (
                        <div key={l.name} className="flex items-center justify-between text-slate-200">
                            <span>
                                {l.name} · ${l.amount.toFixed(2)}
                            </span>
                            {l.approveUrl ? (
                                <a
                                    href={l.approveUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-mint-300 underline"
                                >
                                    Pay <ExternalLink className="w-4 h-4" />
                                </a>
                            ) : (
                                <span className="text-red-300 text-sm">failed</span>
                            )}
                        </div>
                    ))}
                    {recorded !== null && (
                        <p className="text-sm text-slate-400 pt-1">
                            Your ${recorded.toFixed(2)} share was added to your expenses.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}