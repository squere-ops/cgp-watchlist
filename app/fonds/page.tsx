'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const VC: any = {
  ENTRER: { color: '#2d6e42', bg: '#e8f5ec', border: '#b8dfc5', emoji: '🟢', score: 8 },
  ATTENDRE: { color: '#8a6e30', bg: '#fef8ed', border: '#e8d5a0', emoji: '🟡', score: 5 },
  'EVITER': { color: '#9e3a28', bg: '#fdecea', border: '#e8b5ad', emoji: '🔴', score: 2 },
}
export default function FondsPage() {
  const [funds, setFunds] = useState<any[]>([])
  const [analyses, setAnalyses] = useState<any>({})
  const [sriFilter, setSriFilter] = useState('all')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [editFund, setEditFund] = useState<any>(null)
  const [detailFund, setDetailFund] = useState<any>(null)

  const load = useCallback(async () => {
    const [{ data: f }, { data: a }] = await Promise.all([
      supabase.from('funds').select('*').order('name'),
      supabase.from('analyse_history').select('*').order('created_at', { ascending: false })
    ])
    setFunds(f || [])
    const lastA: any = {}
    ;(a || []).forEach((an: any) => { if (!lastA[an.isin]) lastA[an.isin] = an })
    setAnalyses(lastA)
  }, [])

  useEffect(() => { load() }, [load])

  const deleteFund = async (id: string) => {
    if (!confirm('Supprimer ce fonds ?')) return
    await supabase.from('funds').delete().eq('id', id)
    setEditFund(null); load()
  }

  const saveEdit = async () => {
    if (!editFund) return
    await supabase.from('funds').update({ name: editFund.name, isin: editFund.isin || null, manager: editFund.manager || null, category: editFund.category, sri: editFund.sri ? parseInt(editFund.sri) : null, notes: editFund.notes || null }).eq('id', editFund.id)
    setEditFund(null); load()
  }

  const sriColor = (s: number) => ['','#5a9e6f','#8ab870','#b8975a','#c45c3a','#9e3a28','#7a1a1a','#5a0a0a'][s] || '#6b7c6e'

  let filtered = funds.filter(f =>
    (filter === 'all' || f.category === filter) &&
    (sriFilter === 'all' || String(f.sri) === sriFilter) &&
    (!search || f.name.toLowerCase().includes(search.toLowerCase()) || (f.isin || '').includes(search.toUpperCase()))
  )

  return (
    <div style={{ fontFamily: 'Instrument Sans, sans-serif', background: '#f5f2ed', minHeight: '100vh' }}>
      <header style={{ borderBottom: '1.5px solid rgba(15,14,13,0.25)', padding: '20px 44px', background: '#f5f2ed', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 26 }}>CGP <span style={{ color: '#b8975a', fontStyle: 'italic' }}>Watchlist Pro</span></div>
      </header>
      <nav style={{ padding: '0 44px', borderBottom: '1px solid rgba(15,14,13,0.12)', display: 'flex' }}>
        {[['/', 'Dashboard'], ['/fonds', 'Fonds & VL'], ['/clients', 'Clients'], ['/analyse', 'Analyse IA']].map(([href, label]) => (
          <Link key={href} href={href} style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: href === '/fonds' ? '#0f0e0d' : '#6b7c6e', padding: '12px 20px 10px', borderBottom: href === '/fonds' ? '2px solid #b8975a' : '2px solid transparent', display: 'inline-block', textDecoration: 'none' }}>{label}</Link>
        ))}
      </nav>
      <main style={{ padding: '32px 44px 80px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: 13, background: 'white', border: '1px solid rgba(15,14,13,0.12)', padding: '8px 14px', borderRadius: 2, outline: 'none', maxWidth: 180 }} placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#6b7c6e' }}>SRI</span>
          {['all','1','2','3','4','5'].map(s => (
            <button key={s} onClick={() => setSriFilter(s)} style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, padding: '4px 9px', border: '1px solid ' + (sriFilter === s ? '#b8975a' : 'rgba(15,14,13,0.12)'), borderRadius: 2, cursor: 'pointer', background: sriFilter === s ? '#b8975a' : 'none', color: sriFilter === s ? 'white' : '#6b7c6e' }}>{s === 'all' ? 'Tous' : s}</button>
          ))}
          {['all','Actions','Obligations','Thematique','Mixte'].map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, padding: '4px 9px', border: '1px solid ' + (filter === t ? '#b8975a' : 'rgba(15,14,13,0.12)'), borderRadius: 2, cursor: 'pointer', background: 'none', color: filter === t ? '#b8975a' : '#6b7c6e' }}>{t === 'all' ? 'Tous' : t}</button>
          ))}
        </div>
        <div style={{ background: '#0f0e0d', color: '#f5f2ed', padding: '14px 24px', borderRadius: 3, display: 'flex', gap: 28, marginBottom: 24, flexWrap: 'wrap' }}>
          {[['Fonds', funds.length],['Affichés', filtered.length],['Analysés', funds.filter(f => f.isin && analyses[f.isin]).length]].map(([l,v]) => (
            <div key={String(l)}><div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#a8b8aa', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 3 }}>{l}</div><div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 18 }}>{v}</div></div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 14 }}>
          {filtered.map(f => {
            const analyse = f.isin ? analyses[f.isin] : null
            const verdict = analyse?.verdict
            const vcfg = verdict ? (VC[verdict] || VC['EVITER']) : null
            return (
              <div key={f.id} style={{ background: 'white', border: '1px solid ' + (vcfg ? vcfg.border : 'rgba(15,14,13,0.12)'), borderRadius: 3, padding: 20, position: 'relative', cursor: vcfg ? 'pointer' : 'default' }} onClick={() => vcfg && setDetailFund({ fund: f, analyse })}>
                {vcfg && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: vcfg.color }} />}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, marginTop: vcfg ? 8 : 0 }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, padding: '2px 6px', borderRadius: 2, background: 'rgba(184,151,90,.1)', color: '#b8975a' }}>{f.category}</span>
                    {f.sri && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, padding: '2px 6px', borderRadius: 2, background: sriColor(f.sri) + '25', color: sriColor(f.sri), fontWeight: 700 }}>SRI {f.sri}</span>}
                  </div>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#a8b8aa' }}>{f.isin || '—'}</span>
                </div>
                <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 14, marginBottom: 2 }}>{f.name}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#a8b8aa', marginBottom: 10 }}>{f.manager || '—'}</div>
                {vcfg && <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 2, background: vcfg.bg, color: vcfg.color, border: '1px solid ' + vcfg.border }}>{vcfg.emoji} {verdict}</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: vcfg.color }}>{vcfg.score}/10</span>
                  </div>
                  <div style={{ height: 3, background: '#ede9e2', borderRadius: 2 }}><div style={{ height: '100%', width: (vcfg.score/10*100)+'%', background: vcfg.color, borderRadius: 2 }} /></div>
                </div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setEditFund({...f})} style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#6b7c6e', border: '1px solid rgba(15,14,13,0.12)', background: 'none', padding: '3px 8px', borderRadius: 2, cursor: 'pointer' }}>✏ Editer</button>
                  {f.isin && <Link href={'/analyse?isin='+f.isin}><button style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#b8975a', border: '1px solid #b8975a', background: 'none', padding: '3px 8px', borderRadius: 2, cursor: 'pointer' }}>✦ Analyser</button></Link>}
                </div>
              </div>
            )
          })}
        </div>
      </main>
      {detailFund && <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,14,13,.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDetailFund(null)}>
        <div style={{ background: '#f5f2ed', border: '1px solid rgba(15,14,13,0.25)', borderRadius: 4, padding: 32, maxWidth: 660, width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
          <button onClick={() => setDetailFund(null)} style={{ float: 'right', border: 'none', background: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
          {(() => {
            const { fund, analyse } = detailFund
            const aj = analyse.analyse_json
            const vcfg = VC[analyse.verdict] || VC['EVITER']
            return <>
              <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, marginBottom: 4 }}>{aj?.nom || fund.name}</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#6b7c6e', marginBottom: 16 }}>{fund.isin} · {fund.manager}{fund.sri ? ' · SRI ' + fund.sri : ''}</div>
              <div style={{ padding: '14px 18px', background: vcfg.bg, border: '1px solid ' + vcfg.border, borderRadius: 3, marginBottom: 16 }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 700, color: vcfg.color, marginBottom: 6 }}>{vcfg.emoji} {analyse.verdict}</div>
                <div style={{ fontSize: 13, color: vcfg.color }}>{aj?.verdict_resume}</div>
              </div>
              {[['Contexte macro', aj?.contexte_macro], ['Analyse', aj?.analyse_fonds], ['Opportunite', aj?.opportunite], ['Adequation profil', aj?.adequation_profil]].map(([t,c]) => c && <div key={String(t)} style={{ marginBottom: 14 }}><div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#b8975a', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>{t}</div><p style={{ fontSize: 13, lineHeight: 1.75 }}>{c}</p></div>)}
              {aj?.risques?.length > 0 && <div style={{ marginBottom: 14 }}><div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#b8975a', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>Risques</div><ul style={{ paddingLeft: 16 }}>{aj.risques.map((r: string, i: number) => <li key={i} style={{ fontSize: 13, marginBottom: 3 }}>{r}</li>)}</ul></div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <Link href={'/analyse?isin='+fund.isin}><button style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, padding: '9px 18px', borderRadius: 2, cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg,#b8975a,#7a5e28)', color: 'white' }}>✦ Relancer</button></Link>
                <button onClick={() => setDetailFund(null)} style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, padding: '9px 18px', borderRadius: 2, cursor: 'pointer', background: 'none', color: '#6b7c6e', border: '1px solid rgba(15,14,13,0.12)' }}>Fermer</button>
              </div>
            </>
          })()}
        </div>
      </div>}
      {editFund && <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,14,13,.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setEditFund(null)}>
        <div style={{ background: '#f5f2ed', border: '1px solid rgba(15,14,13,0.25)', borderRadius: 4, padding: 28, maxWidth: 460, width: '92%' }} onClick={e => e.stopPropagation()}>
          <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 18, marginBottom: 14 }}>Modifier</h3>
          {[['Nom','name'],['ISIN','isin'],['Gestionnaire','manager']].map(([l,k]) => <div key={k} style={{ marginBottom: 12 }}>
            <label style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#6b7c6e', display: 'block', marginBottom: 5 }}>{l}</label>
            <input style={{ width: '100%', fontFamily: 'Instrument Sans, sans-serif', fontSize: 14, background: 'white', border: '1px solid rgba(15,14,13,0.12)', padding: '8px 12px', borderRadius: 2, outline: 'none' }} value={editFund[k]||''} onChange={e => setEditFund((v: any) => ({...v,[k]:e.target.value}))} />
          </div>)}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div><label style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#6b7c6e', display: 'block', marginBottom: 5 }}>Classe</label>
              <select style={{ width: '100%', fontFamily: 'Instrument Sans, sans-serif', fontSize: 13, background: 'white', border: '1px solid rgba(15,14,13,0.12)', padding: '8px 10px', borderRadius: 2, outline: 'none' }} value={editFund.category||'Actions'} onChange={e => setEditFund((v: any) => ({...v,category:e.target.value}))}>
                {['Actions','Obligations','Thématique','Fonds euros','Structuré','SCPI','Mixte'].map(x => <option key={x}>{x}</option>)}
              </select></div>
            <div><label style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#6b7c6e', display: 'block', marginBottom: 5 }}>SRI</label>
              <select style={{ width: '100%', fontFamily: 'Instrument Sans, sans-serif', fontSize: 13, background: 'white', border: '1px solid rgba(15,14,13,0.12)', padding: '8px 10px', borderRadius: 2, outline: 'none' }} value={editFund.sri||''} onChange={e => setEditFund((v: any) => ({...v,sri:e.target.value?parseInt(e.target.value):null}))}>
                <option value="">—</option>{[1,2,3,4,5,6,7].map(x => <option key={x} value={x}>{x}</option>)}
              </select></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, padding: '9px 18px', borderRadius: 2, cursor: 'pointer', border: 'none', background: '#0f0e0d', color: '#f5f2ed' }} onClick={saveEdit}>Sauvegarder</button>
            <button style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, padding: '9px 18px', borderRadius: 2, cursor: 'pointer', background: 'none', color: '#6b7c6e', border: '1px solid rgba(15,14,13,0.12)' }} onClick={() => setEditFund(null)}>Annuler</button>
            <button style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, padding: '9px 18px', borderRadius: 2, cursor: 'pointer', background: '#c45c3a', color: 'white', border: 'none', marginLeft: 'auto' }} onClick={() => deleteFund(editFund.id)}>🗑 Supprimer</button>
          </div>
        </div>
      </div>}
    </div>
  )
}