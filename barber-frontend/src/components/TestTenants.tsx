import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

type TenantRow = {
  id: string;
  name?: string;
  created_at?: string;
  [key: string]: any;
};

export function TestTenants() {
  const [data, setData] = useState<TenantRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchOne = async () => {
      if (!supabase) {
        setError('Supabase client not initialized. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
        return;
      }

      setLoading(true);
      setError(null);

      const { data: rows, error: fetchError } = await supabase
        .from('Tenants')
        .select('*')
        .limit(1);

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setData(rows?.[0] ?? null);
        if (!rows || rows.length === 0) {
          setError('No rows returned. If data exists, RLS may be blocking the request.');
        }
      }

      setLoading(false);
    };

    fetchOne();
  }, []);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-100">
      <div className="mb-2 font-semibold text-slate-50">Test Tenants Fetch</div>
      <div className="mb-2 text-xs text-slate-400">Uses supabase.from('Tenants').select('*').limit(1)</div>

      {loading && <div className="text-slate-300">Loading...</div>}

      {error && (
        <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-amber-100">
          ⚠️ {error}
        </div>
      )}

      {data && (
        <pre className="mt-2 overflow-auto rounded bg-slate-800 p-2 text-xs text-emerald-100">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
