import { NextRequest, NextResponse } from 'next/server'
import { anthropic, MODELS } from '@/lib/anthropic'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { funds } = await req.json()
    if (!funds?.length) return NextResponse.json({ error: 'Aucun fonds' }, { status: 400 })

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await supabase.from('veille_log').select('*').gte('created_at', sixHoursAgo).order('created_at', { ascending: false }).limit(1).single()
    if (recent) return NextResponse.json({ ...recent.veille_json, cached: true, cached_at: recent.created_at })

    const fundsList = funds.map((f: any) => `- ${f.name} (${f.category}${f.isin ? ', ISIN: ' + f.isin : ''})`).join('\n')
    const prompt = `Tu es analyste financier senior spécialisé en gestion de patrimoine française.
Date : ${new Date().toLocaleDateString('fr-FR')}.
Watchlist CGP :
${fundsList}
Effectue une veille macro/micro récente et identifie les impacts sur ces fonds.
Réponds UNIQUEMENT en JSON valide sans backticks :
{"resume_marche":"...","niveau_risque_global":"modéré","alertes":[{"niveau":"attention","fonds_concernes":["..."],"titre":"...","detail":"...","action_recommandee":"..."}],"opportunites":[{"fonds_concernes":["..."],"titre":"...","detail":"..."}],"themes_macro":[{"theme":"...","tendance":"stable","impact":"..."}],"agenda_macro":[{"date":"JJ/MM","evenement":"...","impact_potentiel":"..."}]}`

    const response = await (anthropic.messages.create as any)({
      model: MODELS.veille,
      max_tokens: 2500,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    })

    let text = ''
    for (const block of response.content) if (block.type === 'text') text += block.text
    const veille = JSON.parse(text.replace(/```json|```/g, '').trim())
    await supabase.from('veille_log').insert({ veille_json: veille })
    return NextResponse.json(veille)
  } catch (error) {
    console.error('Erreur veille:', error)
    return NextResponse.json({ error: 'Erreur veille' }, { status: 500 })
  }
}
