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
    const body = await req.json()
    const isin = body.isin || ''
    const profile = body.profile || 'Equilibre'
    const horizon = body.horizon || '2-5 ans'

    if (!isin || isin.length < 10) {
      return NextResponse.json({ error: 'ISIN invalide' }, { status: 400 })
    }

    const prompt = 'Tu es analyste financier CGP. Analyse le fonds ISIN ' + isin + '. Profil: ' + profile + '. Horizon: ' + horizon + '. Reponds UNIQUEMENT avec du JSON valide, sans texte avant ou apres, sans backticks. Format: {"nom":"...","isin":"' + isin + '","gestionnaire":"...","categorie":"...","verdict":"ENTRER","verdict_resume":"...","contexte_macro":"...","analyse_fonds":"...","opportunite":"...","risques":["..."],"catalyseurs":["..."],"adequation_profil":"...","signaux":{"momentum":"positif","valorisation":"attractive","risque_devise":"non","sensibilite_taux":"moyenne","liquidite":"haute"}}'

    const response = await (client.messages.create as any)({
      model: 'claude-opus-4-8',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    })

    let text = ''
    for (const block of response.content) {
      if ((block as any).type === 'text') text += (block as any).text
    }

    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      return NextResponse.json({ error: 'Pas de JSON: ' + text.slice(0, 100) }, { status: 500 })
    }

    const analyse = JSON.parse(match[0])

    const { data: fund } = await supabase.from('funds').select('id').eq('isin', isin).single()
    try {
      await supabase.from('analyse_history').insert({
        fund_id: fund?.id || null,
        isin,
        verdict: analyse.verdict,
        analyse_json: analyse,
      })
    } catch {}

    return NextResponse.json(analyse)

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur inconnue' }, { status: 500 })
  }
}
