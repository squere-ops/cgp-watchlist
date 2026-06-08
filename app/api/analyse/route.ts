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

    const prompt = 'Recherche le fonds dont le code ISIN est EXACTEMENT ' + isin + '. Utilise cet ISIN pour trouver le bon fonds sur quantalys.com ou morningstar.fr. Ne confonds pas avec un autre fonds. Profil investisseur: ' + profile + ', horizon: ' + horizon + '. Reponds en JSON uniquement sans backticks: {"nom":"nom exact du fonds","isin":"' + isin + '","gestionnaire":"societe de gestion","categorie":"type","verdict":"ENTRER","verdict_resume":"resume","contexte_macro":"contexte","analyse_fonds":"analyse","opportunite":"opportunite","risques":["r1","r2"],"catalyseurs":["c1","c2"],"adequation_profil":"adequation","signaux":{"momentum":"positif","valorisation":"attractive","risque_devise":"non","sensibilite_taux":"moyenne","liquidite":"haute"}}'

    const response = await (client.messages.create as any)({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    })

    let text = ''
    for (const block of response.content) {
      if ((block as any).type === 'text') text += (block as any).text
    }

    const clean = text.replace(/[`]{3}json/g, '').replace(/[`]{3}/g, '').trim()
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    if (start === -1 || end === -1) {
      return NextResponse.json({ error: 'Pas de JSON: ' + text.slice(0, 200) }, { status: 500 })
    }

    const analyse = JSON.parse(clean.slice(start, end + 1))
    const verdictMap: any = {'ENTRER':'ENTRER','ATTENDRE':'ATTENDRE','ÉVITER':'ÉVITER','EVITER':'ÉVITER','NEUTRE':'ATTENDRE','NE_PAS_ENTRER':'ÉVITER'}
    analyse.verdict = verdictMap[analyse.verdict] || 'ATTENDRE'

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
