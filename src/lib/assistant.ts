import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-5';
const MAX_TURNS = 12;

export interface ChatTurn {
    role: 'user' | 'assistant';
    content: string;
}

const SYSTEM = `You are the Shakti Yoga guide — a warm, encouraging assistant inside the Shakti Yoga member app (a small online studio running daily live yoga classes over Google Meet, plus 1:1 yoga therapy).

Your role:
- Answer questions about yoga, breathing (pranayama), meditation, mobility, mindfulness, rest, and general wellbeing.
- Suggest simple practices the member can try, described in plain steps.
- Point members toward their classes, the app's guided practices, and 1:1 therapy when relevant.
- Keep replies short and practical — usually 2–5 sentences or a short list. Speak plainly, no jargon dumps.

Hard rules:
- You are NOT a doctor or physiotherapist. Do not diagnose, do not name conditions, do not give medical, injury, or rehab advice. If someone describes pain, injury, pregnancy, a medical condition, dizziness, or anything health-related, gently tell them to check with their doctor or a qualified physiotherapist first, and suggest they mention it to their Shakti Yoga teacher who can adapt the practice.
- No advice on medication, supplements, diets for medical purposes, or fasting.
- Stay on topic. If asked about something unrelated to yoga, wellbeing, or the studio, briefly say it's outside what you can help with here.
- Never claim yoga cures or treats any illness.
- Be honest when you don't know. Don't invent class times, prices, or studio policies — tell them to check the app or ask the studio.`;

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
    if (!process.env.ANTHROPIC_API_KEY) return null;
    if (!client) client = new Anthropic();
    return client;
}

export function assistantAvailable(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
}

interface AskResult {
    ok: boolean;
    reply: string;
}

/** Send the recent conversation to Claude and return the assistant's reply. */
export async function askAssistant(turns: ChatTurn[]): Promise<AskResult> {
    const c = getClient();
    if (!c) return { ok: false, reply: 'The assistant is not available right now.' };

    const history = turns
        .filter((t) => (t.role === 'user' || t.role === 'assistant') && t.content.trim())
        .slice(-MAX_TURNS)
        .map((t) => ({ role: t.role, content: t.content.slice(0, 4000) }));

    if (history.length === 0 || history[history.length - 1].role !== 'user') {
        return { ok: false, reply: 'Ask me something about your practice.' };
    }

    try {
        const res = await c.messages.create({
            model: MODEL,
            max_tokens: 800,
            thinking: { type: 'adaptive' },
            output_config: { effort: 'low' },
            system: SYSTEM,
            messages: history,
        });

        if (res.stop_reason === 'refusal') {
            return { ok: false, reply: "I can't help with that one. Try asking about your yoga or breathing practice." };
        }

        const text = res.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map((b) => b.text)
            .join('')
            .trim();

        return text
            ? { ok: true, reply: text }
            : { ok: false, reply: 'I didn’t catch that — could you rephrase?' };
    } catch (error) {
        console.error('[assistant] failed', error);
        return { ok: false, reply: 'The assistant had trouble responding. Please try again in a moment.' };
    }
}
