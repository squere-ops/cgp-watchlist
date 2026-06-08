'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const S:any = {
  hdr:{borderBottom:'1.5px solid rgba(15,14,13,0.25)',padding:'20px 44px 16px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',background:'#f5f2ed',position:'sticky',top:0,zIndex:100},
  nav:{padding:'0 44px',borderBottom:'1px solid rgba(15,14,13,0.12)',display:'flex'},
  navLink:{fontFamily:'DM Mono, monospace',fontSize:11,letterSpacing:'1.5px',textTransform:'uppercase',color:'#6b7c6e',padding:'12px 20px 10px',borderBottom:'2px solid transparent',display:'inline-block'},
  navActive:{fontFamily:'DM Mono, monospace',fontSize:11,letterSpacing:'1.5px',textTransform:'uppercase',color:'#0f0e0d',padding:'12px 20px 10px',borderBottom:'2px solid #b8975a',display:'inline-block'},
  main:{padding:'32px 44px 80px'},
  card:{background:'white',border:'1px solid rgba(15,14,13,0.12)',borderRadius:3,padding:22},
  btn:{fontFamily:'DM Mono, monospace',fontSize:11,letterSpacing:'1.5px',textTransform:'uppercase',padding:'10px 20px',borderRadius:2,cursor:'pointer',border:'none'},
  input:{fontFamily:'Instrument Sans, sans-serif',fontSize:14,background:'white',border:'1px solid rgba(15,14,13,0.12)',padding:'9px 14px',borderRadius:2,outline:'none',width:'100%'},
  label:{fontFamily:'DM Mono, monospace',fontSize:10,textTransform:'uppercase',letterSpacing:'1.5px',color:'#6b7c6e',display:'block',marginBottom:7},
  overlay:{position:'fixed',inset:0,background:'rgba(15,14,13,.5)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(3px)'},
  modal:{background:'#f5f2ed',border:'1px solid rgba(15,14,13,0.25)',borderRadius:4,padding:32,maxWidth:540,width:'92%',maxHeight:'90vh',overflowY:'auto',position:'relative'},
}

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [funds, setFunds] = useState<any[]>([])
  const [selClient, setSelClient] = useState<any>(null)
  const [portfolio, setPortfolio] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showPos, setShowPos] = useState(false)
  const [rapportLoading, setRapportLoading] = useState(false)
  const [rapport, setRapport] = useState<any>(null)
  const [newClient, setNewClient] = useState({name:'',profile:'Équilibré',horizon:'1-3 ans',envelope:'Assurance-vie',tmi:'',ifi:false,objectif_successoral:false,situation_fiscale:'',objectifs:'',note:''})
  const [newPos, setNewPos] = useState({fund_id:'',vl_entree:'',date_entree:'',montant_investi:'',seuil_alerte_sortie:'',status:'actif',note:''})

  const load = useCallback(async()=>{
    const [{data:c},{data:f}] = await Promise.all([supabase.from('clients').select('*').order('name'),supabase.from('funds').select('*').order('name')])
    setClients(c||[]); setFunds(f||[])
  },[])

  useEffect(()=>{load()},[load])

  const loadPortfolio = async(clientId:string)=>{
    const {data} = await supabase.from('client_portfolio').select('*').eq('client_id',clientId)
    setPortfolio(data||[])
  }

  const selectClient = (c:any)=>{ setSelClient(c); setRapport(null); loadPortfolio(c.id) }

  const saveClient = async()=>{
    if(!newClient.name.trim()) return
    await supabase.from('clients').insert(newClient)
    setShowAdd(false); setNewClient({name:'',profile:'Équilibré',horizon:'1-3 ans',envelope:'Assurance-vie',tmi:'',ifi:false,objectif_successoral:false,situation_fiscale:'',objectifs:'',note:''}); load()
  }

  const savePos = async()=>{
    if(!selClient||!newPos.fund_id) return
    await supabase.from('client_funds').insert({client_id:selClient.id,fund_id:newPos.fund_id,vl_entree:newPos.vl_entree?parseFloat(newPos.vl_entree):null,date_entree:newPos.date_entree||null,montant_investi:newPos.montant_investi?parseFloat(newPos.montant_investi):null,seuil_alerte_sortie:newPos.seuil_alerte_sortie?parseFloat(newPos.seuil_alerte_sortie):null,status:newPos.status,note:newPos.note||null})
    setShowPos(false); setNewPos({fund_id:'',vl_entree:'',date_entree:'',montant_investi:'',seuil_alerte_sortie:'',status:'actif',note:''}); loadPortfolio(selClient.id)
  }

  const updateStatus = async(posId:string,status:string)=>{ await supabase.from('client_funds').update({status}).eq('id',posId); loadPortfolio(selClient.id) }

  const genRapport = async()=>{
    if(!selClient) return
    setRapportLoading(true)
    try { const res=await fetch('/api/rapport',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId:selClient.id})}); const d=await res.json(); setRapport(d.rapport) }
    finally { setRapportLoading(false) }
  }

  const fmt = (n:any)=>n!==null&&n!==undefined?n.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}):'—'

  return (
    <div>
      <header style={S.hdr}>
        <div style={{fontFamily:'DM Serif Display, serif',fontSize:26,letterSpacing:-0.5}}>CGP <span style={{color:'#b8975a',fontStyle:'italic'}}>Watchlist Pro</span></div>
      </header>
      <nav style={S.nav}>
        <Link href="/" style={S.navLink}>Dashboard</Link>
        <Link href="/fonds" style={S.navLink}>Fonds & VL</Link>
        <Link href="/clients" style={S.navActive}>Clients</Link>
        <Link href="/analyse" style={{...S.navLink,color:'#b8975a'}}>✦ Analyse IA</Link>
      </nav>
      <main style={{...S.main,display:'grid',gridTemplateColumns:selClient?'300px 1fr':'1fr',gap:24}}>
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <h2 style={{fontFamily:'DM Serif Display, serif',fontSize:20}}>Clients <span style={{fontFamily:'DM Mono, monospace',fontSize:12,color:'#6b7c6e'}}>{clients.length}</span></h2>
            <button style={{...S.btn,background:'#0f0e0d',color:'#f5f2ed',fontSize:10,padding:'7px 14px'}} onClick={()=>setShowAdd(true)}>+ Nouveau</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {clients.map(c=>{
              const hasAlert=c.note&&/arbitr|urgent|revoir/i.test(c.note)
              return <div key={c.id} style={{...S.card,cursor:'pointer',borderLeft:`3px solid ${hasAlert?'#b8975a':'#5a9e6f'}`,paddingLeft:20,background:selClient?.id===c.id?'white':'rgba(255,255,255,0.5)'}} onClick={()=>selectClient(c)}>
                <div style={{fontFamily:'DM Serif Display, serif',fontSize:16,marginBottom:5}}>{c.name}</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {[c.profile,c.envelope].map((v:string,i:number)=><span key={i} style={{fontFamily:'DM Mono, monospace',fontSize:9,background:'#ede9e2',padding:'2px 7px',borderRadius:2}}>{v}</span>)}
                </div>
                {hasAlert&&<div style={{marginTop:6,fontSize:11,color:'#8a6e30'}}>⚠ Arbitrage à prévoir</div>}
              </div>
            })}
          </div>
        </div>

        {selClient&&<div>
          <div style={{...S.card,marginBottom:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{fontFamily:'DM Serif Display, serif',fontSize:24,marginBottom:8}}>{selClient.name}</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {[selClient.profile,selClient.horizon,selClient.envelope,selClient.tmi&&`TMI ${selClient.tmi}`].filter(Boolean).map((v:string,i:number)=><span key={i} style={{fontFamily:'DM Mono, monospace',fontSize:10,background:'#ede9e2',padding:'3px 9px',borderRadius:2,color:'#6b7c6e'}}>{v}</span>)}
                  {selClient.ifi&&<span style={{fontFamily:'DM Mono, monospace',fontSize:10,background:'rgba(196,92,58,.1)',padding:'3px 9px',borderRadius:2,color:'#c45c3a'}}>IFI</span>}
                </div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button style={{...S.btn,background:'none',color:'#b8975a',border:'1px solid #b8975a',fontSize:10}} onClick={()=>setShowPos(true)}>+ Position</button>
                <button style={{...S.btn,background:'linear-gradient(135deg,#b8975a,#7a5e28)',color:'white',fontSize:10,opacity:rapportLoading?0.5:1}} onClick={genRapport} disabled={rapportLoading}>{rapportLoading?'…':'📄 Rapport'}</button>
              </div>
            </div>
            {selClient.objectifs&&<div style={{marginTop:14,paddingTop:12,borderTop:'1px solid rgba(15,14,13,0.12)'}}><div style={{fontFamily:'DM Mono, monospace',fontSize:9,color:'#6b7c6e',textTransform:'uppercase',letterSpacing:1.5,marginBottom:4}}>Objectifs</div><p style={{fontSize:13,color:'#6b7c6e',lineHeight:1.6}}>{selClient.objectifs}</p></div>}
          </div>

          <h3 style={{fontFamily:'DM Serif Display, serif',fontSize:18,marginBottom:14}}>Portefeuille</h3>
          {portfolio.length===0?<div style={{...S.card,textAlign:'center',padding:32}}><p style={{fontFamily:'DM Mono, monospace',fontSize:12,color:'#6b7c6e'}}>Aucune position. Cliquez sur "+ Position".</p></div>:(
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {portfolio.map((p:any)=>(
                <div key={p.id} style={{...S.card,borderLeft:`3px solid ${p.seuil_atteint?'#5a9e6f':p.status==='à arbitrer'?'#b8975a':'rgba(15,14,13,0.12)'}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                        <span style={{fontFamily:'DM Serif Display, serif',fontSize:15}}>{p.fund_name}</span>
                        {p.seuil_atteint&&<span style={{fontSize:11,color:'#5a9e6f',fontWeight:600}}>🎯 Seuil atteint</span>}
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
                        {[['VL entrée',p.vl_entree?fmt(p.vl_entree)+' €':'—',p.date_entree?new Date(p.date_entree).toLocaleDateString('fr-FR'):''],['VL actuelle',p.vl_actuelle?fmt(p.vl_actuelle)+' €':'—',p.vl_date?new Date(p.vl_date).toLocaleDateString('fr-FR'):''],['Performance',p.perf_pct!==null?(p.perf_pct>=0?'+':'')+p.perf_pct+'%':'—',p.perf_eur!==null?(p.perf_eur>=0?'+':'')+fmt(p.perf_eur)+' €':''],['Investi',p.montant_investi?fmt(p.montant_investi)+' €':'—',p.seuil_alerte_sortie?'Seuil: '+fmt(p.seuil_alerte_sortie)+' €':'']].map(([l,v,s])=>(
                          <div key={l}><div style={{fontFamily:'DM Mono, monospace',fontSize:9,color:'#6b7c6e',textTransform:'uppercase',letterSpacing:1,marginBottom:2}}>{l}</div><div style={{fontFamily:'DM Serif Display, serif',fontSize:14}}>{v}</div><div style={{fontFamily:'DM Mono, monospace',fontSize:9,color:'#a8b8aa'}}>{s}</div></div>
                        ))}
                      </div>
                    </div>
                    <select style={{...S.input,fontSize:11,padding:'4px 8px',width:'auto',marginLeft:16}} value={p.status} onChange={e=>updateStatus(p.id,e.target.value)}>
                      {['actif','à surveiller','à arbitrer','soldé'].map(x=><option key={x}>{x}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {rapport&&<div style={{...S.card,marginTop:20}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <h3 style={{fontFamily:'DM Serif Display, serif',fontSize:18}}>Rapport de suivi</h3>
              <button style={{...S.btn,background:'#0f0e0d',color:'#f5f2ed'}} onClick={()=>window.print()}>🖨 Imprimer</button>
            </div>
            <p style={{fontSize:14,lineHeight:1.75,marginBottom:16}}>{rapport.synthese_executive}</p>
            <div style={{fontFamily:'DM Mono, monospace',fontSize:10,color:'#b8975a',textTransform:'uppercase',letterSpacing:2,marginBottom:8}}>Analyse</div>
            <p style={{fontSize:14,lineHeight:1.75,marginBottom:16}}>{rapport.analyse_portefeuille}</p>
            {rapport.recommandations?.map((r:any,i:number)=><div key={i} style={{borderLeft:`3px solid ${r.priorite==='haute'?'#c45c3a':'#b8975a'}`,padding:'10px 14px',background:r.priorite==='haute'?'#fdecea':'#fef8ed',borderRadius:'0 2px 2px 0',marginBottom:8}}>
              <div style={{fontFamily:'DM Mono, monospace',fontSize:9,color:'#6b7c6e',textTransform:'uppercase',marginBottom:2}}>{r.priorite}</div>
              <strong style={{display:'block',marginBottom:2,fontSize:13}}>{r.action}</strong>
              <span style={{fontSize:12}}>{r.justification}</span>
            </div>)}
            <div style={{marginTop:12,padding:'10px 14px',background:'#ede9e2',borderRadius:2}}><p style={{fontFamily:'DM Mono, monospace',fontSize:10,color:'#a8b8aa',lineHeight:1.6}}>{rapport.mention_legale}</p></div>
          </div>}
        </div>}
      </main>

      {showAdd&&<div style={S.overlay} onClick={()=>setShowAdd(false)}><div style={S.modal} onClick={e=>e.stopPropagation()}>
        <h3 style={{fontFamily:'DM Serif Display, serif',fontSize:20,marginBottom:16}}>Nouveau client</h3>
        <div style={{display:'grid',gap:14}}>
          <div><label style={S.label}>Nom *</label><input style={S.input} value={newClient.name} onChange={e=>setNewClient(v=>({...v,name:e.target.value}))} placeholder="ex: M. et Mme Dupont"/></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><label style={S.label}>Profil</label><select style={S.input} value={newClient.profile} onChange={e=>setNewClient(v=>({...v,profile:e.target.value}))}>{['Prudent','Équilibré','Dynamique','Offensif'].map(x=><option key={x}>{x}</option>)}</select></div>
            <div><label style={S.label}>Horizon</label><select style={S.input} value={newClient.horizon} onChange={e=>setNewClient(v=>({...v,horizon:e.target.value}))}>{['< 1 an','1-3 ans','3-5 ans','5-10 ans','> 10 ans'].map(x=><option key={x}>{x}</option>)}</select></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><label style={S.label}>Enveloppe</label><select style={S.input} value={newClient.envelope} onChange={e=>setNewClient(v=>({...v,envelope:e.target.value}))}>{['Assurance-vie','PER','Capi personne morale','AV + PER','Mixte','PEA','CTO'].map(x=><option key={x}>{x}</option>)}</select></div>
            <div><label style={S.label}>TMI</label><select style={S.input} value={newClient.tmi} onChange={e=>setNewClient(v=>({...v,tmi:e.target.value}))}>{['','11%','30%','41%','45%'].map(x=><option key={x} value={x}>{x||'— Non renseigné'}</option>)}</select></div>
          </div>
          <div style={{display:'flex',gap:20}}>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13,cursor:'pointer'}}><input type="checkbox" checked={newClient.ifi} onChange={e=>setNewClient(v=>({...v,ifi:e.target.checked}))}/>Assujetti IFI</label>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13,cursor:'pointer'}}><input type="checkbox" checked={newClient.objectif_successoral} onChange={e=>setNewClient(v=>({...v,objectif_successoral:e.target.checked}))}/>Objectif successoral</label>
          </div>
          <div><label style={S.label}>Situation fiscale</label><textarea style={{...S.input,minHeight:55,resize:'vertical'}} value={newClient.situation_fiscale} onChange={e=>setNewClient(v=>({...v,situation_fiscale:e.target.value}))}/></div>
          <div><label style={S.label}>Objectifs patrimoniaux</label><textarea style={{...S.input,minHeight:55,resize:'vertical'}} value={newClient.objectifs} onChange={e=>setNewClient(v=>({...v,objectifs:e.target.value}))}/></div>
          <div><label style={S.label}>Notes</label><textarea style={{...S.input,minHeight:55,resize:'vertical'}} value={newClient.note} onChange={e=>setNewClient(v=>({...v,note:e.target.value}))}/></div>
        </div>
        <div style={{display:'flex',gap:10,marginTop:20}}>
          <button style={{...S.btn,background:'#0f0e0d',color:'#f5f2ed'}} onClick={saveClient}>Créer</button>
          <button style={{...S.btn,background:'none',color:'#6b7c6e',border:'1px solid rgba(15,14,13,0.12)'}} onClick={()=>setShowAdd(false)}>Annuler</button>
        </div>
      </div></div>}

      {showPos&&selClient&&<div style={S.overlay} onClick={()=>setShowPos(false)}><div style={S.modal} onClick={e=>e.stopPropagation()}>
        <h3 style={{fontFamily:'DM Serif Display, serif',fontSize:20,marginBottom:16}}>Ajouter une position</h3>
        <div style={{display:'grid',gap:14}}>
          <div><label style={S.label}>Fonds *</label><select style={S.input} value={newPos.fund_id} onChange={e=>setNewPos(v=>({...v,fund_id:e.target.value}))}><option value="">— Sélectionner —</option>{funds.map(f=><option key={f.id} value={f.id}>{f.name}{f.isin?` (${f.isin})`:''}</option>)}</select></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><label style={S.label}>VL d'entrée (€)</label><input style={S.input} type="number" step="0.01" value={newPos.vl_entree} onChange={e=>setNewPos(v=>({...v,vl_entree:e.target.value}))}/></div>
            <div><label style={S.label}>Date d'entrée</label><input style={S.input} type="date" value={newPos.date_entree} onChange={e=>setNewPos(v=>({...v,date_entree:e.target.value}))}/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><label style={S.label}>Montant investi (€)</label><input style={S.input} type="number" step="0.01" value={newPos.montant_investi} onChange={e=>setNewPos(v=>({...v,montant_investi:e.target.value}))}/></div>
            <div><label style={S.label}>Seuil sortie (€)</label><input style={S.input} type="number" step="0.01" value={newPos.seuil_alerte_sortie} onChange={e=>setNewPos(v=>({...v,seuil_alerte_sortie:e.target.value}))}/></div>
          </div>
          <div><label style={S.label}>Note</label><textarea style={{...S.input,minHeight:55,resize:'vertical'}} value={newPos.note} onChange={e=>setNewPos(v=>({...v,note:e.target.value}))}/></div>
        </div>
        <div style={{display:'flex',gap:10,marginTop:20}}>
          <button style={{...S.btn,background:'#0f0e0d',color:'#f5f2ed'}} onClick={savePos}>Ajouter</button>
          <button style={{...S.btn,background:'none',color:'#6b7c6e',border:'1px solid rgba(15,14,13,0.12)'}} onClick={()=>setShowPos(false)}>Annuler</button>
        </div>
      </div></div>}
    </div>
  )
}
