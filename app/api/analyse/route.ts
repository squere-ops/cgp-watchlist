import { NextRequest, NextResponse } from 'next/server'
import { anthropic, MODELS } from '@/lib/anthropic'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { isin, profile, horizon, fundContext } = await req.json()
    if (!isin || isin.length < 10) return NextResponse.json({ error: 'ISIN invalide' }, { status: 400 })

    const prompt = `Tu es un analyste financier senior spécialisé en gestion de patrimoine française.
Analyse le fonds ISIN ${isin} pour un CGP français.
${fundContext ? 'Contexte : ' + fundContext : ''}
Profil : ${profile || 'Équilibré'}, horizon ${horizon || '2-5 ans'}. Date : ${new Date().toLocaleDateString('fr-FR')}.
Recherche les infos actuelles sur ce fonds (VL, performances, contexte macro).
Réponds UNIQUEMENT en JSON valide sans backticks :
{"nom":"...","isin":"${isin}","gestionnaire":"...","categorie":"...","vl_trouvee":null,"vl_date":null,"verdict":"ENTRER","verdict_resume":"...","contexte_macro":"...","analyse_fonds":"...","opportunite":"...","risques":["..."],"catalyseurs":["..."],"adequation_profil":"...","signaux":{"momentum":"positif","valorisation":"attractive","risque_devise":"non","sensibilite_taux":"moyenne","liquidite":"haute"}}`

    const response = await (anthropic.messages.create as any)({
      model: MODELS.analyse,
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    })

    let text = ''
    for (const block of response.content) if (block.type === 'text') text += block.text
    const analyse = JSON.parse(text.replace(/```json|```/g, '').trim())

    const { data: fund } = await supabase.from('funds').select('id').eq('isin', isin).single()
    await supabase.from('analyse_history').insert({ fund_id: fund?.id || null, isin, verdict: analyse.verdict, analyse_json: analyse })

    if (analyse.vl_trouvee && fund?.id) {
      await supabase.from('vl_history').upsert({ fund_id: fund.id, vl: analyse.vl_trouvee, recorded_at: new Date().toISOString().split('T')[0], source: 'auto' }, { onConflict: 'fund_id,recorded_at' })
    }
    return NextResponse.json(analyse)
  } catch (error) {
    console.error('Erreur analyse:', error)
    return NextResponse.json({ error: 'Erreur lors de l analyse' }, { status: 500 })
  }
}
