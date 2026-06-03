import { NextRequest, NextResponse } from 'next/server'
import { anthropic, MODELS } from '@/lib/anthropic'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const { data: funds } = await supabase.from('funds').select('id, name, isin').not('isin', 'is', null)
    if (!funds?.length) return NextResponse.json({ message: 'Aucun fonds' })
    const today = new Date().toISOString().split('T')[0]
    const results: any[] = []
    for (let i = 0; i < funds.length; i += 3) {
      const batch = funds.slice(i, i + 3)
      const prompt = `Trouve la VL la plus récente pour ces fonds. Cherche sur Boursorama, Morningstar.
${batch.map(f => `- ${f.name} (ISIN: ${f.isin})`).join('\n')}
Réponds UNIQUEMENT en JSON sans backticks :
[{"isin":"...","vl":123.45,"date":"YYYY-MM-DD","trouve":true}]`
      try {
        const response = await (anthropic.messages.create as any)({
          model: MODELS.vl, max_tokens: 500,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{ role: 'user', content: prompt }],
        })
        let text = ''
        for (const block of response.content) if (block.type === 'text') text += block.text
        const vlResults = JSON.parse(text.replace(/```json|```/g, '').trim())
        for (const result of vlResults) {
          const fund = batch.find(f => f.isin === result.isin)
          if (!fund) continue
          if (result.trouve && result.vl) {
            await supabase.from('vl_history').upsert({ fund_id: fund.id, vl: result.vl, recorded_at: result.date || today, source: 'auto' }, { onConflict: 'fund_id,recorded_at' })
            results.push({ fund: fund.name, status: 'ok', vl: result.vl })
          } else results.push({ fund: fund.name, status: 'non_trouve' })
        }
      } catch { for (const f of batch) results.push({ fund: f.name, status: 'erreur' }) }
      await new Promise(r => setTimeout(r, 2000))
    }
    return NextResponse.json({ date: today, total: funds.length, results })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur VL auto' }, { status: 500 })
  }
}
