import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { FormError, useSubmit } from '../components/Forms.jsx';
import { LoadingState } from '../components/States.jsx';

export default function LoginPage() {
  const { status, login } = useAuth();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '' });
  const { busy, error, submit } = useSubmit(() => login(values.email.trim(), values.password));

  if (status === 'loading') return <main className="login"><LoadingState>Comprobando su sesión…</LoadingState></main>;
  if (status === 'authenticated') return <Navigate to={location.state?.from ?? '/'} replace />;

  return (
    <main className="login">
      <form className="login__card" onSubmit={submit}>
        <img className="login__logo" src={`${import.meta.env.BASE_URL}images/lucalza-logo.png`} alt="Lucalza" width="124" height="51" />
        <p className="eyebrow">Tablero ejecutivo</p>
        <h1>Seguimiento de Desarrollo Salesforce</h1>
        <label className="field field--form">
          <span>Correo</span>
          <input type="email" autoComplete="username" required autoFocus value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} />
        </label>
        <label className="field field--form">
          <span>Contraseña</span>
          <input type="password" autoComplete="current-password" required value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} />
        </label>
        <FormError message={error} />
        <button type="submit" className="button button--block" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
        <p className="login__hint">¿Olvidó su contraseña? Solicítela a un administrador.</p>
      </form>
    </main>
  );
}
