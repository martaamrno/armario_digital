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
  
  // Foto Perfil (Normal)
  const [fotoPerfilUrl, setFotoPerfilUrl] = useState(null);
  const [uploadingPerfil, setUploadingPerfil] = useState(false);
  const perfilInputRef = useRef(null);

  // Foto Cuerpo (Premium)
  const [fotoUrl, setFotoUrl] = useState(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fotoInputRef = useRef(null);

  // Avatar IA (Premium)
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [generandoAvatar, setGenerandoAvatar] = useState(false);
  const [avatarStatusText, setAvatarStatusText] = useState('');
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [aplicandoAvatar, setAplicandoAvatar] = useState(false);

  // Cambio de contraseña
  const [passwords, setPasswords] = useState({ actual: '', nueva: '', confirmacion: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  // Modal Cancelación
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

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
    } catch (err) {
      addToast('Error al actualizar nombre', 'error');
    } finally {
      setSavingName(false);
    }
  };

  const handleUploadPerfil = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validaciones
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      addToast('Formato no soportado (usa JPG o PNG)', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('La imagen es demasiado grande (máx 5MB)', 'error');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setFotoPerfilUrl(previewUrl);
    setUploadingPerfil(true);

    const formData = new FormData();
    formData.append('imagen', file);

    try {
      await api.uploadFotoPerfil(formData);
      addToast('Foto de perfil actualizada', 'success');
      const pData = await api.getFotoPerfilUrl();
      if (pData) setFotoPerfilUrl(pData.url);
    } catch (err) {
      addToast('Error al subir foto de perfil', 'error');
      setFotoPerfilUrl(user?.foto_perfil_url ? fotoPerfilUrl : null);
    } finally {
      setUploadingPerfil(false);
    }
  };

  const handleUploadFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setFotoUrl(previewUrl);
    setUploadingFoto(true);

    const formData = new FormData();
    formData.append('imagen', file);

    try {
      await api.uploadFotoCuerpo(formData);
      addToast('Foto de cuerpo subida con éxito', 'success');
      const fotoData = await api.getFotoCuerpoUrl();
      if (fotoData) setFotoUrl(fotoData.url);
    } catch (err) {
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
          if (statusData.avatar_estado === 'pendiente') {
             setAvatarStatusText('En cola...');
          } else if (statusData.avatar_estado === 'generando') {
             setAvatarStatusText('Generando con IA...');
          } else if (statusData.avatar_estado === 'listo') {
             const data = await api.getAvatarUrl();
             if (data && data.url) setAvatarUrl(data.url);
             setGenerandoAvatar(false);
             setAvatarStatusText('');
             clearInterval(poll);
          } else if (statusData.avatar_estado === 'error') {
             setGenerandoAvatar(false);
             setAvatarStatusText('');
             clearInterval(poll);
             addToast('La IA no pudo generar el avatar. Intenta con otro prompt.', 'error');
          }
        } catch (e) {
          // ignorar errores de red transitorios
        }
      }, 3000);
    } catch (err) {
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
    } catch (err) {
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
      await api.changePassword({
        password_actual: passwords.actual,
        password_nueva: passwords.nueva
      });
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
    } catch (err) {
      addToast('Error al cancelar la suscripción.', 'error');
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>;
  }

  const isPremium = user?.tipo_usuario === 'premium';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Volver al Dashboard
          </Link>
          <div className="flex items-center gap-2">
            {isPremium ? (
              <span className="flex items-center gap-1 bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                <Crown className="w-3 h-3" /> Premium
              </span>
            ) : (
              <Link to="/premium" className="text-xs font-medium text-indigo-600 hover:underline">
                Mejorar a Premium
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full space-y-8">
        <div className="flex flex-col sm:flex-row items-center gap-6 bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-indigo-50 border-4 border-white shadow-md overflow-hidden flex items-center justify-center relative">
              {fotoPerfilUrl ? (
                <img src={fotoPerfilUrl} alt="Perfil" className={`w-full h-full object-cover ${uploadingPerfil ? 'opacity-50' : ''}`} />
              ) : (
                <User className="w-10 h-10 text-indigo-200" />
              )}
              {uploadingPerfil && <div className="absolute inset-0 flex items-center justify-center bg-white/40"><Loader2 className="w-6 h-6 text-indigo-600 animate-spin" /></div>}
            </div>
            <button 
              onClick={() => perfilInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-lg border border-gray-100 text-gray-600 hover:text-indigo-600 transition-colors"
              title="Cambiar foto de perfil"
            >
              <Upload className="w-4 h-4" />
            </button>
            <input type="file" accept="image/*" className="hidden" ref={perfilInputRef} onChange={handleUploadPerfil} />
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold text-gray-900">{user?.nombre}</h1>
            <p className="text-gray-500">{user?.email} • Usuario {isPremium ? 'Premium' : 'Normal'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Datos Personales */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 border-b pb-4">
              <User className="w-5 h-5 text-indigo-500" /> Información Personal
            </h2>
            <form onSubmit={handleUpdateName} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    required 
                    value={user?.nombre || ''} 
                    onChange={e => setUser({...user, nombre: e.target.value})}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                  />
                  <button type="submit" disabled={savingName} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 font-medium shadow-sm">
                    {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Actualizar
                  </button>
                </div>
              </div>
            </form>

            <div className="pt-4 border-t">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
                <Key className="w-5 h-5 text-indigo-500" /> Seguridad
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña Actual</label>
                  <input 
                    type="password" 
                    required 
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={passwords.actual}
                    onChange={e => setPasswords({...passwords, actual: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                    <input 
                      type="password" 
                      required 
                      autoComplete="new-password"
                      placeholder="Mín. 6 car."
                      value={passwords.nueva}
                      onChange={e => setPasswords({...passwords, nueva: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nueva</label>
                    <input 
                      type="password" 
                      required 
                      autoComplete="new-password"
                      placeholder="Mín. 6 car."
                      value={passwords.confirmacion}
                      onChange={e => setPasswords({...passwords, confirmacion: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                </div>
                <button type="submit" disabled={changingPassword} className="w-full py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition flex items-center justify-center gap-2 font-medium shadow-sm">
                  {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />} Cambiar Contraseña
                </button>
              </form>
            </div>
          </div>

          {/* Gestión de Suscripción */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
              <Crown className={`w-5 h-5 ${isPremium ? 'text-indigo-500' : 'text-gray-400'}`} /> Suscripción
            </h2>
            <div className="flex-1 flex flex-col justify-center text-center p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${isPremium ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                {isPremium ? <Crown className="w-8 h-8" /> : <User className="w-8 h-8" />}
              </div>
              <p className="text-sm text-gray-500 font-medium mb-1">Tu plan actual</p>
              <h3 className={`text-2xl font-black mb-6 ${isPremium ? 'text-indigo-600' : 'text-gray-900'}`}>
                {isPremium ? 'PREMIUM' : 'NORMAL'}
              </h3>
              
              {isPremium ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-green-600 font-medium justify-center">
                    <Check className="w-4 h-4" /> Todos los beneficios activos
                  </div>
                  <button 
                    onClick={() => setShowCancelModal(true)}
                    className="w-full py-2.5 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
                  >
                    Cancelar Suscripción
                  </button>
                </div>
              ) : (
                <Link 
                  to="/premium"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2"
                >
                  Mejorar a Premium
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 pt-4">
          {/* Foto de Cuerpo */}
          <div className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col relative overflow-hidden ${!isPremium ? 'border-gray-200' : 'border-indigo-200'}`}>
            {!isPremium && (
               <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
                 <div className="bg-white p-4 rounded-full shadow-lg mb-3"><Lock className="w-8 h-8 text-gray-400" /></div>
                 <h3 className="font-bold text-gray-900 mb-1">Virtual Try-On</h3>
                 <p className="text-sm text-gray-600 mb-4 px-4">Mejora tu plan para subir tu foto y ver cómo te queda la ropa generada por IA.</p>
                 <Link to="/premium" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition shadow-md">Mejorar Plan</Link>
               </div>
            )}
            <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-indigo-500" /> Foto de Cuerpo Completo
            </h2>
            <p className="text-sm text-gray-500 mb-6">Usa esta foto para probarte outfits digitalmente.</p>
            
            <div className={`aspect-[3/4] w-full max-w-[250px] mx-auto bg-gray-50 rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 relative flex items-center justify-center group ${isPremium ? 'cursor-pointer hover:border-indigo-400' : ''}`} onClick={() => isPremium && fotoInputRef.current?.click()}>
              {fotoUrl ? (
                <>
                  <img src={fotoUrl} alt="Cuerpo Completo" className={`w-full h-full object-cover transition-all group-hover:scale-105 ${uploadingFoto ? 'opacity-50' : 'opacity-100'}`} />
                  {uploadingFoto && <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-sm"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <span className="text-white font-bold flex items-center gap-2"><Upload className="w-4 h-4" /> Cambiar foto</span>
                  </div>
                </>
              ) : (
                <div className="text-center p-6">
                  <User className="w-16 h-16 text-gray-200 mx-auto mb-3" />
                  <span className="text-sm text-gray-400 font-bold group-hover:text-indigo-500 transition-colors uppercase tracking-wider">Subir Foto Real</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" ref={fotoInputRef} onChange={handleUploadFoto} disabled={!isPremium} />
            </div>
          </div>

          {/* Avatar IA */}
          <div className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col relative overflow-hidden ${!isPremium ? 'border-gray-200' : 'border-purple-200'}`}>
            {!isPremium && (
               <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
                 <div className="bg-white p-4 rounded-full shadow-lg mb-3"><Lock className="w-8 h-8 text-gray-400" /></div>
                 <h3 className="font-bold text-gray-900 mb-1">Avatar IA</h3>
                 <p className="text-sm text-gray-600 mb-4 px-4">Genera avatares personalizados con Inteligencia Artificial.</p>
                 <Link to="/premium" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition shadow-md">Mejorar Plan</Link>
               </div>
            )}
            
            <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" /> Tu Avatar IA
            </h2>
            <p className="text-sm text-gray-500 mb-6">Crea una versión digital de ti mismo con IA.</p>
            
            <div className="flex gap-6 flex-col items-center">
              <div className="w-32 h-32 rounded-full bg-gray-50 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center shrink-0 relative group">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar IA" className={`w-full h-full object-cover transition-transform group-hover:scale-110 ${generandoAvatar ? 'opacity-50' : ''}`} />
                ) : (
                  <User className="w-12 h-12 text-gray-200" />
                )}
                {generandoAvatar && <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-sm"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /></div>}
              </div>

              <div className="w-full space-y-3">
                <textarea
                  rows={3}
                  placeholder="Describe cómo quieres tu avatar (ej: pelo largo rubio, estilo anime, ropa deportiva...)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none bg-gray-50"
                  value={avatarPrompt}
                  onChange={(e) => setAvatarPrompt(e.target.value)}
                  disabled={generandoAvatar || !isPremium}
                />
                <button
                  onClick={handleGenerarAvatar}
                  disabled={generandoAvatar || !avatarPrompt || !isPremium}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {generandoAvatar ? <><Loader2 className="w-4 h-4 animate-spin" /> {avatarStatusText}</> : <><Sparkles className="w-4 h-4" /> Generar Avatar IA</>}
                </button>
                {avatarUrl && !generandoAvatar && (
                  <button
                    onClick={handleUsarAvatarComoPerfil}
                    disabled={aplicandoAvatar}
                    className="w-full border-2 border-purple-300 text-purple-700 hover:bg-purple-50 font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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

      {/* Modal de Cancelación Premium */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" onClick={() => !canceling && setShowCancelModal(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-scale-in">
            <div className="p-1 bg-red-500"></div>
            <div className="p-8">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">¿Cancelar suscripción Premium?</h3>
              <p className="text-gray-500 text-center text-sm mb-8 leading-relaxed">
                Esta acción es inmediata. Perderás el acceso al Virtual Try-On, la generación de avatares IA y el límite extendido de prendas.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleCancelPremium}
                  disabled={canceling}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {canceling ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelando...</> : 'Sí, cancelar beneficios'}
                </button>
                <button 
                  onClick={() => setShowCancelModal(false)}
                  disabled={canceling}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all"
                >
                  Mantener mi plan Premium
                </button>
              </div>
            </div>
            <button 
              onClick={() => setShowCancelModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
