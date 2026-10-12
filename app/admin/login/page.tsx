'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit() {
    setSending(true);
    setError(null);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(data.error ?? 'Error inesperado');
      return;
    }
    router.push('/admin');
  }

  return (
    <main style={{ maxWidth: 360, margin: '96px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={{ font: '900 28px var(--font-sans)' }}>Admin · The English Project</h1>
      {error ? <div style={{ color: 'var(--danger-500)' }}>{error}</div> : null}
      <Input label="Contraseña" type="password" value={password} onChange={setPassword} />
      <Button size="lg" fullWidth disabled={sending} onClick={submit}>Entrar</Button>
    </main>
  );
}
