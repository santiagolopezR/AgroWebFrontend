import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://khyjgysblzpdyxynwijn.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_rnYFWWCEN9zmrmYiSwxw6g_LBX2WABP'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)