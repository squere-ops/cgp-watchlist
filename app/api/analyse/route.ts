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

    if (!isin || isin.length < 10) {
      return NextResponse.json({ error: 'ISIN invalide' }, { status: 400 })
    }

    const prompt = `Tu es un analyste financier senior CGP français. Analyse le fonds ISIN ${isin}.
Cherche sur quantalys.com, morningstar.fr, boursorama.com, linxea.com et les sites des societes de gestion.
Profil investisseur: ${profile}, horizon: ${horizon}.
Date: ${new Date().toLocaleDateString('fr-FR')}.

Reponds UNIQUEMENT avec un objet JSON valide, aucun texte avant ou apres:
{"nom":"nom complet du fonds","isin":"${isin}","gestionnaire":"societe de gestion","categorie":"classe actif","verdict":"ENTRER","verdict_resume":"resume en 1 phrase","contexte_macro":"analyse macro actuelle","analyse_fonds":"analyse detaillee du fonds","opportunite":"pourquoi entrer maintenant","risques":["risque 1","risque 2","risque 3"],"catalyseurs":["catalyseur 1","catalyseur 2"],"adequation_profil":"adequation avec le profil","signaux":{"momentum":"positif ou negatif ou neutre","valorisation":"attractive ou chère ou neutre","risque_devise":"oui ou non","sensibilite_taux":"haute ou moyenne ou faible","liquidite":"haute ou moyenne ou faible"}}`

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

    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) {
      return NextResponse.json({ error: 'Pas de JSON: ' + text.slice(0, 200) }, { status: 500 })
    }

    const analyse = JSON.parse(text.slice(start, end + 1))

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
