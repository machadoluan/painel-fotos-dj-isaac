-- ============================================================
-- SCHEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  active      boolean DEFAULT true,
  featured    boolean DEFAULT false,  -- true = vinculado ao QR code fixo (/upload)
  banner_url  text,                   -- URL pública do banner exibido na página do convidado
  banner_path text,                   -- Caminho no Storage para exclusão
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid REFERENCES events(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  url          text NOT NULL,
  visible      boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- events: leitura pública (convidados precisam buscar o evento pelo slug)
CREATE POLICY "events_public_select" ON events
  FOR SELECT TO anon, authenticated
  USING (true);

-- events: admin cria/edita eventos via anon key (auth é feita client-side via VITE_ADMIN_PASSWORD)
CREATE POLICY "events_insert" ON events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "events_update" ON events
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "events_delete" ON events
  FOR DELETE TO anon, authenticated
  USING (true);

-- photos: leitura pública das fotos visíveis
CREATE POLICY "photos_public_select" ON photos
  FOR SELECT TO anon, authenticated
  USING (visible = true);

-- photos: insert público (convidados fazem upload sem login)
CREATE POLICY "photos_public_insert" ON photos
  FOR INSERT TO anon
  WITH CHECK (true);

-- photos: update/delete apenas via service_role (painel admin usa service_role no server,
-- ou use Supabase Auth para o admin e ajuste as políticas)
-- Para simplicidade com VITE_ADMIN_PASSWORD (client-side), libere update/delete para anon
-- SOMENTE se o projeto não for público — considere usar service_role key no admin.
CREATE POLICY "photos_update_visible" ON photos
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "photos_delete" ON photos
  FOR DELETE TO anon, authenticated
  USING (true);

-- ============================================================
-- REALTIME
-- ============================================================

ALTER TABLE photos REPLICA IDENTITY FULL;

-- Execute no Supabase Dashboard > Database > Replication
-- para adicionar a tabela photos à publicação supabase_realtime.

-- ============================================================
-- STORAGE (execute no Dashboard > Storage > Policies)
-- ============================================================

-- Bucket: event-photos (público)
-- Criar manualmente no Dashboard ou via API.

-- Política de INSERT público:
-- CREATE POLICY "public_upload" ON storage.objects
--   FOR INSERT TO anon
--   WITH CHECK (bucket_id = 'event-photos');

-- Política de SELECT público:
-- CREATE POLICY "public_read" ON storage.objects
--   FOR SELECT TO anon
--   USING (bucket_id = 'event-photos');

-- Política de DELETE (para o admin deletar fotos):
-- CREATE POLICY "public_delete" ON storage.objects
--   FOR DELETE TO anon
--   USING (bucket_id = 'event-photos');
