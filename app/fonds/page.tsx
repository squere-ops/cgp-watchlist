'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const VC: any = {
  ENTRER: { color: '#2d6e42', bg: '#e8f5ec', border: '#b8dfc5', emoji: '🟢', score: 8 },
  ATTENDRE: { color: '#8a6e30', bg: '#fef8ed', border: '#e8d5a0', emoji: '🟡', score: 5 },
  'ÉVITER': { color: '#9e3a28', bg: '#fdecea', border: '#e8b5ad', emoji: '🔴', score: 2 },
}

export default function FondsPage() {
  const [funds, setFunds] = useState<any[]>([])
  const [vlLatest, setVlLatest] = useState<any>({})
  const [analyses, setAnalyses] = useState<any>({})
  const [editFund, setEditFund] = useState<any>(null)
  const [detailAnalyse, setDetailAnalyse] = useState<any>(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    const [{ data: f }, { data: h }, { data: a }] = await Promise.all([
      supabase.from('funds').select('*').order('name'),
      supabase.from('vl_history').select('*').order('recorded_at', { ascending: false }),
      supabase.from('analyse_history').select('*').order('created_at', { ascending: false })
    ])
    setFunds(f || [])
    const latest: any = {}
    ;(h || []).forEach((v: any) => { if (!latest[v.fund_id]) latest[v.fund_id] = v })
    setVlLatest(latest)
    const lastA: any = {}
    ;(a || []).forEach((an: any) => { if (!lastA[an.isin]) lastA[an.isin] = an })
    setAnalyses(lastA)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = funds.filter(f =>
    (filter === 'all' || f.category === filter) &&
    (!search || f.name.toLowerCase().includes(search.toLowerCase()) || (f.isin || '').includes(search.toUpperCase()))
  )

  const saveEdit = async () => {
    if (!editFund) return
    await supabase.from('funds').update({
      name: editFund.name, isin: editFund.isin || null,
      manager: editFund.manager || null, category: editFund.category, notes: editFund.notes || null
    }).eq('id', editFund.id)
    setEditFund(null); load()
  }

  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const timeAgo = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
    return m < 60 ? m + ' min' : m < 1440 ? Math.floor(m / 60) + 'h' : Math.floor(m / 1440) + 'j'
  }
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ fontFamily: 'Instrument Sans, sans-serif', background: '#f5f2ed', minHeight: '100vh' }}>
      <header style={{ borderBottom: '1.5px solid rgba(15,14,13,0.25)', padding: '20px 44px', background: '#f5f2ed', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 26 }}>CGP <span style={{ color: '#b8975a', fontStyle: 'italic' }}>Watchlist Pro</span></div>
      </header>
      <nav style={{ padding: '0 44px', borderBottom: '1px solid rgba(15,14,13,0.12)', display: 'flex' }}>
        {[['/', 'Dashboard'], ['/fonds', 'Fonds & VL'], ['/clients', 'Clients'], ['/analyse', '✦ Analyse IA']].map(([href, label]) => (
          <Link key={href} href={href} style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: href === '/fonds' ? '#0f0e0d' : href === '/analyse' ? '#b8975a' : '#6b7c6e', padding: '12px 20px 10px', borderBottom: href === '/fonds' ? '2px solid #b8975a' : '2px solid transparent', display: 'inline-block', textDecoration: 'none' }}>{label}</Link>
        ))}
      </nav>
      <main style={{ padding: '32px 44px 80px' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <input style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: 13, background: 'white', border: '1px solid rgba(15,14,13,0.12)', padding: '8px 14px', borderRadius: 2, outline: 'none', maxWidth: 200 }} placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ flex: 1 }} />
          {['all', 'Actions', 'Obligations', 'Thématique', 'Fonds euros', 'SCPI', 'Mixte'].map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', padding: '4px 9px', border: `1px solid ${filter === t ? '#b8975a' : 'rgba(15,14,13,0.12)'}`, borderRadius: 2, cursor: 'pointer', background: 'none', color: filter === t ? '#b8975a' : '#6b7c6e' }}>{t === 'all' ? 'Tous' : t}</button>
          ))}
        </div>

        <div style={{ background: '#0f0e0d', color: '#f5f2ed', padding: '16px 24px', borderRadius: 3, display: 'flex', gap: 32, marginBottom: 28, flexWrap: 'wrap' }}>
          {[
            ['Fonds', funds.length, ''],
            ['Analysés', funds.filter(f => f.isin && analyses[f.isin]).length, ''],
            ['🟢 ENTRER', funds.filter(f => analyses[f.isin]?.verdict === 'ENTRER').length, '#5a9e6f'],
            ['🟡 ATTENDRE', funds.filter(f => analyses[f.isin]?.verdict === 'ATTENDRE').length, '#b8975a'],
            ['🔴 ÉVITER', funds.filter(f => analyses[f.isin]?.verdict === 'ÉVITER').length, '#c45c3a'],
          ].map(([l, v, c]) => (
            <div key={String(l)}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: (c as string) || '#a8b8aa', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 3 }}>{l}</div>
              <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 18, color: (c as string) || '#f5f2ed' }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
          {filtered.map(f => {
            const vl = vlLatest[f.id]
            const analyse = f.isin ? analyses[f.isin] : null
            const verdict = analyse?.verdict
            const vcfg = verdict ? VC[verdict] : null

            return (
              <div key={f.id} style={{ background: 'white', border: `1px solid ${vcfg ? vcfg.border : 'rgba(15,14,13,0.12)'}`, borderRadius: 3, padding: 22, position: 'relative', overflow: 'hidden', cursor: vcfg ? 'pointer' : 'default' }}
                onClick={() => vcfg && setDetailAnalyse({ fund: f, analyse })}>
                {vcfg && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: vcfg.color }} />}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, marginTop: vcfg ? 8 : 0 }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, padding: '3px 7px', borderRadius: 2, background: 'rgba(184,151,90,.1)', color: '#b8975a', textTransform: 'uppercase', letterSpacing: 1 }}>{f.category}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#6b7c6e' }}>{f.isin || '—'}</span>
                </div>
                <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 15, marginBottom: 2 }}>{f.name}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#a8b8aa', marginBottom: 12 }}>{f.manager || '—'}</div>

                {vcfg && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 2, background: vcfg.bg, color: vcfg.color, border: `1px solid ${vcfg.border}` }}>
                        {vcfg.emoji} {verdict}
                      </span>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#a8b8aa' }}>il y a {timeAgo(analyse.created_at)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#6b7c6e' }}>Score IA</span>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: vcfg.color, fontWeight: 600 }}>{vcfg.score}/10</span>
                    </div>
                    <div style={{ height: 4, background: '#ede9e2', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: (vcfg.score / 10 * 100) + '%', background: vcfg.color, borderRadius: 2 }} />
                    </div>
                    {analyse.analyse_json?.verdict_resume && (
                      <div style={{ marginTop: 6, fontSize: 11, color: '#6b7c6e', lineHeight: 1.5, fontStyle: 'italic' }}>
                        {String(analyse.analyse_json.verdict_resume).slice(0, 90)}{String(analyse.analyse_json.verdict_resume).length > 90 ? '…' : ''}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ paddingTop: 10, borderTop: '1px solid rgba(15,14,13,0.12)', marginBottom: 12 }}>
                  {vl ? <><span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 16 }}>{fmt(vl.vl)}</span><span style={{ fontSize: 11, color: '#6b7c6e', marginLeft: 2 }}>€</span><div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#a8b8aa', marginTop: 2 }}>{new Date(vl.recorded_at).toLocaleDateString('fr-FR')}</div></> : <div style={{ fontSize: 11, color: '#a8b8aa', fontStyle: 'italic' }}>VL non renseignée</div>}
                </div>

                <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setEditFund({ ...f })} style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#6b7c6e', border: '1px solid rgba(15,14,13,0.12)', background: 'none', padding: '4px 10px', borderRadius: 2, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>✏ Éditer</button>
                  {f.isin && <Link href={`/analyse?isin=${f.isin}`}><button style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#b8975a', border: '1px solid #b8975a', background: 'none', padding: '4px 10px', borderRadius: 2, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>✦ Analyser</button></Link>}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Modal détail analyse */}
      {detailAnalyse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,14,13,.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={() => setDetailAnalyse(null)}>
          <div style={{ background: '#f5f2ed', border: '1px solid rgba(15,14,13,0.25)', borderRadius: 4, padding: 36, maxWidth: 700, width: '95%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setDetailAnalyse(null)} style={{ position: 'absolute', top: 16, right: 20, border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7c6e' }}>✕</button>
            
            {(() => {
              const { fund, analyse } = detailAnalyse
              const aj = analyse.analyse_json
              const vcfg = VC[analyse.verdict]
              return (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24, marginBottom: 4 }}>{aj?.nom || fund.name}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#6b7c6e' }}>{fund.isin} · {aj?.gestionnaire || fund.manager} · {aj?.categorie || fund.category}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#a8b8aa', marginTop: 4 }}>{fmtDate(analyse.created_at)}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: '16px 20px', background: vcfg?.bg, border: `1px solid ${vcfg?.border}`, borderRadius: 3 }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 700, color: vcfg?.color }}>{vcfg?.emoji} {analyse.verdict}</div>
                    <div style={{ fontSize: 14, color: vcfg?.color, flex: 1 }}>{aj?.verdict_resume}</div>
                  </div>

                  {aj?.signaux && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8, marginBottom: 20 }}>
                      {Object.entries(aj.signaux).map(([k, v]: any) => (
                        <div key={k} style={{ background: 'white', padding: '10px 12px', borderRadius: 2, border: '1px solid rgba(15,14,13,0.12)' }}>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6b7c6e', marginBottom: 4 }}>{k.replace(/_/g, ' ')}</div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {[['Contexte macro', aj?.contexte_macro], ['Analyse du fonds', aj?.analyse_fonds], ["Opportunité d'entrée", aj?.opportunite], ['Adéquation profil', aj?.adequation_profil]].map(([titre, contenu]) => contenu && (
                    <div key={String(titre)} style={{ marginBottom: 16 }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#b8975a', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>{titre}</div>
                      <p style={{ fontSize: 13, lineHeight: 1.75, color: '#2a2928' }}>{contenu}</p>
                    </div>
                  ))}

                  {aj?.risques?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#b8975a', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Risques</div>
                      <ul style={{ paddingLeft: 18 }}>{aj.risques.map((r: string, i: number) => <li key={i} style={{ fontSize: 13, lineHeight: 1.75, marginBottom: 4 }}>{r}</li>)}</ul>
                    </div>
                  )}

                  {aj?.catalyseurs?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#b8975a', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Catalyseurs</div>
                      <ul style={{ paddingLeft: 18 }}>{aj.catalyseurs.map((c: string, i: number) => <li key={i} style={{ fontSize: 13, lineHeight: 1.75, marginBottom: 4 }}>{c}</li>)}</ul>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <Link href={`/analyse?isin=${fund.isin}`}><button style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '10px 20px', borderRadius: 2, cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg,#b8975a,#7a5e28)', color: 'white' }}>✦ Relancer l'analyse</button></Link>
                    <button onClick={() => setDetailAnalyse(null)} style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, padding: '10px 20px', borderRadius: 2, cursor: 'pointer', background: 'none', color: '#6b7c6e', border: '1px solid rgba(15,14,13,0.12)' }}>Fermer</button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editFund && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,14,13,.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setEditFund(null)}>
          <div style={{ background: '#f5f2ed', border: '1px solid rgba(15,14,13,0.25)', borderRadius: 4, padding: 32, maxWidth: 480, width: '92%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 20, marginBottom: 16 }}>Modifier — {editFund.name}</h3>
            {[['Nom', 'name'], ['ISIN', 'isin'], ['Gestionnaire', 'manager']].map(([l, k]) => (
              <div key={k} style={{ marginBottom: 14 }}>
                <label style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#6b7c6e', display: 'block', marginBottom: 7 }}>{l}</label>
                <input style={{ width: '100%', fontFamily: 'Instrument Sans, sans-serif', fontSize: 14, background: 'white', border: '1px solid rgba(15,14,13,0.12)', padding: '9px 14px', borderRadius: 2, outline: 'none' }} value={editFund[k] || ''} onChange={e => setEditFund((v: any) => ({ ...v, [k]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '10px 20px', borderRadius: 2, cursor: 'pointer', border: 'none', background: '#0f0e0d', color: '#f5f2ed' }} onClick={saveEdit}>Sauvegarder</button>
              <button style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, padding: '10px 20px', borderRadius: 2, cursor: 'pointer', background: 'none', color: '#6b7c6e', border: '1px solid rgba(15,14,13,0.12)' }} onClick={() => setEditFund(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
