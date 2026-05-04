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
    color_principal: prenda.color_principal || ''
  });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    let isMounted = true;
    const fetchImage = async () => {
      try {
        const data = await api.getPrendaImageUrl(prenda.id_prenda);
        if (isMounted) setImageUrl(data.url);
      } catch (err) {
        console.error('Failed to load image for prenda', prenda.id_prenda);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchImage();
    return () => { isMounted = false; };
  }, [prenda.id_prenda]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedPrenda = await api.updatePrenda(prenda.id_prenda, editForm);
      if (onUpdate) onUpdate(updatedPrenda);
      setIsEditing(false);
      addToast('Prenda actualizada', 'success');
    } catch (err) {
      addToast('Error al actualizar prenda', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow relative">
        <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => setIsEditing(true)} 
            className="p-1.5 bg-white/90 text-indigo-600 rounded-md hover:bg-indigo-50 shadow-sm transition-colors"
            title="Editar prenda"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={onDelete} 
            className="p-1.5 bg-white/90 text-red-500 rounded-md hover:bg-red-50 shadow-sm transition-colors"
            title="Eliminar prenda"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="aspect-[3/4] w-full relative bg-gray-50 flex items-center justify-center overflow-hidden">
          {loading ? (
            <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
          ) : imageUrl ? (
            <img 
              src={imageUrl} 
              alt={prenda.nombre} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <Shirt className="w-12 h-12 text-gray-300" />
          )}
        </div>
        <div className="p-4">
          <h4 className="font-semibold text-gray-800 line-clamp-1" title={prenda.nombre}>{prenda.nombre}</h4>
          <div className="flex flex-wrap gap-1 mt-1 mb-2">
            {prenda.talla && <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase">{prenda.talla}</span>}
            {prenda.marca && <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded capitalize">{prenda.marca}</span>}
            {prenda.temporada && <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded capitalize">{prenda.temporada}</span>}
            {prenda.color_principal && <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded capitalize">{prenda.color_principal}</span>}
          </div>
          <p className="text-xs text-gray-500 line-clamp-2" title={prenda.descripcion_ia}>
            {prenda.descripcion_ia || 'Analizando con IA...'}
          </p>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-900">Editar Prenda</h3>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" className="w-full border rounded p-2 text-sm" value={editForm.nombre} onChange={e => setEditForm({...editForm, nombre: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Talla</label>
                  <input type="text" className="w-full border rounded p-2 text-sm" value={editForm.talla} onChange={e => setEditForm({...editForm, talla: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Marca</label>
                  <input type="text" className="w-full border rounded p-2 text-sm" value={editForm.marca} onChange={e => setEditForm({...editForm, marca: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Temporada</label>
                  <input type="text" className="w-full border rounded p-2 text-sm" value={editForm.temporada} onChange={e => setEditForm({...editForm, temporada: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Color Principal</label>
                  <input type="text" className="w-full border rounded p-2 text-sm" value={editForm.color_principal} onChange={e => setEditForm({...editForm, color_principal: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Estilo</label>
                  <input type="text" className="w-full border rounded p-2 text-sm" value={editForm.estilo} onChange={e => setEditForm({...editForm, estilo: e.target.value})} />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
