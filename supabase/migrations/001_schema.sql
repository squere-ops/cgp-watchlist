-- ============================================================
-- CGP Watchlist Pro — Schéma complet
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── FONDS ──────────────────────────────────────────────────
ALTER TABLE funds 
  ADD COLUMN IF NOT EXISTS category_v2 text,
  ADD COLUMN IF NOT EXISTS shortlisted boolean DEFAULT false;

-- Mise à jour catégories
UPDATE funds SET category_v2 = category WHERE category_v2 IS NULL;

-- Table fonds complète (si besoin de repartir de zéro)
CREATE TABLE IF NOT EXISTS funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  isin text,
  manager text,
  category text NOT NULL DEFAULT 'UC',
  notes text,
  shortlisted boolean DEFAULT false,
  sri integer CHECK (sri >= 1 AND sri <= 7),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── VL HISTORY ─────────────────────────────────────────────
ALTER TABLE vl_history 
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- source: 'manual' = saisie CGP, 'auto' = agent IA

-- ── CLIENTS ────────────────────────────────────────────────
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS tmi text,
  ADD COLUMN IF NOT EXISTS ifi boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS objectif_successoral boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS situation_fiscale text,
  ADD COLUMN IF NOT EXISTS objectifs text,
  ADD COLUMN IF NOT EXISTS contraintes text;

-- ── CLIENT FUNDS ───────────────────────────────────────────
ALTER TABLE client_funds
  ADD COLUMN IF NOT EXISTS vl_entree numeric(12,4),
  ADD COLUMN IF NOT EXISTS date_entree date,
  ADD COLUMN IF NOT EXISTS montant_investi numeric(14,2),
  ADD COLUMN IF NOT EXISTS seuil_alerte_sortie numeric(12,4);

-- Mise à jour contrainte status
ALTER TABLE client_funds DROP CONSTRAINT IF EXISTS client_funds_status_check;
ALTER TABLE client_funds ADD CONSTRAINT client_funds_status_check 
  CHECK (status IN ('actif', 'à surveiller', 'à arbitrer', 'soldé'));

-- ── ANALYSES HISTORY ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS analyse_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid REFERENCES funds(id) ON DELETE SET NULL,
  isin text NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('ENTRER', 'ATTENDRE', 'ÉVITER')),
  analyse_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analyse_history_isin ON analyse_history(isin);
CREATE INDEX IF NOT EXISTS idx_analyse_history_date ON analyse_history(created_at DESC);

-- ── VEILLE LOG ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS veille_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veille_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Garder seulement les 30 derniers jours
CREATE INDEX IF NOT EXISTS idx_veille_log_date ON veille_log(created_at DESC);

-- ── RLS POLICIES ───────────────────────────────────────────
-- Accès ouvert (usage mono-utilisateur sans auth)
DO $$ 
BEGIN
  -- analyse_history
  ALTER TABLE analyse_history ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "open_analyse" ON analyse_history;
  CREATE POLICY "open_analyse" ON analyse_history FOR ALL USING (true) WITH CHECK (true);
  
  -- veille_log
  ALTER TABLE veille_log ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "open_veille" ON veille_log;
  CREATE POLICY "open_veille" ON veille_log FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy already exists or error: %', SQLERRM;
END $$;

-- ── TRIGGERS ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS funds_updated_at ON funds;
CREATE TRIGGER funds_updated_at BEFORE UPDATE ON funds FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS clients_updated_at ON clients;
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS client_funds_updated_at ON client_funds;
CREATE TRIGGER client_funds_updated_at BEFORE UPDATE ON client_funds FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── VUE PORTEFEUILLE CLIENT ────────────────────────────────
CREATE OR REPLACE VIEW client_portfolio AS
SELECT 
  cf.id,
  cf.client_id,
  cf.fund_id,
  f.name as fund_name,
  f.isin,
  f.manager,
  f.category,
  cf.vl_entree,
  cf.date_entree,
  cf.montant_investi,
  cf.seuil_alerte_sortie,
  cf.status,
  cf.note as position_note,
  -- Dernière VL connue
  vlh.vl as vl_actuelle,
  vlh.recorded_at as vl_date,
  vlh.source as vl_source,
  -- Performance
  CASE 
    WHEN cf.vl_entree IS NOT NULL AND vlh.vl IS NOT NULL 
    THEN ROUND(((vlh.vl - cf.vl_entree) / cf.vl_entree * 100)::numeric, 2)
    ELSE NULL 
  END as perf_pct,
  CASE 
    WHEN cf.montant_investi IS NOT NULL AND cf.vl_entree IS NOT NULL AND vlh.vl IS NOT NULL
    THEN ROUND((cf.montant_investi * (vlh.vl - cf.vl_entree) / cf.vl_entree)::numeric, 2)
    ELSE NULL 
  END as perf_eur,
  -- Alerte seuil
  CASE 
    WHEN cf.seuil_alerte_sortie IS NOT NULL AND vlh.vl IS NOT NULL
    THEN vlh.vl >= cf.seuil_alerte_sortie
    ELSE false
  END as seuil_atteint
FROM client_funds cf
JOIN funds f ON f.id = cf.fund_id
LEFT JOIN LATERAL (
  SELECT vl, recorded_at, source 
  FROM vl_history 
  WHERE fund_id = cf.fund_id 
  ORDER BY recorded_at DESC 
  LIMIT 1
) vlh ON true
WHERE cf.status != 'soldé';
