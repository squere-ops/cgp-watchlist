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
    const isin = String(body.isin || '').trim().toUpperCase()
    const profile = String(body.profile || 'Equilibre')
    const horizon = String(body.horizon || '2-5 ans')
    const force = body.force === true

    if (!isin || isin.length < 10) {
      return NextResponse.json({ error: 'ISIN invalide' }, { status: 400 })
    }

    if (!force) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: cached } = await supabase
        .from('analyse_history')
        .select('*')
        .eq('isin', isin)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(1)
      if (cached && cached.length > 0) {
        return NextResponse.json({ ...cached[0].analyse_json, cached: true })
      }
    }

    const prompt = 'Tu es analyste CGP français. Analyse le fonds ISIN ' + isin + ' (profil ' + profile + ', horizon ' + horizon + '). Reponds avec un JSON valide uniquement, sans texte avant ou apres: {"nom":"...","isin":"' + isin + '","gestionnaire":"...","categorie":"...","verdict":"ENTRER","verdict_resume":"...","contexte_macro":"...","analyse_fonds":"...","opportunite":"...","risques":["..."],"catalyseurs":["..."],"adequation_profil":"...","signaux":{"momentum":"positif","valorisation":"attractive","risque_devise":"non","sensibilite_taux":"moyenne","liquidite":"haute"}}'

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    let text = ''
    for (const block of response.content) {
      if (block.type === 'text') text += block.text
    }

    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) {
      return NextResponse.json({ error: 'Reponse: ' + text.slice(0, 300) }, { status: 500 })
    }

    const analyse = JSON.parse(text.slice(start, end + 1))
    const { data: fund } = await supabase.from('funds').select('id').eq('isin', isin).single()
    try {
      await supabase.from('analyse_history').insert({
        fund_id: fund?.id || null, isin, verdict: analyse.verdict, analyse_json: analyse,
      })
    } catch {}

    return NextResponse.json(analyse)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
