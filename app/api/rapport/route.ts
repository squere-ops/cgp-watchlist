import { NextRequest, NextResponse } from 'next/server'
import { anthropic, MODELS } from '@/lib/anthropic'
import { supabase } from '@/lib/supabase'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { clientId } = await req.json()
    const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single()
    if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    const { data: portfolio } = await supabase.from('client_portfolio').select('*').eq('client_id', clientId)
    const portfolioSummary = (portfolio || []).map((p: any) => `- ${p.fund_name}: VL entrée ${p.vl_entree}€ → actuelle ${p.vl_actuelle || 'N/A'}€, Perf: ${p.perf_pct !== null ? p.perf_pct + '%' : 'N/A'}`).join('\n')
    const prompt = `Rédige un rapport de suivi client CGP professionnel.
CLIENT : ${client.name}, profil ${client.profile}, horizon ${client.horizon}, enveloppe ${client.envelope}
PORTEFEUILLE : ${portfolioSummary || 'Aucune position'}
Date : ${new Date().toLocaleDateString('fr-FR')}
Réponds UNIQUEMENT en JSON sans backticks :
{"titre":"...","date":"...","synthese_executive":"...","analyse_portefeuille":"...","recommandations":[{"priorite":"haute","action":"...","justification":"..."}],"mention_legale":"Ce document est établi à titre informatif et ne constitue pas un conseil en investissement au sens de la directive MIF2."}`
    const response = await anthropic.messages.create({ model: MODELS.analyse, max_tokens: 2000, messages: [{ role: 'user', content: prompt }] })
    let text = ''
    for (const block of response.content) if (block.type === 'text') text += block.text
    const rapport = JSON.parse(text.replace(/```json|```/g, '').trim())
    return NextResponse.json({ rapport, client, portfolio: portfolio || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur rapport' }, { status: 500 })
  }
}
