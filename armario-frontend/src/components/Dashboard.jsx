import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useToast } from './Toast';
import OutfitGenerator from './OutfitGenerator';
import PrendaCard from './PrendaCard';
import {
  LogOut, Plus, Upload, Folder, Search, Loader2,
  User, Crown, Trash2, X, Menu, Sparkles,
  ImageIcon, AlertTriangle, ZoomIn, Tag, Filter,
  ChevronDown, Check
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

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Armario form
  const [newArmarioName, setNewArmarioName] = useState('');
  const [newArmarioDesc, setNewArmarioDesc] = useState('');
  const [showCreateArmario, setShowCreateArmario] = useState(false);
  const [armarioToDelete, setArmarioToDelete] = useState(null);

  // Upload prenda
  const [showUploadPrenda, setShowUploadPrenda] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const fileInputRef = useRef(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ temporada: '', id_categoria: '', estilo: '', color_principal: '' });

  // Looks
  const [looks, setLooks] = useState([]);
  const [lookImages, setLookImages] = useState({});
  const [selectedLook, setSelectedLook] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const fetchLooks = useCallback(async () => {
    try {
      const data = await api.getLooks();
      setLooks(data);
      data.filter(l => l.estado === 'listo' && l.imagen_generada_url).forEach(async (look) => {
        try {
          const res = await api.getOutfitImageUrl(look.id_look);
          if (res?.url) setLookImages(prev => ({ ...prev, [look.id_look]: res.url }));
        } catch (_) {}
      });
    } catch (_) {}
  }, []);

  useEffect(() => { fetchInitialData(); }, []);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get('mock')) {
      api.updateAuthMe({ tipo_usuario: 'premium' })
        .then(() => api.getAuthMe())
        .then(u => { setUser(u); addToast('¡Suscripción Premium confirmada!', 'success'); navigate('/dashboard', { replace: true }); })
        .catch(() => addToast('Problema verificando el pago', 'error'));
    }
  }, [location.search]);

  useEffect(() => {
    if (selectedArmario) fetchPrendas(selectedArmario.id_armario);
    else setPrendas([]);
  }, [selectedArmario]);

  const fetchInitialData = async () => {
    try {
      const [userData, armariosData, catsData] = await Promise.all([
        api.getAuthMe(), api.getArmarios(), api.getCategorias().catch(() => []),
      ]);
      setUser(userData);
      setArmarios(armariosData);
      setCategorias(catsData);
      if (catsData.length > 0) setSelectedCategoria(catsData[0].id_categoria);
      if (armariosData.length > 0) setSelectedArmario(armariosData[0]);
      fetchLooks();
      if (userData.foto_perfil_url) {
        const p = await api.getFotoPerfilUrl();
        if (p) setFotoPerfilUrl(p.url);
      } else if (userData.avatar_url) {
        const a = await api.getAvatarUrl();
        if (a) setFotoPerfilUrl(a.url);
      }
    } catch (err) {
      if (err.message?.includes('401') || err.message === 'Unauthorized') logout();
    } finally {
      setLoading(false);
    }
  };

  const fetchPrendas = async (id) => {
    setLoadingPrendas(true);
    try { setPrendas(await api.getPrendas(id)); }
    catch (_) {}
    finally { setLoadingPrendas(false); }
  };

  const handleCreateArmario = async (e) => {
    e.preventDefault();
    try {
      const a = await api.createArmario({ nombre: newArmarioName, descripcion: newArmarioDesc });
      setArmarios([...armarios, a]);
      setSelectedArmario(a);
      setNewArmarioName(''); setNewArmarioDesc('');
      setShowCreateArmario(false);
      addToast('Armario creado', 'success');
    } catch (err) { addToast(err.message || 'Error al crear armario', 'error'); }
  };

  const confirmDeleteArmario = async () => {
    if (!armarioToDelete) return;
    try {
      await api.deleteArmario(armarioToDelete.id_armario);
      setArmarios(armarios.filter(a => a.id_armario !== armarioToDelete.id_armario));
      if (selectedArmario?.id_armario === armarioToDelete.id_armario) setSelectedArmario(null);
      addToast('Armario eliminado', 'success');
    } catch (_) { addToast('Error al eliminar', 'error'); }
    finally { setArmarioToDelete(null); }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setUploadPreview(f ? URL.createObjectURL(f) : null);
  };

  const handleUploadPrenda = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.append('id_armario', selectedArmario.id_armario);
    if (!formData.get('id_categoria')) formData.append('id_categoria', selectedCategoria || 1);
    setUploading(true);
    try {
      await api.uploadPrenda(formData);
      await fetchPrendas(selectedArmario.id_armario);
      setShowUploadPrenda(false);
      setUploadPreview(null);
      e.target.reset();
      addToast('Prenda añadida. IA analizando…', 'success');
    } catch (err) { addToast(err.message || 'Error al subir prenda', 'error'); }
    finally { setUploading(false); }
  };

  const handleDeletePrenda = async (id) => {
    if (!window.confirm('¿Eliminar esta prenda?')) return;
    try {
      await api.deletePrenda(id);
      setPrendas(prendas.filter(p => p.id_prenda !== id));
      addToast('Prenda eliminada', 'success');
    } catch (_) { addToast('Error al eliminar prenda', 'error'); }
  };

  const handleDeleteLook = async (id) => {
    if (!window.confirm('¿Eliminar este look?')) return;
    try {
      await api.deleteLook(id);
      setLooks(looks.filter(l => l.id_look !== id));
      setLookImages(prev => { const n = { ...prev }; delete n[id]; return n; });
      addToast('Look eliminado', 'success');
    } catch (_) { addToast('Error al eliminar look', 'error'); }
  };

  const logout = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  const prendasFiltradas = useMemo(() => prendas.filter(p => {
    if (filters.temporada && p.temporada !== filters.temporada) return false;
    if (filters.id_categoria && p.id_categoria.toString() !== filters.id_categoria) return false;
    if (filters.estilo && p.estilo && !p.estilo.toLowerCase().includes(filters.estilo.toLowerCase())) return false;
    if (filters.color_principal && p.color_principal && !p.color_principal.toLowerCase().includes(filters.color_principal.toLowerCase())) return false;
    return true;
  }), [prendas, filters]);

  const uniqueTemporadas = [...new Set(prendas.map(p => p.temporada).filter(Boolean))];
  const uniqueEstilos = [...new Set(prendas.map(p => p.estilo).filter(Boolean))];
  const isPremium = user?.tipo_usuario === 'premium';

  if (loading) {
    return (
      <div className="min-h-screen bg-rose-light flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl gradient-rose flex items-center justify-center shadow-burgundy animate-pulse">
            <span className="text-white text-xl">✦</span>
          </div>
          <p className="font-playfair text-plum/60 text-lg">Cargando tu armario…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rose-light font-inter">

      {/* ── HEADER ── */}
      <header className="fixed top-0 inset-x-0 z-30 bg-white/90 backdrop-blur-md border-b border-rose-soft/60 h-16">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between gap-4">
          {/* Hamburger + Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-xl hover:bg-rose-light text-plum transition-colors"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl gradient-rose flex items-center justify-center shadow-burgundy">
                <span className="text-white text-sm">✦</span>
              </div>
              <span className="font-playfair text-lg font-semibold text-plum hidden sm:block">Armario Digital</span>
            </div>
          </div>

          {/* Armario activo */}
          {selectedArmario && (
            <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-rose-light rounded-full border border-rose-soft">
              <Folder className="w-4 h-4 text-burgundy" />
              <span className="text-sm font-medium text-plum">{selectedArmario.nombre}</span>
              <span className="text-xs text-plum/40">· {prendas.length} prendas</span>
            </div>
          )}

          {/* Right */}
          <div className="flex items-center gap-2">
            {isPremium ? (
              <Link to="/premium" className="hidden sm:flex items-center gap-1.5 bg-rose-soft text-burgundy text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide hover:bg-rose-mid hover:text-white transition-all">
                <Crown className="w-3 h-3" /> Premium
              </Link>
            ) : (
              <Link to="/premium" className="hidden sm:block text-xs font-semibold text-burgundy hover:text-burgundy-dark bg-rose-light border border-rose-soft px-3 py-1.5 rounded-full transition-all">
                Mejorar plan
              </Link>
            )}
            <Link to="/profile" className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-rose-light transition-colors">
              <div className="w-8 h-8 rounded-full bg-rose-soft overflow-hidden border-2 border-rose-soft flex items-center justify-center">
                {fotoPerfilUrl
                  ? <img src={fotoPerfilUrl} alt="avatar" className="w-full h-full object-cover" />
                  : <User className="w-4 h-4 text-burgundy" />
                }
              </div>
              <span className="hidden sm:block text-sm font-medium text-plum">{user?.nombre}</span>
            </Link>
            <button onClick={logout} className="p-2 text-plum/40 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Salir">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── DRAWER OVERLAY ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-plum/30 backdrop-blur-sm animate-fade-in" onClick={() => setDrawerOpen(false)} />
      )}

      {/* ── DRAWER ── */}
      <aside className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] z-50 bg-white shadow-rose-lg flex flex-col transition-transform duration-300 ease-out ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-rose-soft/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl gradient-rose flex items-center justify-center shadow-burgundy">
              <span className="text-white text-sm">✦</span>
            </div>
            <span className="font-playfair text-lg font-semibold text-plum">Armario Digital</span>
          </div>
          <button onClick={() => setDrawerOpen(false)} className="p-2 text-plum/30 hover:text-plum hover:bg-rose-light rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Mis Armarios */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-playfair text-base font-semibold text-plum">Mis Armarios</h2>
              <button
                onClick={() => setShowCreateArmario(v => !v)}
                className="p-1.5 bg-rose-light hover:bg-rose-soft text-burgundy rounded-xl transition-colors"
                title="Nuevo armario"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {showCreateArmario && (
              <form onSubmit={handleCreateArmario} className="mb-3 p-3 bg-rose-light rounded-2xl border border-rose-soft space-y-2 animate-fade-in">
                <input type="text" placeholder="Nombre del armario" required className="input-field text-sm py-2" value={newArmarioName} onChange={e => setNewArmarioName(e.target.value)} />
                <input type="text" placeholder="Descripción (opcional)" className="input-field text-sm py-2" value={newArmarioDesc} onChange={e => setNewArmarioDesc(e.target.value)} />
                <button type="submit" className="btn-primary w-full py-2 text-sm">Guardar armario</button>
              </form>
            )}

            <div className="space-y-1">
              {armarios.length === 0 ? (
                <p className="text-center text-sm text-plum/40 py-6 border-2 border-dashed border-rose-soft rounded-2xl">Sin armarios aún</p>
              ) : armarios.map(arm => (
                <div
                  key={arm.id_armario}
                  onClick={() => { setSelectedArmario(arm); setDrawerOpen(false); }}
                  className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-200 ${
                    selectedArmario?.id_armario === arm.id_armario
                      ? 'bg-burgundy text-white shadow-burgundy'
                      : 'bg-rose-light/60 hover:bg-rose-soft/40 text-plum border border-rose-soft/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Folder className={`w-4 h-4 shrink-0 ${selectedArmario?.id_armario === arm.id_armario ? 'text-rose-soft' : 'text-burgundy/50'}`} />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{arm.nombre}</p>
                      {arm.descripcion && <p className={`text-xs truncate ${selectedArmario?.id_armario === arm.id_armario ? 'text-rose-soft/70' : 'text-plum/40'}`}>{arm.descripcion}</p>}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setArmarioToDelete(arm); }}
                    className={`p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                      selectedArmario?.id_armario === arm.id_armario ? 'hover:bg-white/20 text-rose-soft' : 'hover:bg-red-50 text-plum/30 hover:text-red-400'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Outfit Generator en drawer */}
          {selectedArmario && isPremium && (
            <section>
              <OutfitGenerator
                idArmario={selectedArmario.id_armario}
                prendas={prendas}
                hasFotoCuerpo={!!user?.foto_cuerpo_url}
                isPremium={isPremium}
                onLookGenerated={fetchLooks}
              />
            </section>
          )}

          {selectedArmario && !isPremium && (
            <section className="card p-5 text-center">
              <div className="w-10 h-10 gradient-rose rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-burgundy">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-playfair font-semibold text-plum mb-1">IA Stylist</h3>
              <p className="text-xs text-plum/50 mb-4">Genera outfits y pruébatelos virtualmente con IA.</p>
              <Link to="/premium" onClick={() => setDrawerOpen(false)} className="btn-primary w-full py-2 text-sm">
                Ver planes
              </Link>
            </section>
          )}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {!selectedArmario ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
              <div className="w-20 h-20 gradient-rose rounded-3xl flex items-center justify-center shadow-burgundy mb-6">
                <span className="text-white text-3xl">✦</span>
              </div>
              <h2 className="font-playfair text-3xl font-semibold text-plum mb-2">Bienvenida, {user?.nombre}</h2>
              <p className="text-plum/50 mb-6">Abre el menú para seleccionar o crear un armario</p>
              <button onClick={() => setDrawerOpen(true)} className="btn-primary">
                <Menu className="w-4 h-4" /> Abrir menú
              </button>
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">

              {/* Header del armario */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-playfair text-3xl md:text-4xl font-semibold text-plum">{selectedArmario.nombre}</h1>
                  <p className="text-plum/50 text-sm mt-1">
                    {selectedArmario.descripcion && <>{selectedArmario.descripcion} · </>}
                    <span className="text-burgundy font-medium">{prendas.length} prendas</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFilters(v => !v)}
                    className={`btn-secondary py-2.5 px-4 text-sm ${showFilters ? 'border-burgundy text-burgundy' : ''}`}
                  >
                    <Filter className="w-4 h-4" /> Filtros
                  </button>
                  <button onClick={() => setShowUploadPrenda(true)} className="btn-primary py-2.5 px-4 text-sm">
                    <Plus className="w-4 h-4" /> Añadir prenda
                  </button>
                </div>
              </div>

              {/* Filtros */}
              {showFilters && (
                <div className="card p-5 animate-slide-up">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="label-field">Categoría</label>
                      <select className="input-field text-sm py-2" value={filters.id_categoria} onChange={e => setFilters({ ...filters, id_categoria: e.target.value })}>
                        <option value="">Todas</option>
                        {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label-field">Temporada</label>
                      <select className="input-field text-sm py-2" value={filters.temporada} onChange={e => setFilters({ ...filters, temporada: e.target.value })}>
                        <option value="">Todas</option>
                        {uniqueTemporadas.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label-field">Estilo</label>
                      <select className="input-field text-sm py-2" value={filters.estilo} onChange={e => setFilters({ ...filters, estilo: e.target.value })}>
                        <option value="">Todos</option>
                        {uniqueEstilos.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label-field">Color</label>
                      <input type="text" placeholder="Ej: negro" className="input-field text-sm py-2" value={filters.color_principal} onChange={e => setFilters({ ...filters, color_principal: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              {/* Upload prenda modal */}
              {showUploadPrenda && (
                <div className="fixed inset-0 bg-plum/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                  <div className="bg-white rounded-3xl shadow-rose-lg w-full max-w-2xl animate-scale-in overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-rose-soft/50">
                      <h3 className="font-playfair text-xl font-semibold text-plum flex items-center gap-2">
                        <Upload className="w-5 h-5 text-burgundy" /> Nueva prenda
                      </h3>
                      <button onClick={() => { setShowUploadPrenda(false); setUploadPreview(null); }} className="p-2 text-plum/30 hover:text-plum hover:bg-rose-light rounded-xl transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <form onSubmit={handleUploadPrenda} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="label-field">Nombre de la prenda</label>
                          <input type="text" name="nombre" required className="input-field" placeholder="Ej: Sudadera crema Fake Gods" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="label-field">Categoría</label>
                            {categorias.length > 0 ? (
                              <select name="id_categoria" required className="input-field text-sm py-2.5" value={selectedCategoria} onChange={e => setSelectedCategoria(e.target.value)}>
                                {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
                              </select>
                            ) : (
                              <input type="number" name="id_categoria" defaultValue={1} min={1} required className="input-field" />
                            )}
                          </div>
                          <div>
                            <label className="label-field">Talla</label>
                            <input type="text" name="talla" className="input-field" placeholder="Ej: M" />
                          </div>
                        </div>
                        <div>
                          <label className="label-field">Marca</label>
                          <input type="text" name="marca" className="input-field" placeholder="Ej: Zara" />
                        </div>
                      </div>

                      <div>
                        <label className="label-field">Fotografía</label>
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="h-52 border-2 border-dashed border-rose-soft rounded-2xl flex items-center justify-center cursor-pointer hover:border-rose-mid hover:bg-rose-light/50 transition-all overflow-hidden relative group"
                        >
                          {uploadPreview ? (
                            <>
                              <img src={uploadPreview} alt="preview" className={`w-full h-full object-cover ${uploading ? 'opacity-50' : ''}`} />
                              {uploading && <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm"><Loader2 className="w-8 h-8 text-burgundy animate-spin" /></div>}
                            </>
                          ) : (
                            <div className="text-center p-6">
                              <Upload className="w-8 h-8 text-rose-mid mx-auto mb-2 group-hover:scale-110 transition-transform" />
                              <p className="text-sm font-medium text-plum/60">Subir imagen</p>
                              <p className="text-xs text-plum/30 mt-1">PNG, JPG hasta 10MB</p>
                            </div>
                          )}
                          <input type="file" name="imagen" accept="image/*" required ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                        </div>
                      </div>

                      <div className="md:col-span-2 flex justify-end gap-3 border-t border-rose-soft/50 pt-4">
                        <button type="button" onClick={() => { setShowUploadPrenda(false); setUploadPreview(null); }} className="btn-ghost">Cancelar</button>
                        <button type="submit" disabled={uploading} className="btn-primary">
                          {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analizando…</> : <><Plus className="w-4 h-4" /> Guardar prenda</>}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Mis Looks */}
              {looks.length > 0 && (
                <section>
                  <h2 className="section-title mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-burgundy" /> Mis Looks
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {looks.map(look => {
                      const img = lookImages[look.id_look];
                      const isGenerating = ['generando','pendiente'].includes(look.estado);
                      const isError = look.estado === 'error';
                      return (
                        <div
                          key={look.id_look}
                          onClick={() => img && setSelectedLook(look)}
                          className={`bg-white rounded-3xl shadow-card border border-rose-soft/60 overflow-hidden group transition-all duration-300 ${img ? 'hover:shadow-rose-lg hover:-translate-y-1 cursor-pointer' : ''}`}
                        >
                          <div className="relative aspect-[3/4] bg-rose-light flex items-center justify-center overflow-hidden">
                            {img ? (
                              <>
                                <img src={img} alt={look.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-plum/0 group-hover:bg-plum/20 transition-all flex items-center justify-center">
                                  <ZoomIn className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                </div>
                              </>
                            ) : isGenerating ? (
                              <div className="flex flex-col items-center gap-2 text-burgundy/50">
                                <Loader2 className="w-7 h-7 animate-spin" />
                                <span className="text-xs">Generando…</span>
                              </div>
                            ) : isError ? (
                              <div className="flex flex-col items-center gap-2 text-red-300">
                                <AlertTriangle className="w-7 h-7" />
                                <span className="text-xs text-red-400">Error</span>
                              </div>
                            ) : (
                              <ImageIcon className="w-8 h-8 text-rose-soft" />
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); handleDeleteLook(look.id_look); }}
                              className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-xl text-plum/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="p-3">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <p className="font-semibold text-sm text-plum truncate">{look.nombre}</p>
                              <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                look.estado === 'listo' ? 'bg-emerald-50 text-emerald-600' :
                                isGenerating ? 'bg-lavender-soft text-lavender' :
                                'bg-red-50 text-red-400'
                              }`}>
                                {look.estado === 'listo' ? 'Listo' : isGenerating ? 'Generando' : 'Error'}
                              </span>
                            </div>
                            {look.descripcion && <p className="text-xs text-plum/40 line-clamp-2 leading-relaxed">{look.descripcion}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Prendas */}
              <section>
                <h2 className="section-title mb-4">Mis Prendas</h2>
                {loadingPrendas ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-white rounded-3xl shadow-card border border-rose-soft/60 overflow-hidden">
                        <div className="aspect-[3/4] bg-rose-soft/20 animate-pulse" />
                        <div className="p-4 space-y-2">
                          <div className="h-3 bg-rose-soft/30 rounded-full animate-pulse w-3/4" />
                          <div className="h-2 bg-rose-soft/20 rounded-full animate-pulse w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : prendasFiltradas.length === 0 ? (
                  <div className="card p-16 text-center">
                    <div className="w-16 h-16 gradient-rose rounded-3xl flex items-center justify-center mx-auto mb-4 opacity-40">
                      <Folder className="w-8 h-8 text-white" />
                    </div>
                    <p className="font-playfair text-xl text-plum/60 mb-2">Armario vacío</p>
                    <p className="text-sm text-plum/40 mb-6">Empieza añadiendo tus primeras prendas</p>
                    <button onClick={() => setShowUploadPrenda(true)} className="btn-primary mx-auto">
                      <Plus className="w-4 h-4" /> Añadir primera prenda
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {prendasFiltradas.map(p => (
                      <PrendaCard key={p.id_prenda} prenda={p} onDelete={() => handleDeletePrenda(p.id_prenda)} onUpdate={u => setPrendas(prendas.map(x => x.id_prenda === u.id_prenda ? u : x))} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL LOOK DETALLE ── */}
      {selectedLook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedLook(null)}>
          <div className="absolute inset-0 bg-plum/50 backdrop-blur-sm" />
          <div className="relative z-10 bg-white rounded-3xl shadow-rose-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-rose-soft/50">
              <div>
                <h2 className="font-playfair text-xl font-semibold text-plum">{selectedLook.nombre}</h2>
                {selectedLook.ocasion && <p className="text-sm text-plum/40 mt-0.5">Ocasión: <span className="text-burgundy font-medium">{selectedLook.ocasion}</span></p>}
              </div>
              <button onClick={() => setSelectedLook(null)} className="p-2 text-plum/30 hover:text-plum hover:bg-rose-light rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-rose-light flex justify-center">
              <img src={lookImages[selectedLook.id_look]} alt={selectedLook.nombre} className="max-h-[55vh] w-auto object-contain" />
            </div>
            <div className="p-5 space-y-4">
              {selectedLook.descripcion && <p className="text-plum/60 text-sm leading-relaxed">{selectedLook.descripcion}</p>}
              {selectedLook.prendas?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-plum mb-2 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-burgundy" /> Prendas del look
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedLook.prendas.map(lp => {
                      const p = prendas.find(x => x.id_prenda === lp.id_prenda);
                      return p ? <span key={lp.id_prenda} className="badge">{p.nombre}</span> : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ELIMINAR ARMARIO ── */}
      {armarioToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-plum/40 backdrop-blur-sm" onClick={() => setArmarioToDelete(null)} />
          <div className="bg-white rounded-3xl shadow-rose-lg w-full max-w-sm relative z-10 p-7 animate-scale-in text-center">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="font-playfair text-xl font-semibold text-plum mb-2">¿Eliminar armario?</h3>
            <p className="text-sm text-plum/50 mb-6">Se eliminará <strong>"{armarioToDelete.nombre}"</strong> y todas sus prendas. Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setArmarioToDelete(null)} className="btn-secondary flex-1 py-2.5 text-sm">Cancelar</button>
              <button onClick={confirmDeleteArmario} className="flex-1 py-2.5 text-sm bg-red-500 hover:bg-red-600 text-white font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-sm">
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
