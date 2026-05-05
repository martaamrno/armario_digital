import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.login(email, password);
      localStorage.setItem('access_token', data.access_token);
      navigate('/dashboard');
    } catch (err) {
      setError('Credenciales incorrectas. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-rose-light flex items-center justify-center px-4 py-12">
      {/* Decoración fondo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-rose-soft/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-rose-soft/30 blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-scale-in relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-2xl gradient-rose flex items-center justify-center shadow-burgundy">
              <span className="text-white text-lg">✦</span>
            </div>
            <span className="font-playfair text-2xl font-semibold text-plum">OutfitLab</span>
          </div>
          <h1 className="font-playfair text-3xl font-semibold text-plum mb-2">Bienvenida de nuevo</h1>
          <p className="text-plum/50 text-sm">Inicia sesión para acceder a tu armario</p>
        </div>

        <div className="card p-8">
          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="label-field">Correo electrónico</label>
              <input
                type="email"
                required
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="label-field">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input-field pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-plum/30 hover:text-plum/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</> : 'Iniciar sesión'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-plum/50">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-burgundy font-semibold hover:text-burgundy-dark transition-colors">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
