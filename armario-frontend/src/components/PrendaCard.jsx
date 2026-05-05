import { useState, useEffect } from 'react';
import { api } from '../api';
import { Loader2, Shirt, Trash2, Edit, X, Save } from 'lucide-react';
import { useToast } from './Toast';

export default function PrendaCard({ prenda, onDelete, onUpdate }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    nombre: prenda.nombre || '',
    talla: prenda.talla || '',
    marca: prenda.marca || '',
    temporada: prenda.temporada || '',
    estilo: prenda.estilo || '',
    color_principal: prenda.color_principal || '',
  });
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    let mounted = true;
    api.getPrendaImageUrl(prenda.id_prenda)
      .then(d => { if (mounted) setImageUrl(d.url); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [prenda.id_prenda]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updatePrenda(prenda.id_prenda, editForm);
      onUpdate?.(updated);
      setIsEditing(false);
      addToast('Prenda actualizada', 'success');
    } catch {
      addToast('Error al actualizar prenda', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div 
        onClick={() => setShowDetails(true)}
        className="bg-white rounded-3xl shadow-card border border-rose-soft/60 overflow-hidden group hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 relative cursor-pointer"
      >
        {/* Acciones hover */}
        <div className="absolute top-3 right-3 flex gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <button
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            className="p-2 bg-white/95 backdrop-blur-sm text-burgundy rounded-xl shadow-rose hover:bg-rose-light transition-colors"
            title="Editar"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 bg-white/95 backdrop-blur-sm text-red-400 rounded-xl shadow-rose hover:bg-red-50 transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Imagen */}
        <div className="aspect-[3/4] bg-rose-light flex items-center justify-center overflow-hidden">
          {loading ? (
            <div className="w-full h-full bg-rose-soft/30 animate-pulse" />
          ) : imageUrl ? (
            <img src={imageUrl} alt={prenda.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-rose-soft">
              <Shirt className="w-10 h-10" />
              <span className="text-xs text-plum/30">Sin imagen</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h4 className="font-semibold text-plum text-sm line-clamp-1 mb-2">{prenda.nombre}</h4>
          <div className="flex flex-wrap gap-1 mb-2">
            {prenda.marca && <span className="badge">{prenda.marca}</span>}
            {prenda.temporada && <span className="badge-lavender">{prenda.temporada}</span>}
            {prenda.color_principal && (
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-rose-light text-plum/60 capitalize">{prenda.color_principal}</span>
            )}
          </div>
          <p className="text-xs text-plum/40 line-clamp-2 leading-relaxed">
            {prenda.descripcion_ia || 'Analizando con IA…'}
          </p>
        </div>
      </div>

      {/* Modal detalles */}
      {showDetails && (
        <div className="fixed inset-0 bg-plum/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowDetails(false)}>
          <div className="bg-white rounded-3xl shadow-rose-lg w-full max-w-lg animate-scale-in overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-rose-soft/50">
              <h3 className="font-playfair text-xl font-semibold text-plum">Detalles de la prenda</h3>
              <button onClick={() => setShowDetails(false)} className="p-2 text-plum/30 hover:text-plum hover:bg-rose-light rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-rose-light">
                {imageUrl ? (
                  <img src={imageUrl} alt={prenda.nombre} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-rose-soft">
                    <Shirt className="w-16 h-16" />
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-plum/50 uppercase tracking-wider mb-1">Nombre</h4>
                  <p className="text-lg font-medium text-plum">{prenda.nombre}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {prenda.marca && (
                    <div>
                      <h4 className="text-sm font-semibold text-plum/50 uppercase tracking-wider mb-1">Marca</h4>
                      <p className="text-plum">{prenda.marca}</p>
                    </div>
                  )}
                  {prenda.talla && (
                    <div>
                      <h4 className="text-sm font-semibold text-plum/50 uppercase tracking-wider mb-1">Talla</h4>
                      <p className="text-plum">{prenda.talla}</p>
                    </div>
                  )}
                  {prenda.temporada && (
                    <div>
                      <h4 className="text-sm font-semibold text-plum/50 uppercase tracking-wider mb-1">Temporada</h4>
                      <p className="text-plum capitalize">{prenda.temporada}</p>
                    </div>
                  )}
                  {prenda.color_principal && (
                    <div>
                      <h4 className="text-sm font-semibold text-plum/50 uppercase tracking-wider mb-1">Color</h4>
                      <p className="text-plum capitalize">{prenda.color_principal}</p>
                    </div>
                  )}
                </div>
                {prenda.estilo && (
                  <div>
                    <h4 className="text-sm font-semibold text-plum/50 uppercase tracking-wider mb-1">Estilo</h4>
                    <p className="text-plum">{prenda.estilo}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-plum/50 uppercase tracking-wider mb-1">Descripción IA</h4>
                  <p className="text-sm text-plum/70 leading-relaxed italic">
                    "{prenda.descripcion_ia || 'Esta prenda aún no ha sido analizada.'}"
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-rose-light/30 flex justify-end">
              <button onClick={() => setShowDetails(false)} className="btn-primary">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {isEditing && (
        <div className="fixed inset-0 bg-plum/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-rose-lg w-full max-w-md animate-scale-in overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-rose-soft/50">
              <h3 className="font-playfair text-xl font-semibold text-plum">Editar prenda</h3>
              <button onClick={() => setIsEditing(false)} className="p-2 text-plum/30 hover:text-plum hover:bg-rose-light rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="label-field">Nombre</label>
                <input type="text" className="input-field" value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[['talla','Talla'],['marca','Marca'],['temporada','Temporada'],['color_principal','Color']].map(([key, label]) => (
                  <div key={key}>
                    <label className="label-field">{label}</label>
                    <input type="text" className="input-field" value={editForm[key]} onChange={e => setEditForm({ ...editForm, [key]: e.target.value })} />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="label-field">Estilo</label>
                  <input type="text" className="input-field" value={editForm.estilo} onChange={e => setEditForm({ ...editForm, estilo: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsEditing(false)} className="btn-ghost">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando</> : <><Save className="w-4 h-4" /> Guardar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
