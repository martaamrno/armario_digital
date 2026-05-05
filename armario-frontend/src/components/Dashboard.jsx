import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useToast } from './Toast';
import OutfitGenerator from './OutfitGenerator';
import PrendaCard from './PrendaCard';
import {
  LogOut, Plus, Upload, Folder, Search, Loader2,
  User, Crown, Filter, Trash2, AlertTriangle, X,
  Sparkles, ImageIcon, ZoomIn, Tag
} from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [armarios, setArmarios] = useState([]);
  const [selectedArmario, setSelectedArmario] = useState(null);
  const [prendas, setPrendas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [fotoPerfilUrl, setFotoPerfilUrl] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [loadingPrendas, setLoadingPrendas] = useState(false);
  
  // Create Armario State
  const [newArmarioName, setNewArmarioName] = useState('');
  const [newArmarioDesc, setNewArmarioDesc] = useState('');
  const [showCreateArmario, setShowCreateArmario] = useState(false);

  // Upload Prenda State
  const [showUploadPrenda, setShowUploadPrenda] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const fileInputRef = useRef(null);

  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ temporada: '', id_categoria: '', estilo: '', color_principal: '' });

  // Looks generados
  const [looks, setLooks] = useState([]);
  const [lookImages, setLookImages] = useState({});
  const [selectedLook, setSelectedLook] = useState(null);

  // Modales
  const [armarioToDelete, setArmarioToDelete] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const fetchLooks = useCallback(async () => {
    try {
      const data = await api.getLooks();
      setLooks(data);
      // Cargar imágenes de looks listos
      data.filter(l => l.estado === 'listo' && l.imagen_generada_url).forEach(async (look) => {
        try {
          const res = await api.getOutfitImageUrl(look.id_look);
          if (res?.url) setLookImages(prev => ({ ...prev, [look.id_look]: res.url }));
        } catch (_) {}
      });
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    // Handle Stripe Success Return
    const query = new URLSearchParams(location.search);
    const session_id = query.get('session_id');
    const mock = query.get('mock');
    
    if (session_id || mock) {
      const verify = async () => {
        try {
          if (mock) {
            await api.updateAuthMe({ tipo_usuario: 'premium' });
          } else {
            await api.verifySession(session_id);
          }
          addToast('¡Suscripción Premium confirmada!', 'success');
          // Refresh user
          const u = await api.getAuthMe();
          setUser(u);
          navigate('/dashboard', { replace: true });
        } catch(e) {
          addToast('Hubo un problema verificando el pago', 'error');
        }
      };
      verify();
    }
  }, [location.search]);

  useEffect(() => {
    if (selectedArmario) {
      fetchPrendas(selectedArmario.id_armario);
    } else {
      setPrendas([]);
    }
  }, [selectedArmario]);

  const fetchInitialData = async () => {
    try {
      const [userData, armariosData, catsData] = await Promise.all([
        api.getAuthMe(),
        api.getArmarios(),
        api.getCategorias().catch(() => []) 
      ]);
      setUser(userData);
      setArmarios(armariosData);
      setCategorias(catsData);

      if (catsData.length > 0) setSelectedCategoria(catsData[0].id_categoria);

      if (armariosData.length > 0 && !selectedArmario) {
        setSelectedArmario(armariosData[0]);
      }

      // Cargar looks
      fetchLooks();

      // Cargar foto perfil
      if (userData.foto_perfil_url) {
        const pData = await api.getFotoPerfilUrl();
        if (pData) setFotoPerfilUrl(pData.url);
      } else if (userData.avatar_url) {
        const avatarData = await api.getAvatarUrl();
        if (avatarData) setFotoPerfilUrl(avatarData.url);
      }
    } catch (err) {
      if (err.message?.includes('401') || err.message === 'Unauthorized') {
        logout();
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrendas = async (id) => {
    setLoadingPrendas(true);
    try {
      const data = await api.getPrendas(id);
      setPrendas(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPrendas(false);
    }
  };

  const handleCreateArmario = async (e) => {
    e.preventDefault();
    try {
      const newArmario = await api.createArmario({ nombre: newArmarioName, descripcion: newArmarioDesc });
      setArmarios([...armarios, newArmario]);
      setSelectedArmario(newArmario);
      setNewArmarioName('');
      setNewArmarioDesc('');
      setShowCreateArmario(false);
      addToast('Armario creado con éxito', 'success');
    } catch (err) {
      addToast(err.message || 'Error al crear armario', 'error');
    }
  };

  const confirmDeleteArmario = async () => {
    if (!armarioToDelete) return;
    try {
      await api.deleteArmario(armarioToDelete.id_armario);
      setArmarios(armarios.filter(a => a.id_armario !== armarioToDelete.id_armario));
      if (selectedArmario?.id_armario === armarioToDelete.id_armario) setSelectedArmario(null);
      addToast('Armario eliminado', 'success');
    } catch (err) {
      addToast('Error al eliminar armario', 'error');
    } finally {
      setArmarioToDelete(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadPreview(URL.createObjectURL(file));
    } else {
      setUploadPreview(null);
    }
  };

  const handleUploadPrenda = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.append('id_armario', selectedArmario.id_armario);
    if(!formData.get('id_categoria')) {
        formData.append('id_categoria', selectedCategoria || 1);
    }

    setUploading(true);
    try {
      await api.uploadPrenda(formData);
      await fetchPrendas(selectedArmario.id_armario);
      setShowUploadPrenda(false);
      setUploadPreview(null);
      e.target.reset();
      addToast('Prenda subida con éxito. IA analizando...', 'success');
    } catch (err) {
      addToast(err.message || 'Error al subir prenda', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePrenda = async (id_prenda) => {
    if (!window.confirm('¿Eliminar esta prenda?')) return;
    try {
      await api.deletePrenda(id_prenda);
      setPrendas(prendas.filter(p => p.id_prenda !== id_prenda));
      addToast('Prenda eliminada', 'success');
    } catch (err) {
      addToast('Error al eliminar prenda', 'error');
    }
  };

  const handleDeleteLook = async (id_look) => {
    if (!window.confirm('¿Eliminar este look?')) return;
    try {
      await api.deleteLook(id_look);
      setLooks(looks.filter(l => l.id_look !== id_look));
      setLookImages(prev => { const n = { ...prev }; delete n[id_look]; return n; });
      addToast('Look eliminado', 'success');
    } catch (_) {
      addToast('Error al eliminar look', 'error');
    }
  };

  const logout = () => {
    // Limpieza completa
    localStorage.removeItem('access_token');
    localStorage.clear(); // Por si acaso
    setUser(null);
    setArmarios([]);
    setSelectedArmario(null);
    setPrendas([]);
    // Redirección
    navigate('/login', { replace: true });
  };

  // Filter Logic
  const prendasFiltradas = useMemo(() => {
    return prendas.filter(p => {
      if (filters.temporada && p.temporada !== filters.temporada) return false;
      if (filters.id_categoria && p.id_categoria.toString() !== filters.id_categoria) return false;
      if (filters.estilo && p.estilo && !p.estilo.toLowerCase().includes(filters.estilo.toLowerCase())) return false;
      if (filters.color_principal && p.color_principal && !p.color_principal.toLowerCase().includes(filters.color_principal.toLowerCase())) return false;
      return true;
    });
  }, [prendas, filters]);

  // Unique values for filter dropdowns
  const uniqueTemporadas = [...new Set(prendas.map(p => p.temporada).filter(Boolean))];
  const uniqueEstilos = [...new Set(prendas.map(p => p.estilo).filter(Boolean))];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const isPremium = user?.tipo_usuario === 'premium';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-md">
              <Folder className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Armario Digital</h1>
          </div>
          
          <div className="flex items-center gap-6">
            {isPremium ? (
               <Link to="/premium" className="flex items-center gap-1 text-xs font-bold text-indigo-800 bg-indigo-100 px-3 py-1 rounded-full uppercase tracking-wide hover:bg-indigo-200 transition">
                 <Crown className="w-3 h-3" /> Premium
               </Link>
            ) : (
               <Link to="/premium" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition bg-indigo-50 px-4 py-1.5 rounded-full">
                 Mejorar a Premium
               </Link>
            )}

            <div className="flex items-center gap-4 border-l pl-4 border-gray-200">
              <Link to="/profile" className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 transition-all text-sm font-medium group">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm ring-1 ring-gray-200">
                  {fotoPerfilUrl ? (
                    <img src={fotoPerfilUrl} alt="avatar" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  ) : (
                    <User className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <span className="hidden sm:inline font-semibold">{user?.nombre}</span>
              </Link>

              <button onClick={logout} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all" title="Cerrar sesión">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar / Armarios List */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-lg font-bold text-gray-800">Mis Armarios</h2>
              <button 
                onClick={() => setShowCreateArmario(!showCreateArmario)}
                className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                title="Nuevo armario"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {showCreateArmario && (
              <form onSubmit={handleCreateArmario} className="mb-4 space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-100 animate-fade-in">
                <input type="text" placeholder="Nombre del armario" required className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none" value={newArmarioName} onChange={e => setNewArmarioName(e.target.value)} />
                <input type="text" placeholder="Descripción" className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none" value={newArmarioDesc} onChange={e => setNewArmarioDesc(e.target.value)} />
                <button type="submit" className="w-full text-sm bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition-colors font-bold">Guardar Armario</button>
              </form>
            )}

            <div className="space-y-1">
              {armarios.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6 border-2 border-dashed border-gray-100 rounded-lg">No tienes armarios aún.</p>
              ) : (
                armarios.map(arm => (
                  <div key={arm.id_armario} className={`group flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${
                    selectedArmario?.id_armario === arm.id_armario ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'hover:bg-gray-50 text-gray-700'
                  }`} onClick={() => setSelectedArmario(arm)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <Folder className={`w-5 h-5 shrink-0 ${selectedArmario?.id_armario === arm.id_armario ? 'text-indigo-200' : 'text-gray-400'}`} />
                      <div className="truncate">
                        <span className="font-bold text-sm block truncate">{arm.nombre}</span>
                        {arm.descripcion && <span className={`text-[10px] truncate block ${selectedArmario?.id_armario === arm.id_armario ? 'text-indigo-100' : 'text-gray-400'}`}>{arm.descripcion}</span>}
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setArmarioToDelete(arm); }} className={`p-1 rounded-md transition-colors ${
                      selectedArmario?.id_armario === arm.id_armario ? 'hover:bg-indigo-500 text-indigo-200' : 'opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-400 hover:text-red-500'
                    }`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {selectedArmario && (
            isPremium ? (
              <OutfitGenerator idArmario={selectedArmario.id_armario} prendas={prendas} hasFotoCuerpo={!!user?.foto_cuerpo_url} isPremium={isPremium} onLookGenerated={fetchLooks} />
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                   <Crown className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900">IA Stylist Premium</h3>
                <p className="text-sm text-gray-500 px-2">¿Quieres que la IA te recomiende outfits y ver cómo te quedan con el Virtual Try-On?</p>
                <Link to="/premium" className="inline-block w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition">Saber más</Link>
              </div>
            )
          )}
        </div>

        {/* Main Content / Prendas */}
        <div className="lg:col-span-9">
          {!selectedArmario ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center h-full flex flex-col items-center justify-center">
              <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mb-6">
                <Search className="w-12 h-12 text-gray-300" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Bienvenido/a, {user?.nombre}</h2>
              <p className="text-gray-500 mt-2 max-w-sm">Selecciona un armario o crea uno nuevo para empezar a gestionar tus prendas.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{selectedArmario.nombre}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-400">{selectedArmario.descripcion || 'Sin descripción'}</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                    <span className="text-sm font-bold text-indigo-600">{prendas.length} prendas</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowFilters(!showFilters)} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border ${
                    showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}>
                    <Filter className="w-4 h-4" /> Filtros
                  </button>
                  <button onClick={() => setShowUploadPrenda(!showUploadPrenda)} className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200">
                    <Plus className="w-4 h-4" /> Añadir Prenda
                  </button>
                </div>
              </div>

              {showFilters && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block">Categoría</label>
                    <select className="w-full border-gray-200 rounded-lg text-sm p-2 outline-none focus:ring-2 focus:ring-indigo-100" value={filters.id_categoria} onChange={e => setFilters({...filters, id_categoria: e.target.value})}>
                      <option value="">Todas</option>
                      {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block">Temporada</label>
                    <select className="w-full border-gray-200 rounded-lg text-sm p-2 outline-none focus:ring-2 focus:ring-indigo-100" value={filters.temporada} onChange={e => setFilters({...filters, temporada: e.target.value})}>
                      <option value="">Todas</option>
                      {uniqueTemporadas.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block">Estilo</label>
                    <select className="w-full border-gray-200 rounded-lg text-sm p-2 outline-none focus:ring-2 focus:ring-indigo-100" value={filters.estilo} onChange={e => setFilters({...filters, estilo: e.target.value})}>
                      <option value="">Todos</option>
                      {uniqueEstilos.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block">Color</label>
                    <input type="text" placeholder="Ej: azul" className="w-full border-gray-200 rounded-lg text-sm p-2 outline-none focus:ring-2 focus:ring-indigo-100" value={filters.color_principal} onChange={e => setFilters({...filters, color_principal: e.target.value})} />
                  </div>
                </div>
              )}

              {showUploadPrenda && (
                <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 p-8 animate-fade-in relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                  <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg"><Upload className="w-5 h-5 text-indigo-600" /></div>
                    Nueva Prenda
                  </h3>
                  <form onSubmit={handleUploadPrenda} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Nombre de la prenda</label>
                        <input type="text" name="nombre" required className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50" placeholder="Ej: Americana azul marino" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1.5">Categoría</label>
                          {categorias.length > 0 ? (
                            <select name="id_categoria" required className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-gray-50 outline-none" value={selectedCategoria} onChange={(e) => setSelectedCategoria(e.target.value)}>
                              {categorias.map(cat => <option key={cat.id_categoria} value={cat.id_categoria}>{cat.nombre}</option>)}
                            </select>
                          ) : (
                             <input type="number" name="id_categoria" defaultValue={1} min={1} required className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50" />
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1.5">Talla</label>
                          <input type="text" name="talla" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-gray-50 outline-none" placeholder="Ej: L" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Marca</label>
                        <input type="text" name="marca" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-gray-50 outline-none" placeholder="Ej: Massimo Dutti" />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Fotografía</label>
                      <div className="flex-1 w-full border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group overflow-hidden relative" onClick={() => fileInputRef.current?.click()}>
                        {uploadPreview ? (
                          <>
                            <img src={uploadPreview} alt="Preview" className={`w-full h-full object-cover transition-opacity ${uploading ? 'opacity-40' : ''}`} />
                            {uploading && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-10 h-10 text-indigo-600 animate-spin" /></div>}
                          </>
                        ) : (
                          <div className="text-center p-8">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                              <Upload className="w-6 h-6 text-gray-400 group-hover:text-indigo-600" />
                            </div>
                            <span className="text-sm font-bold text-gray-600">Subir imagen</span>
                            <p className="text-xs text-gray-400 mt-1">PNG, JPG hasta 10MB</p>
                          </div>
                        )}
                        <input type="file" name="imagen" accept="image/*" required ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                      </div>
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-3 mt-2 border-t pt-6">
                      <button type="button" onClick={() => {setShowUploadPrenda(false); setUploadPreview(null);}} className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
                        Cancelar
                      </button>
                      <button type="submit" disabled={uploading} className="px-8 py-2.5 text-sm font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-70">
                        {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analizando Prenda...</> : 'Guardar Prenda'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ── Mis Looks ── */}
              {looks.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500" /> Mis Looks Generados
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {looks.map(look => {
                      const img = lookImages[look.id_look];
                      const isGenerating = look.estado === 'generando' || look.estado === 'pendiente';
                      const isError = look.estado === 'error';
                      const isClickable = !!img;
                      return (
                        <div
                          key={look.id_look}
                          className={`border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group ${isClickable ? 'cursor-pointer' : ''}`}
                          onClick={() => isClickable && setSelectedLook(look)}
                        >
                          <div className="relative bg-gray-50 h-48 flex items-center justify-center">
                            {img ? (
                              <>
                                <img src={img} alt={look.nombre} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                </div>
                              </>
                            ) : isGenerating ? (
                              <div className="flex flex-col items-center gap-2 text-purple-600">
                                <Loader2 className="w-8 h-8 animate-spin" />
                                <span className="text-xs font-medium">Generando...</span>
                              </div>
                            ) : isError ? (
                              <div className="flex flex-col items-center gap-2 text-red-400">
                                <AlertTriangle className="w-8 h-8" />
                                <span className="text-xs font-medium">Error al generar</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2 text-gray-300">
                                <ImageIcon className="w-8 h-8" />
                                <span className="text-xs text-gray-400">Sin imagen</span>
                              </div>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteLook(look.id_look); }}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-white/90 rounded-full text-gray-400 hover:text-red-500 transition-all shadow-sm z-10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-bold text-sm text-gray-800 truncate">{look.nombre}</p>
                              <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                look.estado === 'listo' ? 'bg-green-100 text-green-700' :
                                isGenerating ? 'bg-purple-100 text-purple-700' :
                                isError ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {look.estado === 'listo' ? 'Listo' : isGenerating ? 'Generando' : isError ? 'Error' : look.estado}
                              </span>
                            </div>
                            {look.descripcion && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{look.descripcion}</p>}
                            {isError && look.error_mensaje && <p className="text-xs text-red-400 mt-1 line-clamp-2">{look.error_mensaje}</p>}
                            {isClickable && <p className="text-xs text-indigo-500 mt-1 font-medium">Haz clic para ver en detalle</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {loadingPrendas ? (
                <div className="py-24 flex flex-col items-center gap-4">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                  <p className="text-sm font-medium text-gray-500">Cargando tu armario...</p>
                </div>
              ) : prendasFiltradas.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-20 text-center text-gray-500 shadow-sm">
                  <Folder className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <p className="font-black text-gray-900 text-lg">No hay prendas aquí</p>
                  <p className="text-sm mt-1 max-w-xs mx-auto">Empieza a llenar tu armario digital subiendo fotos de tu ropa favorita.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {prendasFiltradas.map(prenda => (
                    <PrendaCard 
                      key={prenda.id_prenda} 
                      prenda={prenda} 
                      onDelete={() => handleDeletePrenda(prenda.id_prenda)} 
                      onUpdate={(updated) => setPrendas(prendas.map(p => p.id_prenda === updated.id_prenda ? updated : p))}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal Look Detalle */}
      {selectedLook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedLook(null)}>
          <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm" />
          <div
            className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-black text-gray-900">{selectedLook.nombre}</h2>
                {selectedLook.ocasion && <p className="text-sm text-gray-400 mt-0.5">Ocasión: <span className="font-medium text-gray-600">{selectedLook.ocasion}</span></p>}
              </div>
              <button onClick={() => setSelectedLook(null)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Imagen */}
            <div className="bg-gray-50 flex items-center justify-center">
              <img
                src={lookImages[selectedLook.id_look]}
                alt={selectedLook.nombre}
                className="max-h-[60vh] w-auto object-contain"
              />
            </div>

            {/* Detalles */}
            <div className="p-5 space-y-4">
              {selectedLook.descripcion && (
                <p className="text-gray-600 text-sm leading-relaxed">{selectedLook.descripcion}</p>
              )}

              {/* Prendas usadas */}
              {selectedLook.prendas?.length > 0 && (
                <div>
                  <h3 className="text-sm font-black text-gray-800 mb-2 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-indigo-500" /> Prendas usadas en este look
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedLook.prendas.map(lp => {
                      const prenda = prendas.find(p => p.id_prenda === lp.id_prenda);
                      return prenda ? (
                        <span key={lp.id_prenda} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full font-medium">
                          {prenda.nombre}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Eliminar Armario */}
      {armarioToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setArmarioToDelete(null)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-scale-in">
            <div className="p-1 bg-red-600"></div>
            <div className="p-8">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">¿Eliminar "{armarioToDelete.nombre}"?</h3>
              <p className="text-gray-500 text-center text-sm mb-8 leading-relaxed">
                Esta acción eliminará el armario y todas las prendas guardadas en él. <span className="font-bold">No se puede deshacer.</span>
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmDeleteArmario}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md"
                >
                  Sí, eliminar todo
                </button>
                <button 
                  onClick={() => setArmarioToDelete(null)}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
            <button 
              onClick={() => setArmarioToDelete(null)}
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
