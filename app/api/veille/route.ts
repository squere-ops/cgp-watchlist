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

    const fundsList = funds.slice(0, 3).map((f: any) => f.name).join(', ')
    const prompt = `Briefing CGP du ${new Date().toLocaleDateString('fr-FR')} pour fonds: ${fundsList}. JSON: {"resume_marche":"marche actuel en 2 phrases","niveau_risque_global":"modere","alertes":[],"opportunites":[],"themes_macro":[{"theme":"taux BCE","tendance":"stable","impact":"favorable obligations"}],"agenda_macro":[{"date":"prochaine semaine","evenement":"reunions banques centrales","impact_potentiel":"modere"}]}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    let text = ''
    for (const block of response.content) {
      if (block.type === 'text') text += block.text
    }

    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) return NextResponse.json({ error: 'Pas de JSON' }, { status: 500 })

    const veille = JSON.parse(text.slice(start, end + 1))
    return NextResponse.json(veille)

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
