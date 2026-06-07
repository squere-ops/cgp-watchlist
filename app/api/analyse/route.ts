import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { isin, profile, horizon, fundContext } = await req.json()

    if (!isin || isin.length < 10) {
      return NextResponse.json({ error: 'ISIN invalide' }, { status: 400 })
    }

    const prompt = [
      'Tu es un analyste financier senior specialise en gestion de patrimoine française.',
      'Analyse le fonds ISIN ' + isin + ' pour un CGP français.',
      fundContext ? 'Contexte watchlist: ' + fundContext : '',
      'Profil investisseur: ' + (profile || 'Equilibre') + ', horizon ' + (horizon || '2-5 ans') + '.',
      'Date: ' + new Date().toLocaleDateString('fr-FR'),
      '',
      'Reponds UNIQUEMENT avec un objet JSON valide. Aucun texte avant ou apres. Aucun backtick.',
      'Format exact:',
      '{"nom":"nom complet","isin":"' + isin + '","gestionnaire":"societe","categorie":"type","verdict":"ENTRER","verdict_resume":"resume","contexte_macro":"contexte","analyse_fonds":"analyse","opportunite":"opportunite","risques":["risque1","risque2"],"catalyseurs":["cat1","cat2"],"adequation_profil":"adequation","signaux":{"momentum":"positif","valorisation":"attractive","risque_devise":"non","sensibilite_taux":"moyenne","liquidite":"haute"}}'
    ].join('\n')

    const response = await (anthropic.messages.create as any)({
      model: 'claude-opus-4-8',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    })

    let text = ''
    for (const block of response.content) {
      if (block.type === 'text') text += block.text
    }

    // Extraire le JSON de la réponse
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Pas de JSON dans la réponse: ' + text.slice(0, 200))
    }

    const analyse = JSON.parse(jsonMatch[0])

    // Sauvegarder en base
    const { data: fund } = await supabase
      .from('funds')
      .select('id')
      .eq('isin', isin)
      .single()

    await supabase.from('analyse_history').insert({
      fund_id: fund?.id || null,
      isin,
      verdict: analyse.verdict,
      analyse_json: analyse,
    })

    return NextResponse.json(analyse)

  } catch (error: any) {
    console.error('Erreur analyse:', error.message)
    return NextResponse.json(
      { error: 'Erreur: ' + error.message },
      { status: 500 }
    )
  }
}
