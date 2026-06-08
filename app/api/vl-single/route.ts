import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { fundId, fundName, isin } = await req.json()

    const response = await (client.messages.create as any)({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: 'Trouve la valeur liquidative (VL) la plus recente du fonds ' + fundName + ' ISIN ' + isin + ' sur quantalys.com ou morningstar.fr. Reponds JSON uniquement: {"vl":123.45,"date":"YYYY-MM-DD"}' }],
    })

    let text = ''
    for (const block of response.content) {
      if ((block as any).type === 'text') text += (block as any).text
    }

    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) return NextResponse.json({ error: 'VL non trouvee' }, { status: 500 })

    const data = JSON.parse(text.slice(start, end + 1))
    if (data.vl) {
      const today = data.date || new Date().toISOString().split('T')[0]
      await supabase.from('vl_history').upsert({
        fund_id: fundId, vl: data.vl, recorded_at: today, source: 'auto'
      }, { onConflict: 'fund_id,recorded_at' })
    }
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
