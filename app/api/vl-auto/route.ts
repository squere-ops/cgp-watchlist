import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== 'Bearer ' + process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  const { data: funds } = await supabase.from('funds').select('id, name, isin').not('isin', 'is', null)
  if (!funds?.length) return NextResponse.json({ message: 'Aucun fonds' })

  const today = new Date().toISOString().split('T')[0]
  const results: any[] = []

  for (const fund of funds) {
    try {
      const response = await (client.messages.create as any)({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: 'Trouve la valeur liquidative (VL ou NAV) la plus recente du fonds ISIN ' + fund.isin + ' (' + fund.name + '). Reponds JSON uniquement: {"vl":123.45,"date":"YYYY-MM-DD"}' }],
      })
      let text = ''
      for (const block of response.content) {
        if ((block as any).type === 'text') text += (block as any).text
      }
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start !== -1 && end !== -1) {
        const data = JSON.parse(text.slice(start, end + 1))
        if (data.vl) {
          await supabase.from('vl_history').upsert({
            fund_id: fund.id,
            vl: data.vl,
            recorded_at: data.date || today,
            source: 'auto'
          }, { onConflict: 'fund_id,recorded_at' })
          results.push({ fund: fund.name, status: 'ok', vl: data.vl })
        } else {
          results.push({ fund: fund.name, status: 'non_trouve' })
        }
      } else {
        results.push({ fund: fund.name, status: 'non_trouve' })
      }
    } catch (e: any) {
      results.push({ fund: fund.name, status: 'erreur', error: e.message })
    }
    await new Promise(r => setTimeout(r, 1000))
  }

  return NextResponse.json({ date: today, total: funds.length, results })
}
