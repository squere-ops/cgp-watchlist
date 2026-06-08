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
    const { funds } = await req.json()
    if (!funds?.length) return NextResponse.json({ error: 'Aucun fonds' }, { status: 400 })

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await supabase.from('veille_log').select('*').gte('created_at', sixHoursAgo).order('created_at', { ascending: false }).limit(1)
    if (recent && recent.length > 0) {
      return NextResponse.json({ ...recent[0].veille_json, cached: true, cached_at: recent[0].created_at })
    }

    const fundsList = funds.map((f: any) => `- ${f.name} (${f.category}${f.isin ? ', ISIN: ' + f.isin : ''})`).join('\n')

    const prompt = `Tu es analyste financier senior CGP français. Date: ${new Date().toLocaleDateString('fr-FR')}.
Watchlist CGP:
${fundsList}

Effectue une veille macro et micro recente et identifie les impacts sur ces fonds.
Reponds UNIQUEMENT avec un objet JSON valide, aucun texte avant ou apres:
{"resume_marche":"resume en 2-3 phrases","niveau_risque_global":"faible ou modere ou eleve","alertes":[{"niveau":"attention ou urgent","fonds_concernes":["nom"],"titre":"titre alerte","detail":"detail","action_recommandee":"action"}],"opportunites":[{"fonds_concernes":["nom"],"titre":"titre","detail":"detail"}],"themes_macro":[{"theme":"theme","tendance":"hausse ou baisse ou stable","impact":"impact sur portefeuille"}],"agenda_macro":[{"date":"JJ/MM","evenement":"evenement","impact_potentiel":"impact"}]}`

    const response = await (client.messages.create as any)({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
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
      return NextResponse.json({ error: 'Pas de JSON' }, { status: 500 })
    }

    const veille = JSON.parse(text.slice(start, end + 1))
    await supabase.from('veille_log').insert({ veille_json: veille })
    return NextResponse.json(veille)

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
