'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const S = {
  hdr:{borderBottom:'1.5px solid rgba(15,14,13,0.25)',padding:'20px 44px 16px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',background:'#f5f2ed',position:'sticky' as const,top:0,zIndex:100},
  h1:{fontFamily:'DM Serif Display, serif',fontSize:26,letterSpacing:-0.5},
  nav:{padding:'0 44px',borderBottom:'1px solid rgba(15,14,13,0.12)',display:'flex'},
  navLink:{fontFamily:'DM Mono, monospace',fontSize:11,fontWeight:500,letterSpacing:'1.5px',textTransform:'uppercase' as const,color:'#6b7c6e',padding:'12px 20px 10px',borderBottom:'2px solid transparent',display:'inline-block'},
  navLinkActive:{fontFamily:'DM Mono, monospace',fontSize:11,fontWeight:500,letterSpacing:'1.5px',textTransform:'uppercase' as const,color:'#0f0e0d',padding:'12px 20px 10px',borderBottom:'2px solid #b8975a',display:'inline-block'},
  main:{padding:'32px 44px 80px'},
  card:{background:'white',border:'1px solid rgba(15,14,13,0.12)',borderRadius:3,padding:24},
  btn:{fontFamily:'DM Mono, monospace',fontSize:11,letterSpacing:'1.5px',textTransform:'uppercase' as const,padding:'10px 20px',borderRadius:2,cursor:'pointer',border:'none',display:'inline-flex',alignItems:'center',gap:8},
  btnDark:{background:'#0f0e0d',color:'#f5f2ed'},
  btnAi:{background:'linear-gradient(135deg,#b8975a,#7a5e28)',color:'white'},
  sbar:{background:'#0f0e0d',color:'#f5f2ed',padding:'16px 24px',borderRadius:3,display:'flex',gap:36,marginBottom:32,flexWrap:'wrap' as const},
  grid3:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginTop:32},
  alertItem:{borderLeft:'3px solid #b8975a',padding:'12px 16px',borderRadius:'0 2px 2px 0',marginBottom:10,fontSize:13,lineHeight:1.6,background:'#fef8ed'},
  alertDanger:{borderLeft:'3px solid #c45c3a',background:'#fdecea'},
  alertGreen:{borderLeft:'3px solid #5a9e6f',background:'#e8f5ec'},
  loading:{display:'flex',alignItems:'center',justifyContent:'center',padding:40,gap:16},
  dot:{width:8,height:8,borderRadius:'50%',background:'#b8975a'},
}

export default function Dashboard() {
  const [veille, setVeille] = useState<any>(null)
  const [veilleLoading, setVeilleLoading] = useState(false)
  const [stats, setStats] = useState({fonds:0,clients:0,alertes:0,vlManquantes:0})
  const [funds, setFunds] = useState<any[]>([])
  const today = new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})

  useEffect(()=>{
    supabase.from('funds').select('*').then(({data})=>{ setFunds(data||[]); setStats(s=>({...s,fonds:(data||[]).length})) })
    supabase.from('clients').select('*',{count:'exact',head:true}).then(({count})=>setStats(s=>({...s,clients:count||0})))
    supabase.from('client_funds').select('*',{count:'exact',head:true}).eq('status','à arbitrer').then(({count})=>setStats(s=>({...s,alertes:count||0})))
  },[])

  const lancerVeille = async()=>{
    if(!funds.length) return
    setVeilleLoading(true)
    try {
      const res = await fetch('/api/veille',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({funds})})
      setVeille(await res.json())
    } finally { setVeilleLoading(false) }
  }

  return (
    <div>
      <header style={S.hdr}>
        <div>
          <div style={S.h1}>CGP <span style={{color:'#b8975a',fontStyle:'italic'}}>Watchlist Pro</span></div>
          <div style={{fontFamily:'DM Mono, monospace',fontSize:10,color:'#6b7c6e',textTransform:'uppercase',letterSpacing:2,marginTop:3}}>Outil de suivi patrimonial</div>
        </div>
        <div style={{fontFamily:'DM Mono, monospace',fontSize:11,color:'#6b7c6e'}}>{today}</div>
      </header>
      <nav style={S.nav}>
        <Link href="/" style={S.navLinkActive}>Dashboard</Link>
        <Link href="/fonds" style={S.navLink}>Fonds & VL</Link>
        <Link href="/clients" style={S.navLink}>Clients</Link>
        <Link href="/analyse" style={{...S.navLink,color:'#b8975a'}}>✦ Analyse IA</Link>
      </nav>
      <main style={S.main}>
        <div style={S.sbar}>
          {[['Fonds en watchlist',stats.fonds,false],['Clients suivis',stats.clients,false],['Positions à arbitrer',stats.alertes,stats.alertes>0],['VL manquantes',stats.vlManquantes,stats.vlManquantes>0]].map(([l,v,w]:any,i)=>(
            <div key={i}><div style={{fontFamily:'DM Mono, monospace',fontSize:9,color:'#a8b8aa',textTransform:'uppercase',letterSpacing:1.5,marginBottom:3}}>{l}</div><div style={{fontFamily:'DM Serif Display, serif',fontSize:20,color:w?'#e8a085':'#f5f2ed'}}>{v}</div></div>
          ))}
        </div>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div>
            <h2 style={{fontFamily:'DM Serif Display, serif',fontSize:22}}>Briefing du matin</h2>
            <div style={{fontFamily:'DM Mono, monospace',fontSize:10,color:'#6b7c6e',marginTop:3}}>Veille macro croisée avec votre portefeuille</div>
          </div>
          <button style={{...S.btn,...S.btnAi}} onClick={lancerVeille} disabled={veilleLoading}>
            {veilleLoading?'…':veille?'↻ Actualiser':'▶ Lancer la veille'}
          </button>
        </div>

        {veilleLoading && <div style={{...S.card,...S.loading}}><div style={{display:'flex',gap:8}}>{[0,1,2].map(i=><div key={i} style={{...S.dot,animationDelay:`${i*0.2}s`}}/>)}</div><span style={{fontFamily:'DM Mono, monospace',fontSize:11,color:'#6b7c6e'}}>Analyse en cours…</span></div>}

        {!veille && !veilleLoading && <div style={{...S.card,textAlign:'center',padding:40}}><p style={{fontFamily:'DM Mono, monospace',fontSize:12,color:'#6b7c6e'}}>Cliquez sur "Lancer la veille" pour votre briefing du matin</p></div>}

        {veille && !veilleLoading && (
          <div style={S.card}>
            <p style={{fontSize:14,lineHeight:1.75,marginBottom:20}}>{veille.resume_marche}</p>
            {veille.alertes?.length>0 && <>
              <div style={{fontFamily:'DM Mono, monospace',fontSize:10,color:'#b8975a',textTransform:'uppercase',letterSpacing:2,marginBottom:10}}>Alertes</div>
              {veille.alertes.map((a:any,i:number)=>(
                <div key={i} style={{...S.alertItem,...(a.niveau==='urgent'?S.alertDanger:{})}}>
                  <div style={{fontFamily:'DM Mono, monospace',fontSize:9,color:'#6b7c6e',textTransform:'uppercase',marginBottom:3}}>{a.niveau?.toUpperCase()} · {a.fonds_concernes?.join(', ')}</div>
                  <strong style={{display:'block',marginBottom:4}}>{a.titre}</strong>
                  <span>{a.detail}</span>
                  {a.action_recommandee && <div style={{fontFamily:'DM Mono, monospace',fontSize:11,color:'#6b7c6e',marginTop:6}}>→ {a.action_recommandee}</div>}
                </div>
              ))}
            </>}
            {veille.opportunites?.length>0 && <>
              <div style={{fontFamily:'DM Mono, monospace',fontSize:10,color:'#b8975a',textTransform:'uppercase',letterSpacing:2,margin:'16px 0 10px'}}>Opportunités</div>
              {veille.opportunites.map((o:any,i:number)=>(
                <div key={i} style={{...S.alertItem,...S.alertGreen}}>
                  <div style={{fontFamily:'DM Mono, monospace',fontSize:9,color:'#6b7c6e',textTransform:'uppercase',marginBottom:3}}>{o.fonds_concernes?.join(', ')}</div>
                  <strong style={{display:'block',marginBottom:4}}>{o.titre}</strong>
                  <span>{o.detail}</span>
                </div>
              ))}
            </>}
            {veille.themes_macro?.length>0 && <>
              <div style={{fontFamily:'DM Mono, monospace',fontSize:10,color:'#b8975a',textTransform:'uppercase',letterSpacing:2,margin:'16px 0 10px'}}>Thèmes macro</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {veille.themes_macro.map((t:any,i:number)=>(
                  <div key={i} style={{background:'#ede9e2',padding:'12px 14px',borderRadius:2}}>
                    <div style={{fontFamily:'DM Mono, monospace',fontSize:10,color:'#b8975a',textTransform:'uppercase',marginBottom:4}}>{t.theme}</div>
                    <div style={{fontSize:12,lineHeight:1.5}}>{t.impact}</div>
                  </div>
                ))}
              </div>
            </>}
          </div>
        )}

        <div style={S.grid3}>
          {[['Fonds & VL','/fonds','Gérer vos fonds, saisir les VL, consulter l\'historique'],['Clients','/clients','Fiches clients, positions, VL d\'entrée, rapports PDF'],['✦ Analyse IA','/analyse','Entrez un ISIN — verdict ENTRER / ATTENDRE / ÉVITER']].map(([t,h,d])=>(
            <Link key={h} href={h}>
              <div style={{...S.card,cursor:'pointer'}}>
                <div style={{fontFamily:'DM Mono, monospace',fontSize:10,color:'#b8975a',letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>{t}</div>
                <div style={{fontFamily:'DM Serif Display, serif',fontSize:18,marginBottom:6}}>{t==='✦ Analyse IA'?'Analyseur ISIN':t}</div>
                <div style={{fontSize:12,color:'#6b7c6e'}}>{d}</div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
