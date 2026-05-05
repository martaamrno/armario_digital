import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useToast } from './Toast';
import {
  ArrowLeft, Upload, User, Image as ImageIcon, Loader2,
  Sparkles, Check, Crown, Lock, Key, AlertTriangle, X
} from 'lucide-react';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);

  const [fotoPerfilUrl, setFotoPerfilUrl] = useState(null);
  const [uploadingPerfil, setUploadingPerfil] = useState(false);
  const perfilInputRef = useRef(null);

  const [fotoUrl, setFotoUrl] = useState(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fotoInputRef = useRef(null);

  const [avatarUrl, setAvatarUrl] = useState(null);
  const [generandoAvatar, setGenerandoAvatar] = useState(false);
  const [avatarStatusText, setAvatarStatusText] = useState('');
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [aplicandoAvatar, setAplicandoAvatar] = useState(false);

  const [passwords, setPasswords] = useState({ actual: '', nueva: '', confirmacion: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const userData = await api.getAuthMe();
      setUser(userData);
      if (userData.foto_perfil_url) {
        const pData = await api.getFotoPerfilUrl();
        if (pData) setFotoPerfilUrl(pData.url);
      }
      if (userData.foto_cuerpo_url) {
        const fotoData = await api.getFotoCuerpoUrl();
        if (fotoData) setFotoUrl(fotoData.url);
      }
      if (userData.avatar_url) {
        const avatarData = await api.getAvatarUrl();
        if (avatarData) setAvatarUrl(avatarData.url);
      }
    } catch (err) {
      if (err.message === 'Unauthorized') navigate('/login');
      addToast('Error al cargar perfil', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setSavingName(true);
    try {
      await api.updateAuthMe({ nombre: user.nombre });
      addToast('Nombre actualizado', 'success');
    } catch {
      addToast('Error al actualizar nombre', 'error');
    } finally {
      setSavingName(false);
    }
  };

  const handleUploadPerfil = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      addToast('Formato no soportado (usa JPG o PNG)', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('La imagen es demasiado grande (máx 5MB)', 'error');
      return;
    }
    setFotoPerfilUrl(URL.createObjectURL(file));
    setUploadingPerfil(true);
    const formData = new FormData();
    formData.append('imagen', file);
    try {
      await api.uploadFotoPerfil(formData);
      addToast('Foto de perfil actualizada', 'success');
      const pData = await api.getFotoPerfilUrl();
      if (pData) setFotoPerfilUrl(pData.url);
    } catch {
      addToast('Error al subir foto de perfil', 'error');
    } finally {
      setUploadingPerfil(false);
    }
  };

  const handleUploadFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFotoUrl(URL.createObjectURL(file));
    setUploadingFoto(true);
    const formData = new FormData();
    formData.append('imagen', file);
    try {
      await api.uploadFotoCuerpo(formData);
      addToast('Foto de cuerpo subida con éxito', 'success');
      const fotoData = await api.getFotoCuerpoUrl();
      if (fotoData) setFotoUrl(fotoData.url);
    } catch {
      addToast('Error al subir foto', 'error');
      setFotoUrl(null);
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleGenerarAvatar = async () => {
    if (!avatarPrompt) return;
    setGenerandoAvatar(true);
    setAvatarStatusText('Iniciando...');
    try {
      await api.generarAvatar({ descripcion: avatarPrompt });
      addToast('Generación de avatar iniciada...', 'success');
      const poll = setInterval(async () => {
        try {
          const statusData = await api.getAvatarStatus();
          if (statusData.avatar_estado === 'pendiente') setAvatarStatusText('En cola...');
          else if (statusData.avatar_estado === 'generando') setAvatarStatusText('Generando con IA...');
          else if (statusData.avatar_estado === 'listo') {
            const data = await api.getAvatarUrl();
            if (data?.url) setAvatarUrl(data.url);
            setGenerandoAvatar(false);
            setAvatarStatusText('');
            clearInterval(poll);
          } else if (statusData.avatar_estado === 'error') {
            setGenerandoAvatar(false);
            setAvatarStatusText('');
            clearInterval(poll);
            addToast('La IA no pudo generar el avatar. Intenta con otro prompt.', 'error');
          }
        } catch (_) {}
      }, 3000);
    } catch {
      addToast('Error al iniciar la generación', 'error');
      setGenerandoAvatar(false);
      setAvatarStatusText('');
    }
  };

  const handleUsarAvatarComoPerfil = async () => {
    setAplicandoAvatar(true);
    try {
      await api.usarAvatarComoPerfil();
      const pData = await api.getFotoPerfilUrl();
      if (pData) setFotoPerfilUrl(pData.url);
      addToast('Avatar aplicado como foto de perfil', 'success');
    } catch {
      addToast('Error al aplicar el avatar', 'error');
    } finally {
      setAplicandoAvatar(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.nueva !== passwords.confirmacion) {
      addToast('Las contraseñas nuevas no coinciden', 'error');
      return;
    }
    if (passwords.nueva.length < 6) {
      addToast('La nueva contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await api.changePassword({ password_actual: passwords.actual, password_nueva: passwords.nueva });
      addToast('Contraseña actualizada con éxito', 'success');
      setPasswords({ actual: '', nueva: '', confirmacion: '' });
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCancelPremium = async () => {
    setCanceling(true);
    try {
      await api.cancelSubscription();
      setUser({ ...user, tipo_usuario: 'normal' });
      addToast('Suscripción cancelada exitosamente.', 'success');
      setShowCancelModal(false);
    } catch {
      addToast('Error al cancelar la suscripción.', 'error');
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-light">
        <Loader2 className="w-8 h-8 text-burgundy animate-spin" />
      </div>
    );
  }

  const isPremium = user?.tipo_usuario === 'premium';

  return (
    <div className="min-h-screen bg-rose-light flex flex-col">
      {/* Decoración */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-rose-soft/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-lavender-soft/30 blur-3xl" />
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-rose-soft/50 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="btn-ghost text-sm py-2 px-3">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>
          {isPremium ? (
            <span className="flex items-center gap-1.5 bg-rose-soft/60 text-burgundy px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide">
              <Crown className="w-3 h-3" /> Premium
            </span>
          ) : (
            <Link to="/premium" className="text-xs font-semibold text-burgundy hover:underline">
              Mejorar a Premium
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full space-y-6 relative">
        {/* Hero perfil */}
        <div className="card p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-full border-4 border-white shadow-rose overflow-hidden flex items-center justify-center bg-rose-soft/40 relative">
              {fotoPerfilUrl ? (
                <img src={fotoPerfilUrl} alt="Perfil" className={`w-full h-full object-cover ${uploadingPerfil ? 'opacity-50' : ''}`} />
              ) : (
                <User className="w-10 h-10 text-plum/20" />
              )}
              {uploadingPerfil && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/40">
                  <Loader2 className="w-6 h-6 text-burgundy animate-spin" />
                </div>
              )}
            </div>
            <button
              onClick={() => perfilInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-rose border border-rose-soft/60 text-plum/40 hover:text-burgundy transition-colors"
              title="Cambiar foto de perfil"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <input type="file" accept="image/*" className="hidden" ref={perfilInputRef} onChange={handleUploadPerfil} />
          </div>
          <div className="text-center sm:text-left">
            <h1 className="font-playfair text-3xl font-semibold text-plum">{user?.nombre}</h1>
            <p className="text-plum/50 text-sm mt-1">{user?.email}</p>
            <span className={`inline-flex items-center gap-1.5 mt-2 text-xs font-semibold px-3 py-1 rounded-full ${isPremium ? 'bg-rose-soft/60 text-burgundy' : 'bg-rose-light text-plum/50 border border-rose-soft/60'}`}>
              {isPremium ? <Crown className="w-3 h-3" /> : <User className="w-3 h-3" />}
              {isPremium ? 'Premium' : 'Plan Normal'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Información Personal */}
          <div className="card p-6 space-y-5">
            <h2 className="font-playfair text-xl font-semibold text-plum flex items-center gap-2 pb-4 border-b border-rose-soft/40">
              <User className="w-4 h-4 text-rose-mid" /> Información Personal
            </h2>

            <form onSubmit={handleUpdateName} className="space-y-3">
              <div>
                <label className="label-field">Nombre completo</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={user?.nombre || ''}
                    onChange={e => setUser({ ...user, nombre: e.target.value })}
                    className="input-field flex-1"
                  />
                  <button type="submit" disabled={savingName} className="btn-primary py-3 px-4 shrink-0">
                    {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </form>

            <div className="pt-4 border-t border-rose-soft/40 space-y-4">
              <h3 className="font-semibold text-plum flex items-center gap-2 text-sm">
                <Key className="w-4 h-4 text-rose-mid" /> Seguridad
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="label-field">Contraseña actual</label>
                  <input type="password" required autoComplete="current-password" placeholder="••••••••" value={passwords.actual} onChange={e => setPasswords({ ...passwords, actual: e.target.value })} className="input-field" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-field">Nueva contraseña</label>
                    <input type="password" required autoComplete="new-password" placeholder="Mín. 6 car." value={passwords.nueva} onChange={e => setPasswords({ ...passwords, nueva: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="label-field">Confirmar nueva</label>
                    <input type="password" required autoComplete="new-password" placeholder="Mín. 6 car." value={passwords.confirmacion} onChange={e => setPasswords({ ...passwords, confirmacion: e.target.value })} className="input-field" />
                  </div>
                </div>
                <button type="submit" disabled={changingPassword} className="btn-primary w-full">
                  {changingPassword ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Key className="w-4 h-4" /> Cambiar contraseña</>}
                </button>
              </form>
            </div>
          </div>

          {/* Suscripción */}
          <div className="card p-6 flex flex-col">
            <h2 className="font-playfair text-xl font-semibold text-plum flex items-center gap-2 pb-4 border-b border-rose-soft/40 mb-5">
              <Crown className={`w-4 h-4 ${isPremium ? 'text-rose-mid' : 'text-plum/20'}`} /> Suscripción
            </h2>
            <div className="flex-1 flex flex-col justify-center text-center p-6 bg-rose-light rounded-2xl border border-rose-soft/40">
              <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${isPremium ? 'bg-rose-soft/60 text-burgundy' : 'bg-white text-plum/20 border border-rose-soft/60'}`}>
                {isPremium ? <Crown className="w-7 h-7" /> : <User className="w-7 h-7" />}
              </div>
              <p className="text-xs text-plum/40 font-medium uppercase tracking-widest mb-1">Tu plan actual</p>
              <h3 className={`font-playfair text-3xl font-semibold mb-5 ${isPremium ? 'text-burgundy' : 'text-plum/60'}`}>
                {isPremium ? 'Premium' : 'Normal'}
              </h3>
              {isPremium ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-burgundy font-medium justify-center">
                    <Check className="w-4 h-4" /> Todos los beneficios activos
                  </div>
                  <button onClick={() => setShowCancelModal(true)} className="text-xs text-plum/30 hover:text-red-500 transition-colors font-medium">
                    Cancelar suscripción
                  </button>
                </div>
              ) : (
                <Link to="/premium" className="btn-primary w-full justify-center">
                  <Crown className="w-4 h-4" /> Mejorar a Premium
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Foto de Cuerpo */}
          <div className={`card p-6 flex flex-col relative overflow-hidden ${isPremium ? '' : ''}`}>
            {!isPremium && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center rounded-3xl">
                <div className="bg-rose-light p-4 rounded-full mb-3 border border-rose-soft/60">
                  <Lock className="w-6 h-6 text-plum/30" />
                </div>
                <h3 className="font-semibold text-plum mb-1 text-sm">Virtual Try-On</h3>
                <p className="text-xs text-plum/50 mb-4 px-4">Mejora tu plan para subir tu foto y ver cómo te queda la ropa generada por IA.</p>
                <Link to="/premium" className="btn-primary text-sm py-2 px-5">Mejorar Plan</Link>
              </div>
            )}
            <h2 className="font-playfair text-lg font-semibold text-plum flex items-center gap-2 mb-1">
              <ImageIcon className="w-4 h-4 text-rose-mid" /> Foto de Cuerpo Completo
            </h2>
            <p className="text-xs text-plum/40 mb-5">Usa esta foto para probarte outfits digitalmente.</p>
            <div
              className={`aspect-[3/4] w-full max-w-[220px] mx-auto bg-rose-light rounded-2xl overflow-hidden border-2 border-dashed border-rose-soft relative flex items-center justify-center group ${isPremium ? 'cursor-pointer hover:border-rose-mid' : ''}`}
              onClick={() => isPremium && fotoInputRef.current?.click()}
            >
              {fotoUrl ? (
                <>
                  <img src={fotoUrl} alt="Cuerpo Completo" className={`w-full h-full object-cover transition-all group-hover:scale-105 ${uploadingFoto ? 'opacity-50' : ''}`} />
                  {uploadingFoto && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-sm">
                      <Loader2 className="w-8 h-8 text-burgundy animate-spin" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-plum/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <span className="text-white text-sm font-semibold flex items-center gap-2"><Upload className="w-4 h-4" /> Cambiar</span>
                  </div>
                </>
              ) : (
                <div className="text-center p-6">
                  <User className="w-14 h-14 text-plum/10 mx-auto mb-3" />
                  <span className="text-xs text-plum/30 font-semibold uppercase tracking-wider group-hover:text-burgundy transition-colors">Subir foto</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" ref={fotoInputRef} onChange={handleUploadFoto} disabled={!isPremium} />
            </div>
          </div>

          {/* Avatar IA */}
          <div className="card p-6 flex flex-col relative overflow-hidden">
            {!isPremium && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center rounded-3xl">
                <div className="bg-lavender-soft p-4 rounded-full mb-3 border border-lavender-soft">
                  <Lock className="w-6 h-6 text-plum/30" />
                </div>
                <h3 className="font-semibold text-plum mb-1 text-sm">Avatar IA</h3>
                <p className="text-xs text-plum/50 mb-4 px-4">Genera avatares personalizados con Inteligencia Artificial.</p>
                <Link to="/premium" className="btn-primary text-sm py-2 px-5">Mejorar Plan</Link>
              </div>
            )}
            <h2 className="font-playfair text-lg font-semibold text-plum flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-rose-mid" /> Tu Avatar IA
            </h2>
            <p className="text-xs text-plum/40 mb-5">Crea una versión digital de ti con IA.</p>

            <div className="flex flex-col items-center gap-4">
              <div className="w-28 h-28 rounded-full bg-lavender-soft/40 border-4 border-white shadow-rose overflow-hidden flex items-center justify-center shrink-0 relative group">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar IA" className={`w-full h-full object-cover transition-transform group-hover:scale-110 ${generandoAvatar ? 'opacity-50' : ''}`} />
                ) : (
                  <User className="w-10 h-10 text-plum/10" />
                )}
                {generandoAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-sm">
                    <Loader2 className="w-7 h-7 text-lavender animate-spin" />
                  </div>
                )}
              </div>

              <div className="w-full space-y-3">
                <textarea
                  rows={3}
                  placeholder="Describe tu avatar (ej: pelo largo rubio, estilo anime, ropa deportiva...)"
                  className="input-field resize-none text-sm"
                  value={avatarPrompt}
                  onChange={(e) => setAvatarPrompt(e.target.value)}
                  disabled={generandoAvatar || !isPremium}
                />
                <button
                  onClick={handleGenerarAvatar}
                  disabled={generandoAvatar || !avatarPrompt || !isPremium}
                  className="btn-primary w-full"
                >
                  {generandoAvatar
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> {avatarStatusText || 'Generando...'}</>
                    : <><Sparkles className="w-4 h-4" /> Generar Avatar IA</>}
                </button>
                {avatarUrl && !generandoAvatar && (
                  <button
                    onClick={handleUsarAvatarComoPerfil}
                    disabled={aplicandoAvatar}
                    className="btn-secondary w-full"
                  >
                    {aplicandoAvatar
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Aplicando...</>
                      : <><Check className="w-4 h-4" /> Usar como foto de perfil</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal cancelación */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-plum/40 backdrop-blur-sm animate-fade-in" onClick={() => !canceling && setShowCancelModal(false)} />
          <div className="bg-white rounded-3xl shadow-rose-lg w-full max-w-sm relative z-10 overflow-hidden animate-scale-in">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="font-playfair text-xl font-semibold text-plum mb-2">¿Cancelar Premium?</h3>
              <p className="text-plum/50 text-sm mb-6 leading-relaxed">
                Perderás el acceso al Virtual Try-On, la generación de avatares IA y el límite extendido de prendas.
              </p>
              <div className="flex flex-col gap-2">
                <button onClick={handleCancelPremium} disabled={canceling} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {canceling ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelando...</> : 'Sí, cancelar beneficios'}
                </button>
                <button onClick={() => setShowCancelModal(false)} disabled={canceling} className="btn-ghost w-full py-3">
                  Mantener mi plan Premium
                </button>
              </div>
            </div>
            <button onClick={() => setShowCancelModal(false)} className="absolute top-4 right-4 text-plum/20 hover:text-plum/50 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
