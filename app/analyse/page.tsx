'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const S:any = {
  hdr:{borderBottom:'1.5px solid rgba(15,14,13,0.25)',padding:'20px 44px 16px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',background:'#f5f2ed',position:'sticky',top:0,zIndex:100},
  nav:{padding:'0 44px',borderBottom:'1px solid rgba(15,14,13,0.12)',display:'flex'},
  navLink:{fontFamily:'DM Mono, monospace',fontSize:11,letterSpacing:'1.5px',textTransform:'uppercase',color:'#6b7c6e',padding:'12px 20px 10px',borderBottom:'2px solid transparent',display:'inline-block'},
  navActive:{fontFamily:'DM Mono, monospace',fontSize:11,letterSpacing:'1.5px',textTransform:'uppercase',color:'#0f0e0d',padding:'12px 20px 10px',borderBottom:'2px solid #b8975a',display:'inline-block'},
  main:{padding:'32px 44px 80px',display:'grid',gridTemplateColumns:'1fr 280px',gap:24},
  card:{background:'white',border:'1px solid rgba(15,14,13,0.12)',borderRadius:3,padding:24},
  btn:{fontFamily:'DM Mono, monospace',fontSize:11,letterSpacing:'1.5px',textTransform:'uppercase',padding:'10px 20px',borderRadius:2,cursor:'pointer',border:'none'},
  input:{fontFamily:'Instrument Sans, sans-serif',fontSize:14,background:'white',border:'1px solid rgba(15,14,13,0.12)',padding:'10px 14px',borderRadius:2,outline:'none'},
  label:{fontFamily:'DM Mono, monospace',fontSize:10,textTransform:'uppercase',letterSpacing:'1.5px',color:'#6b7c6e',display:'block',marginBottom:7},
}

const VERDICT_STYLE:any = {
  ENTRER:{background:'#e8f5ec',color:'#2d6e42',border:'1.5px solid #b8dfc5'},
  ATTENDRE:{background:'#fef8ed',color:'#8a6e30',border:'1.5px solid #e8d5a0'},
  'ÉVITER':{background:'#fdecea',color:'#9e3a28',border:'1.5px solid #e8b5ad'}
}

function AnalysePage() {
  const searchParams = useSearchParams()
  const [isin, setIsin] = useState(searchParams.get('isin')||'')
  const [profile, setProfile] = useState('Équilibré')
  const [horizon, setHorizon] = useState('2-5 ans')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [funds, setFunds] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])

  const loadData = useCallback(async()=>{
    const [{data:f},{data:h}] = await Promise.all([
      supabase.from('funds').select('*').not('isin','is',null).order('name'),
      supabase.from('analyse_history').select('*').order('created_at',{ascending:false}).limit(15)
    ])
    setFunds(f||[]); setHistory(h||[])
  },[])

  useEffect(()=>{
    loadData()
    if(searchParams.get('isin')) setTimeout(()=>analyser(searchParams.get('isin')!),300)
  },[])

  const analyser = async(overrideIsin?:string)=>{
    const code=(overrideIsin||isin).trim().toUpperCase()
    if(code.length<10) return
    if(overrideIsin) setIsin(overrideIsin)
    setLoading(true); setResult(null)
    const existing=funds.find(f=>f.isin===code)
    const fundContext=existing?`Fonds en watchlist : ${existing.name} (${existing.category}, géré par ${existing.manager||'inconnu'}). Note : ${existing.notes||'aucune'}.`:''
    try {
      const res=await fetch('/api/analyse',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({isin:code,profile,horizon,fundContext})})
      const data=await res.json()
      setResult(data); loadData()
    } catch { setResult({error:true}) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <header style={S.hdr}>
        <div style={{fontFamily:'DM Serif Display, serif',fontSize:26,letterSpacing:-0.5}}>CGP <span style={{color:'#b8975a',fontStyle:'italic'}}>Watchlist Pro</span></div>
      </header>
      <nav style={S.nav}>
        <Link href="/" style={S.navLink}>Dashboard</Link>
        <Link href="/fonds" style={S.navLink}>Fonds & VL</Link>
        <Link href="/clients" style={S.navLink}>Clients</Link>
        <Link href="/analyse" style={{...S.navActive,color:'#b8975a',borderBottomColor:'#b8975a'}}>✦ Analyse IA</Link>
      </nav>
      <main style={S.main}>
        <div>
          <div style={{background:'linear-gradient(135deg,#1a1815,#2d2820)',borderRadius:4,padding:'32px 40px',marginBottom:24,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:-50,right:-50,width:200,height:200,background:'radial-gradient(circle,rgba(184,151,90,.15),transparent 70%)'}}/>
            <div style={{fontFamily:'DM Mono, monospace',fontSize:10,letterSpacing:3,textTransform:'uppercase',color:'#b8975a',marginBottom:8}}>✦ Claude Opus 4.8</div>
            <div style={{fontFamily:'DM Serif Display, serif',fontSize:28,color:'#f5f2ed',marginBottom:6}}>Analyseur de fonds</div>
            <div style={{fontSize:13,color:'rgba(245,242,237,.5)',lineHeight:1.6}}>Entrez un ISIN pour une analyse approfondie — verdict ENTRER / ATTENDRE / ÉVITER avec contexte macro en temps réel.</div>
          </div>

          <div style={S.card}>
            <div style={{fontFamily:'DM Serif Display, serif',fontSize:17,marginBottom:18}}>Analyser un fonds</div>
            <div style={{display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:180}}>
                <label style={S.label}>Code ISIN</label>
                <input style={{...S.input,width:'100%',fontFamily:'DM Mono, monospace',fontSize:15,letterSpacing:2,background:'#ede9e2'}} value={isin} onChange={e=>setIsin(e.target.value.toUpperCase())} maxLength={12} placeholder="LU1876459303" onKeyDown={e=>e.key==='Enter'&&analyser()}/>
              </div>
              <div><label style={S.label}>Profil</label><select style={{...S.input,background:'#ede9e2'}} value={profile} onChange={e=>setProfile(e.target.value)}>{['Prudent','Équilibré','Dynamique','Offensif'].map(x=><option key={x}>{x}</option>)}</select></div>
              <div><label style={S.label}>Horizon</label><select style={{...S.input,background:'#ede9e2'}} value={horizon} onChange={e=>setHorizon(e.target.value)}>{['< 2 ans','2-5 ans','5-10 ans','> 10 ans'].map(x=><option key={x}>{x}</option>)}</select></div>
              <button style={{...S.btn,background:'linear-gradient(135deg,#b8975a,#7a5e28)',color:'white',opacity:loading||isin.length<10?0.5:1}} onClick={()=>analyser()} disabled={loading||isin.length<10}>{loading?'…':'✦ Analyser'}</button>
            </div>

            {funds.filter(f=>f.isin&&f.isin.length===12).length>0&&<div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:14,paddingTop:14,borderTop:'1px solid rgba(15,14,13,0.12)'}}>
              <span style={{fontFamily:'DM Mono, monospace',fontSize:10,color:'#a8b8aa',alignSelf:'center'}}>Watchlist :</span>
              {funds.filter(f=>f.isin&&f.isin.length===12).map(f=>(
                <button key={f.id} onClick={()=>analyser(f.isin)} style={{fontFamily:'DM Mono, monospace',fontSize:10,padding:'4px 10px',border:'1px solid rgba(15,14,13,0.12)',borderRadius:2,cursor:'pointer',background:'none',color:'#6b7c6e'}}>
                  {f.name.length>20?f.name.slice(0,20)+'…':f.name} <span style={{opacity:.55,fontSize:9}}>{f.isin}</span>
                </button>
              ))}
            </div>}
          </div>

          {loading&&<div style={{...S.card,display:'flex',alignItems:'center',justifyContent:'center',padding:50,gap:16,marginTop:16}}>
            <div style={{display:'flex',gap:8}}>{[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:'50%',background:'#b8975a',animationDelay:`${i*0.2}s`}}/>)}</div>
            <span style={{fontFamily:'DM Mono, monospace',fontSize:11,color:'#6b7c6e'}}>Analyse Opus 4.8 + recherche web…</span>
          </div>}

          {result&&!loading&&!result.error&&(
            <div style={{...S.card,marginTop:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,paddingBottom:20,borderBottom:'1px solid rgba(15,14,13,0.12)'}}>
                <div>
                  <div style={{fontFamily:'DM Serif Display, serif',fontSize:22}}>{result.nom}</div>
                  <div style={{fontFamily:'DM Mono, monospace',fontSize:11,color:'#6b7c6e',marginTop:3}}>{result.isin} · {result.gestionnaire} · {result.categorie}</div>
                  {result.vl_trouvee&&<div style={{marginTop:6,fontSize:13}}>VL : <span style={{fontFamily:'DM Serif Display, serif',fontSize:16}}>{result.vl_trouvee.toLocaleString('fr-FR',{minimumFractionDigits:2})} €</span></div>}
                </div>
                <div style={{fontFamily:'DM Mono, monospace',fontSize:12,fontWeight:500,letterSpacing:'1.5px',textTransform:'uppercase',padding:'10px 20px',borderRadius:2,...(VERDICT_STYLE[result.verdict]||{})}}>{result.verdict}</div>
              </div>
              <p style={{fontSize:15,fontWeight:600,marginBottom:20}}>{result.verdict_resume}</p>

              {result.signaux&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10,marginBottom:20}}>
                {Object.entries(result.signaux).map(([k,v]:any)=>(
                  <div key={k} style={{background:'#ede9e2',padding:'11px 13px',borderRadius:2}}>
                    <div style={{fontFamily:'DM Mono, monospace',fontSize:9,textTransform:'uppercase',letterSpacing:1.5,color:'#6b7c6e',marginBottom:4}}>{k.replace(/_/g,' ')}</div>
                    <div style={{fontSize:13,fontWeight:600,color:{positif:'#5a9e6f',attractive:'#5a9e6f',négatif:'#c45c3a',chère:'#c45c3a'}[v]||'#6b7c6e'}}>{v}</div>
                  </div>
                ))}
              </div>}

              {[['Contexte macro',result.contexte_macro],['Analyse du fonds',result.analyse_fonds],['Opportunité d\'entrée',result.opportunite],['Adéquation profil',result.adequation_profil]].map(([t,c])=>c&&(
                <div key={t} style={{marginBottom:16}}>
                  <div style={{fontFamily:'DM Mono, monospace',fontSize:10,color:'#b8975a',textTransform:'uppercase',letterSpacing:2,marginBottom:8}}>{t}</div>
                  <p style={{fontSize:14,lineHeight:1.75,color:'#2a2928'}}>{c}</p>
                </div>
              ))}

              {result.risques?.length>0&&<div style={{marginBottom:16}}>
                <div style={{fontFamily:'DM Mono, monospace',fontSize:10,color:'#b8975a',textTransform:'uppercase',letterSpacing:2,marginBottom:8}}>Risques</div>
                <ul style={{paddingLeft:18}}>{result.risques.map((r:string,i:number)=><li key={i} style={{fontSize:14,lineHeight:1.75,marginBottom:4}}>{r}</li>)}</ul>
              </div>}

              {result.catalyseurs?.length>0&&<div style={{marginBottom:16}}>
                <div style={{fontFamily:'DM Mono, monospace',fontSize:10,color:'#b8975a',textTransform:'uppercase',letterSpacing:2,marginBottom:8}}>Catalyseurs</div>
                <ul style={{paddingLeft:18}}>{result.catalyseurs.map((c:string,i:number)=><li key={i} style={{fontSize:14,lineHeight:1.75,marginBottom:4}}>{c}</li>)}</ul>
              </div>}

              <div style={{marginTop:16,padding:'10px 14px',background:'#ede9e2',borderRadius:2}}>
                <p style={{fontFamily:'DM Mono, monospace',fontSize:10,color:'#a8b8aa',lineHeight:1.6}}>⚠ Analyse générée par IA à des fins d'aide à la décision. Ne constitue pas un conseil en investissement au sens de la directive MIF2.</p>
              </div>
            </div>
          )}
        </div>

        <div>
          <div style={{fontFamily:'DM Mono, monospace',fontSize:10,color:'#6b7c6e',textTransform:'uppercase',letterSpacing:2,marginBottom:14}}>Analyses récentes</div>
          {history.length===0?<div style={{fontSize:12,color:'#6b7c6e',fontStyle:'italic'}}>Aucune analyse</div>:history.map((h:any)=>(
            <div key={h.id} style={{...S.card,marginBottom:10,cursor:'pointer',padding:'14px 16px'}} onClick={()=>{setIsin(h.isin);setResult(h.analyse_json)}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <span style={{fontFamily:'DM Mono, monospace',fontSize:10}}>{h.isin}</span>
                <span style={{fontFamily:'DM Mono, monospace',fontSize:9,padding:'2px 7px',borderRadius:2,...(VERDICT_STYLE[h.verdict]||{})}}>{h.verdict}</span>
              </div>
              <div style={{fontSize:12,marginBottom:2}}>{h.analyse_json?.nom||'—'}</div>
              <div style={{fontFamily:'DM Mono, monospace',fontSize:9,color:'#a8b8aa'}}>{new Date(h.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default function AnalyseWrapper() {
  return <Suspense fallback={<div>Chargement…</div>}><AnalysePage/></Suspense>
}
