import { useState, useEffect } from 'react';
import { api } from '../api';
import { Wand2, Loader2, AlertTriangle, Lock, CheckCircle2, Clock, ImageIcon, Sparkles, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_CONFIG = {
  'iniciando':  { label: 'Conectando con el servidor...',         spin: true  },
  'pendiente':  { label: 'En cola — esperando al servidor IA...', spin: false },
  'generando':  { label: 'Generando tu look con IA...',           spin: true  },
  'listo':      { label: '¡Tu look está listo!',                  spin: false },
  'error':      { label: 'Hubo un error al generar.',             spin: false },
};

export default function OutfitGenerator({ idArmario, prendas = [], hasFotoCuerpo, isPremium, onLookGenerated }) {
  const [prompt, setPrompt] = useState('');
  const [ocasion, setOcasion] = useState('');
  const [loading, setLoading] = useState(false);
  const [estadoActual, setEstadoActual] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const [showSelector, setShowSelector] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [prendaImages, setPrendaImages] = useState({});

  useEffect(() => {
    setSelectedIds(new Set());
    setPrendaImages({});
    setShowSelector(false);
  }, [idArmario]);

  useEffect(() => {
    if (!showSelector || prendas.length === 0) return;
    prendas.forEach(async (p) => {
      if (prendaImages[p.id_prenda]) return;
      try {
        const res = await api.getPrendaImageUrl(p.id_prenda);
        if (res?.url) setPrendaImages(prev => ({ ...prev, [p.id_prenda]: res.url }));
      } catch (_) {}
    });
  }, [showSelector, prendas]);

  const togglePrenda = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === prendas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(prendas.map(p => p.id_prenda)));
    }
  };

  const selectedCount = selectedIds.size;
  const usingAll = selectedCount === 0;

  const generateOutfit = async (e) => {
    e.preventDefault();
    if (!idArmario) return;
    setLoading(true);
    setEstadoActual('iniciando');
    setErrorMsg(null);
    setResultImage(null);

    const fullPrompt = `Genera un outfit completo utilizando únicamente las prendas disponibles.\n\nIntención del usuario:\n"${prompt}"\n\nTen en cuenta:\n- ocasión\n- estilo\n- clima o temporada\n- combinación de colores\n\nEl resultado debe ser un look realista y bien combinado.`;

    try {
      const response = await api.generateOutfit({
        id_armario: parseInt(idArmario),
        prompt: fullPrompt,
        ocasion: ocasion || 'casual',
        id_prendas: usingAll ? null : [...selectedIds],
      });

      const { id_look } = response;
      let currentStatus = response.estado;

      while (currentStatus === 'pendiente' || currentStatus === 'generando') {
        setEstadoActual(currentStatus);
        await new Promise(r => setTimeout(r, 3000));
        let statusData;
        try {
          statusData = await api.getOutfitStatus(id_look);
        } catch (pollErr) {
          if (pollErr.message?.includes('401') || pollErr.message?.includes('Unauthorized')) {
            localStorage.removeItem('access_token');
            window.location.href = '/login';
            return;
          }
          throw pollErr;
        }
        currentStatus = statusData.estado;

        if (currentStatus === 'error') {
          setEstadoActual('error');
          setErrorMsg(statusData.error_mensaje || 'Error desconocido al generar el look.');
          setLoading(false);
          return;
        }
      }

      if (currentStatus === 'listo') {
        setEstadoActual('listo');
        if (isPremium) {
          const imageRes = await api.getOutfitImageUrl(id_look);
          if (imageRes && imageRes.url) setResultImage(imageRes.url);
        }
        onLookGenerated?.();
      }
    } catch (err) {
      setErrorMsg(err.message);
      setEstadoActual('error');
    } finally {
      setLoading(false);
    }
  };

  const cfg = estadoActual ? STATUS_CONFIG[estadoActual] : null;

  return (
    <div className="space-y-4">
      {isPremium && !hasFotoCuerpo && (
        <div className="flex gap-3 p-3.5 bg-rose-light border border-rose-soft rounded-2xl text-sm text-plum/70">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-mid mt-0.5" />
          <p>Para el <span className="font-semibold text-plum">Virtual Try-On</span>, <Link to="/profile" className="text-burgundy font-semibold hover:underline">sube una foto de cuerpo completo</Link>.</p>
        </div>
      )}

      {!isPremium && (
        <div className="flex items-start gap-3 p-3.5 bg-lavender-soft/50 border border-lavender-soft rounded-2xl text-sm text-plum/70">
          <Lock className="w-4 h-4 shrink-0 text-lavender mt-0.5" />
          <div>
            <p className="font-semibold text-plum mb-0.5">Plan Normal</p>
            <p>Recibirás recomendaciones de texto. Para el Virtual Try-On, <Link to="/premium" className="text-burgundy font-semibold hover:underline">mejora a Premium</Link>.</p>
          </div>
        </div>
      )}

      <form onSubmit={generateOutfit} className="space-y-3">
        <div>
          <label className="label-field">¿Qué buscas hoy?</label>
          <textarea
            required
            rows={3}
            className="input-field resize-none"
            placeholder="Ej: un look elegante para una cena en invierno..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div>
          <label className="label-field">Ocasión</label>
          <input
            type="text"
            className="input-field"
            placeholder="Ej: formal, casual, fiesta..."
            value={ocasion}
            onChange={(e) => setOcasion(e.target.value)}
          />
        </div>

        {/* Selector de prendas */}
        {prendas.length > 0 && (
          <div className="border border-rose-soft/60 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSelector(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-rose-light hover:bg-rose-soft/30 transition-colors text-sm font-medium text-plum/70"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-rose-mid" />
                {usingAll
                  ? `Todas las prendas (${prendas.length})`
                  : `${selectedCount} de ${prendas.length} seleccionadas`}
              </span>
              {showSelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showSelector && (
              <div className="p-3 border-t border-rose-soft/40 bg-white">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs text-plum/40">Elige las prendas a incluir</p>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-xs font-semibold text-burgundy hover:text-burgundy-dark transition-colors"
                  >
                    {selectedIds.size === prendas.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-0.5">
                  {prendas.map(p => {
                    const isSelected = selectedIds.has(p.id_prenda);
                    const img = prendaImages[p.id_prenda];
                    return (
                      <button
                        key={p.id_prenda}
                        type="button"
                        onClick={() => togglePrenda(p.id_prenda)}
                        className={`relative rounded-xl overflow-hidden border-2 transition-all text-left ${
                          isSelected
                            ? 'border-burgundy shadow-sm'
                            : 'border-rose-soft/60 opacity-60 hover:opacity-90'
                        }`}
                      >
                        <div className="aspect-square bg-rose-light flex items-center justify-center overflow-hidden">
                          {img
                            ? <img src={img} alt={p.nombre} className="w-full h-full object-cover" />
                            : <ImageIcon className="w-4 h-4 text-plum/20" />
                          }
                        </div>
                        <p className="text-[9px] font-medium text-plum/60 px-1 py-0.5 truncate bg-white">{p.nombre}</p>
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-burgundy rounded-full p-0.5">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !idArmario}
          className="btn-primary w-full"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
            : <><Wand2 className="w-4 h-4" /> Generar Look</>
          }
        </button>
      </form>

      {/* Estado en tiempo real */}
      {cfg && (
        <div className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${
          estadoActual === 'listo'
            ? 'bg-rose-light border-rose-soft text-plum'
            : estadoActual === 'error'
            ? 'bg-red-50 border-red-100 text-red-700'
            : 'bg-lavender-soft/50 border-lavender-soft text-plum'
        }`}>
          {estadoActual === 'listo'
            ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-burgundy" />
            : estadoActual === 'error'
            ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            : estadoActual === 'pendiente'
            ? <Clock className="w-4 h-4 shrink-0 mt-0.5 text-lavender" />
            : <Loader2 className="w-4 h-4 shrink-0 mt-0.5 text-lavender animate-spin" />
          }
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{cfg.label}</p>
            {estadoActual === 'pendiente' && (
              <p className="text-xs mt-0.5 opacity-70">La IA está en cola, puede tardar unos instantes...</p>
            )}
            {estadoActual === 'generando' && (
              <p className="text-xs mt-0.5 opacity-70">El virtual try-on puede tardar entre 2 y 5 minutos. Puedes seguir navegando.</p>
            )}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="flex gap-2 p-3.5 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {errorMsg}
        </div>
      )}

      {resultImage && isPremium && (
        <div>
          <p className="text-xs font-semibold text-plum/50 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <ImageIcon className="w-3 h-3" /> Virtual Try-On
          </p>
          <div className="rounded-2xl overflow-hidden border border-rose-soft/60 shadow-rose">
            <img src={resultImage} alt="Outfit Generado" className="w-full h-auto object-cover" />
          </div>
        </div>
      )}

      {estadoActual === 'listo' && !isPremium && (
        <div className="p-4 bg-rose-light border border-rose-soft rounded-2xl text-center">
          <p className="font-semibold text-plum mb-1 text-sm">¡Recomendación lista!</p>
          <p className="text-plum/50 text-xs mb-3">Para ver la imagen virtual necesitas el plan Premium.</p>
          <Link to="/premium" className="inline-flex items-center gap-1.5 btn-primary text-sm py-2 px-4">
            Ver planes
          </Link>
        </div>
      )}
    </div>
  );
}
