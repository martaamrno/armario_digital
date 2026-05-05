import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.register(formData);
      navigate('/login');
    } catch (err) {
      setError('No se pudo crear la cuenta. El email puede estar en uso.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="min-h-screen bg-rose-light flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-rose-soft/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-rose-soft/30 blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-scale-in relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-2xl gradient-rose flex items-center justify-center shadow-burgundy">
              <span className="text-white text-lg">✦</span>
            </div>
            <span className="font-playfair text-2xl font-semibold text-plum">Armario Digital</span>
          </div>
          <h1 className="font-playfair text-3xl font-semibold text-plum mb-2">Crea tu cuenta</h1>
          <p className="text-plum/50 text-sm">Únete y empieza a organizar tu estilo</p>
        </div>

        <div className="card p-8">
          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="label-field">Nombre completo</label>
              <input type="text" name="nombre" required className="input-field" value={formData.nombre} onChange={handleChange} placeholder="Tu nombre" />
            </div>
            <div>
              <label className="label-field">Correo electrónico</label>
              <input type="email" name="email" required className="input-field" value={formData.email} onChange={handleChange} placeholder="tu@email.com" />
            </div>
            <div>
              <label className="label-field">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  className="input-field pr-12"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mínimo 6 caracteres"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-plum/30 hover:text-plum/60 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando cuenta...</> : 'Crear cuenta'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-plum/50">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-burgundy font-semibold hover:text-burgundy-dark transition-colors">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
