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
  card:{background:'white',border:'1px solid rgba(15,14,13,0.12)',borderRadius:3,padding:22,transition:'all .2s'},
  btn:{fontFamily:'DM Mono, monospace',fontSize:11,letterSpacing:'1.5px',textTransform:'uppercase',padding:'10px 20px',borderRadius:2,cursor:'pointer',border:'none'},
  input:{fontFamily:'Instrument Sans, sans-serif',fontSize:14,background:'white',border:'1px solid rgba(15,14,13,0.12)',padding:'9px 14px',borderRadius:2,outline:'none',width:'100%'},
  label:{fontFamily:'DM Mono, monospace',fontSize:10,textTransform:'uppercase',letterSpacing:'1.5px',color:'#6b7c6e',display:'block',marginBottom:7},
  overlay:{position:'fixed',inset:0,background:'rgba(15,14,13,.5)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(3px)'},
  modal:{background:'#f5f2ed',border:'1px solid rgba(15,14,13,0.25)',borderRadius:4,padding:32,maxWidth:520,width:'92%',maxHeight:'90vh',overflowY:'auto',position:'relative'},
}

const BADGE_COLORS:any = {Actions:{bg:'rgba(61,90,122,.1)',color:'#3d5a7a'},Obligations:{bg:'rgba(196,92,58,.1)',color:'#c45c3a'},Thématique:{bg:'rgba(184,151,90,.1)',color:'#b8975a'},Mixte:{bg:'rgba(107,124,110,.1)',color:'#6b7c6e'},'Fonds euros':{bg:'rgba(90,158,111,.1)',color:'#5a9e6f'},Structuré:{bg:'rgba(61,90,122,.1)',color:'#3d5a7a'},SCPI:{bg:'rgba(184,151,90,.1)',color:'#b8975a'}}
const fmt = (n:number) => n.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})

export default function FondsPage() {
  const [funds, setFunds] = useState<any[]>([])
  const [vlLatest, setVlLatest] = useState<any>({})
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showVL, setShowVL] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [vlInputs, setVlInputs] = useState<any>({})
  const [selFund, setSelFund] = useState<any>(null)
  const [vlHist, setVlHist] = useState<any[]>([])
  const [newFund, setNewFund] = useState({name:'',isin:'',manager:'',category:'Actions',notes:'',vl:''})

  const load = useCallback(async()=>{
    const [{data:f},{data:h}] = await Promise.all([supabase.from('funds').select('*').order('name'),supabase.from('vl_history').select('*').order('recorded_at',{ascending:false})])
    setFunds(f||[])
    const latest:any={}
    ;(h||[]).forEach((v:any)=>{if(!latest[v.fund_id])latest[v.fund_id]=v})
    setVlLatest(latest)
  },[])

  useEffect(()=>{load()},[load])

  const filtered = funds.filter(f=>(filter==='all'||f.category===filter)&&(!search||f.name.toLowerCase().includes(search.toLowerCase())||(f.isin||'').includes(search.toUpperCase())))

  const saveVL = async()=>{
    const today = new Date().toISOString().split('T')[0]
    const rows = Object.entries(vlInputs).filter(([,v]:any)=>v).map(([fund_id,vl]:any)=>({fund_id,vl:parseFloat(vl),recorded_at:today,source:'manual'}))
    if(!rows.length) return
    await supabase.from('vl_history').upsert(rows,{onConflict:'fund_id,recorded_at'})
    setShowVL(false); setVlInputs({}); load()
  }

  const openFund = async(fund:any)=>{
    setSelFund(fund)
    const {data} = await supabase.from('vl_history').select('*').eq('fund_id',fund.id).order('recorded_at',{ascending:false}).limit(24)
    setVlHist(data||[])
  }

  const saveFund = async()=>{
    if(!newFund.name.trim()) return
    const body = {name:newFund.name,isin:newFund.isin||null,manager:newFund.manager||null,category:newFund.category,notes:newFund.notes||null}
    const [created] = await supabase.from('funds').insert(body).select().then(r=>r.data||[])
    if(newFund.vl && created) await supabase.from('vl_history').insert({fund_id:created.id,vl:parseFloat(newFund.vl),recorded_at:new Date().toISOString().split('T')[0],source:'manual'})
    setShowAdd(false); setNewFund({name:'',isin:'',manager:'',category:'Actions',notes:'',vl:''}); load()
  }

  return (
    <div>
      <header style={S.hdr}>
        <div style={{fontFamily:'DM Serif Display, serif',fontSize:26,letterSpacing:-0.5}}>CGP <span style={{color:'#b8975a',fontStyle:'italic'}}>Watchlist Pro</span></div>
      </header>
      <nav style={S.nav}>
        <Link href="/" style={S.navLink}>Dashboard</Link>
        <Link href="/fonds" style={S.navActive}>Fonds & VL</Link>
        <Link href="/clients" style={S.navLink}>Clients</Link>
        <Link href="/analyse" style={{...S.navLink,color:'#b8975a'}}>✦ Analyse IA</Link>
      </nav>
      <main style={S.main}>
        <div style={{display:'flex',gap:12,marginBottom:24,alignItems:'center',flexWrap:'wrap'}}>
          <button style={{...S.btn,background:'#0f0e0d',color:'#f5f2ed'}} onClick={()=>setShowVL(true)}>↑ Saisir les VL</button>
          <button style={{...S.btn,background:'none',color:'#b8975a',border:'1px solid #b8975a'}} onClick={()=>setShowAdd(true)}>+ Ajouter</button>
          <div style={{flex:1}}/>
          <input style={{...S.input,maxWidth:200}} placeholder="Rechercher…" value={search} onChange={e=>setSearch(e.target.value)}/>
          <div style={{display:'flex',gap:6}}>
            {['all','Actions','Obligations','Thématique','Fonds euros','Structuré','SCPI','Mixte'].map(t=>(
              <button key={t} onClick={()=>setFilter(t)} style={{fontFamily:'DM Mono, monospace',fontSize:9,letterSpacing:1,textTransform:'uppercase',padding:'4px 9px',border:`1px solid ${filter===t?'#b8975a':'rgba(15,14,13,0.12)'}`,borderRadius:2,cursor:'pointer',background:'none',color:filter===t?'#b8975a':'#6b7c6e'}}>{t==='all'?'Tous':t}</button>
            ))}
          </div>
        </div>

        <div style={{background:'#0f0e0d',color:'#f5f2ed',padding:'16px 24px',borderRadius:3,display:'flex',gap:36,marginBottom:28}}>
          <div><div style={{fontFamily:'DM Mono, monospace',fontSize:9,color:'#a8b8aa',textTransform:'uppercase',letterSpacing:1.5,marginBottom:3}}>Fonds</div><div style={{fontFamily:'DM Serif Display, serif',fontSize:18}}>{funds.length}</div></div>
          <div style={{width:1,background:'rgba(255,255,255,.12)'}}/>
          <div><div style={{fontFamily:'DM Mono, monospace',fontSize:9,color:'#a8b8aa',textTransform:'uppercase',letterSpacing:1.5,marginBottom:3}}>VL renseignées</div><div style={{fontFamily:'DM Serif Display, serif',fontSize:18}}>{Object.keys(vlLatest).length}</div></div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
          {filtered.map(f=>{
            const vl=vlLatest[f.id]; const bc=BADGE_COLORS[f.category]||{bg:'rgba(107,124,110,.1)',color:'#6b7c6e'}
            return (
              <div key={f.id} style={{...S.card,cursor:'pointer'}} onClick={()=>openFund(f)}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
                  <span style={{fontFamily:'DM Mono, monospace',fontSize:9,letterSpacing:1.5,textTransform:'uppercase',padding:'3px 7px',borderRadius:2,background:bc.bg,color:bc.color}}>{f.category}</span>
                  <span style={{fontFamily:'DM Mono, monospace',fontSize:10,color:'#6b7c6e'}}>{f.isin||'—'}</span>
                </div>
                <div style={{fontFamily:'DM Serif Display, serif',fontSize:15,marginBottom:2}}>{f.name}</div>
                <div style={{fontFamily:'DM Mono, monospace',fontSize:10,color:'#a8b8aa',marginBottom:14}}>{f.manager||''}</div>
                <div style={{paddingTop:12,borderTop:'1px solid rgba(15,14,13,0.12)'}}>
                  <div style={{fontFamily:'DM Mono, monospace',fontSize:9,color:'#6b7c6e',textTransform:'uppercase',letterSpacing:1.5,marginBottom:3}}>VL</div>
                  {vl?<><span style={{fontFamily:'DM Serif Display, serif',fontSize:17}}>{fmt(vl.vl)}</span><span style={{fontSize:11,color:'#6b7c6e',marginLeft:2}}>€</span><div style={{fontFamily:'DM Mono, monospace',fontSize:9,color:'#a8b8aa',marginTop:2}}>{new Date(vl.recorded_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}{vl.source==='auto'?' · auto':''}</div></>:<div style={{fontSize:11,color:'#a8b8aa',fontStyle:'italic',marginTop:3}}>Non renseignée</div>}
                </div>
                {f.notes&&<div style={{marginTop:12,paddingTop:10,borderTop:'1px solid rgba(15,14,13,0.12)',fontSize:11,color:'#6b7c6e',lineHeight:1.5}}>{f.notes.length>80?f.notes.slice(0,80)+'…':f.notes}</div>}
                {f.isin&&<Link href={`/analyse?isin=${f.isin}`} onClick={e=>e.stopPropagation()}><button style={{marginTop:10,fontFamily:'DM Mono, monospace',fontSize:9,letterSpacing:1,textTransform:'uppercase',color:'#b8975a',border:'1px solid #b8975a',background:'none',padding:'4px 10px',borderRadius:2,cursor:'pointer'}}>✦ Analyser</button></Link>}
              </div>
            )
          })}
        </div>
      </main>

      {showVL&&<div style={S.overlay} onClick={()=>setShowVL(false)}><div style={S.modal} onClick={e=>e.stopPropagation()}>
        <h3 style={{fontFamily:'DM Serif Display, serif',fontSize:20,marginBottom:16}}>Saisie des VL</h3>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {funds.map(f=><div key={f.id}><label style={S.label}>{f.name.length>22?f.name.slice(0,22)+'…':f.name}</label><input style={S.input} type="number" step="0.01" placeholder={vlLatest[f.id]?fmt(vlLatest[f.id].vl):'ex: 100.00'} value={vlInputs[f.id]||''} onChange={e=>setVlInputs((v:any)=>({...v,[f.id]:e.target.value}))}/></div>)}
        </div>
        <div style={{display:'flex',gap:10,marginTop:20}}>
          <button style={{...S.btn,background:'#0f0e0d',color:'#f5f2ed'}} onClick={saveVL}>Enregistrer</button>
          <button style={{...S.btn,background:'none',color:'#6b7c6e',border:'1px solid rgba(15,14,13,0.12)'}} onClick={()=>setShowVL(false)}>Annuler</button>
        </div>
      </div></div>}

      {showAdd&&<div style={S.overlay} onClick={()=>setShowAdd(false)}><div style={S.modal} onClick={e=>e.stopPropagation()}>
        <h3 style={{fontFamily:'DM Serif Display, serif',fontSize:20,marginBottom:16}}>Ajouter un fonds</h3>
        {[['Nom *','name','text','ex: Carmignac Patrimoine'],['ISIN','isin','text','LU0000000000'],['Gestionnaire','manager','text','ex: Carmignac'],['VL initiale (€)','vl','number','100.00']].map(([l,k,t,p])=>(
          <div key={k} style={{marginBottom:14}}><label style={S.label}>{l}</label><input style={S.input} type={t} placeholder={p} value={(newFund as any)[k]} onChange={e=>setNewFund(v=>({...v,[k]:e.target.value}))}/></div>
        ))}
        <div style={{marginBottom:14}}><label style={S.label}>Classe</label><select style={S.input} value={newFund.category} onChange={e=>setNewFund(v=>({...v,category:e.target.value}))}>{['Actions','Obligations','Thématique','Fonds euros','Structuré','SCPI','Mixte'].map(x=><option key={x}>{x}</option>)}</select></div>
        <div style={{marginBottom:14}}><label style={S.label}>Note</label><textarea style={{...S.input,minHeight:60,resize:'vertical'}} value={newFund.notes} onChange={e=>setNewFund(v=>({...v,notes:e.target.value}))}/></div>
        <div style={{display:'flex',gap:10,marginTop:20}}>
          <button style={{...S.btn,background:'#0f0e0d',color:'#f5f2ed'}} onClick={saveFund}>Ajouter</button>
          <button style={{...S.btn,background:'none',color:'#6b7c6e',border:'1px solid rgba(15,14,13,0.12)'}} onClick={()=>setShowAdd(false)}>Annuler</button>
        </div>
      </div></div>}

      {selFund&&<div style={S.overlay} onClick={()=>setSelFund(null)}><div style={S.modal} onClick={e=>e.stopPropagation()}>
        <button onClick={()=>setSelFund(null)} style={{position:'absolute',top:14,right:18,border:'none',background:'none',fontSize:17,cursor:'pointer',color:'#6b7c6e'}}>✕</button>
        <div style={{fontFamily:'DM Serif Display, serif',fontSize:20,marginBottom:4}}>{selFund.name}</div>
        <div style={{fontFamily:'DM Mono, monospace',fontSize:11,color:'#6b7c6e',marginBottom:20}}>{selFund.isin} · {selFund.manager}</div>
        <div style={{fontFamily:'DM Mono, monospace',fontSize:10,color:'#b8975a',textTransform:'uppercase',letterSpacing:2,marginBottom:12}}>Historique VL</div>
        {vlHist.length===0?<p style={{fontSize:13,color:'#6b7c6e'}}>Aucun historique</p>:vlHist.map((h,i)=>{
          const prev=vlHist[i+1]; const diff=prev?((h.vl-prev.vl)/prev.vl*100).toFixed(2):null
          return <div key={h.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid rgba(15,14,13,0.12)'}}>
            <span style={{fontFamily:'DM Mono, monospace',fontSize:11,color:'#6b7c6e'}}>{new Date(h.recorded_at).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}{h.source==='auto'?' · auto':''}</span>
            <span style={{fontFamily:'DM Serif Display, serif',fontSize:16}}>{fmt(h.vl)} €</span>
            {diff&&<span style={{fontFamily:'DM Mono, monospace',fontSize:11,color:parseFloat(diff)>=0?'#5a9e6f':'#c45c3a'}}>{parseFloat(diff)>=0?'▲':'▼'} {Math.abs(parseFloat(diff))}%</span>}
          </div>
        })}
      </div></div>}
    </div>
  )
}
