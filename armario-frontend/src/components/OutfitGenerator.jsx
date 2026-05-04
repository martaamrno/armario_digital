import { useState } from 'react';
import { api } from '../api';
import { Wand2, Loader2, AlertTriangle, Lock, CheckCircle2, Clock, ImageIcon, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_CONFIG = {
  'iniciando':    { color: 'blue',   Icon: Loader2,       label: 'Conectando con el servidor...',         spin: true  },
  'pendiente':    { color: 'yellow', Icon: Clock,         label: 'En cola — esperando al servidor IA...', spin: false },
  'generando':    { color: 'purple', Icon: Sparkles,      label: 'Generando tu look con IA...',           spin: true  },
  'listo':        { color: 'green',  Icon: CheckCircle2,  label: '¡Tu look está listo!',                  spin: false },
  'error':        { color: 'red',    Icon: AlertTriangle, label: 'Hubo un error al generar.',              spin: false },
};

const colorMap = {
  blue:   'bg-blue-50 border-blue-200 text-blue-700',
  yellow: 'bg-amber-50 border-amber-200 text-amber-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700',
  green:  'bg-green-50 border-green-200 text-green-700',
  red:    'bg-red-50 border-red-200 text-red-700',
};

export default function OutfitGenerator({ idArmario, hasFotoCuerpo, isPremium }) {
  const [prompt, setPrompt] = useState('');
  const [ocasion, setOcasion] = useState('');
  const [loading, setLoading] = useState(false);
  const [estadoActual, setEstadoActual] = useState(null); // null | 'iniciando' | 'pendiente' | 'generando' | 'listo' | 'error'
  const [resultImage, setResultImage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const generateOutfit = async (e) => {
    e.preventDefault();
    if (!idArmario) return;
    setLoading(true);
    setEstadoActual('iniciando');
    setErrorMsg(null);
    setResultImage(null);

    const fullPrompt = `Genera un outfit completo utilizando únicamente las prendas disponibles en el armario seleccionado.\n\nEl outfit debe ser coherente con la siguiente intención del usuario:\n"${prompt}"\n\nTen en cuenta:\n- ocasión\n- estilo\n- clima o temporada\n- combinación de colores\n\nEl resultado debe ser un look realista y bien combinado.`;

    try {
      const response = await api.generateOutfit({
        id_armario: parseInt(idArmario),
        prompt: fullPrompt,
        ocasion: ocasion || 'casual'
      });

      const { id_look } = response;
      let currentStatus = response.estado;

      // Polling usando el estado real del backend
      while (currentStatus === 'pendiente' || currentStatus === 'generando') {
        setEstadoActual(currentStatus);
        await new Promise(r => setTimeout(r, 3000));
        let statusData;
        try {
          statusData = await api.getOutfitStatus(id_look);
        } catch (pollErr) {
          // Si el token expiró durante el polling
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-gradient-to-tr from-purple-500 to-indigo-500 p-1.5 rounded-lg shadow-sm">
          <Wand2 className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-800">Generar Outfit con IA</h3>
      </div>

      {/* Aviso foto cuerpo (solo premium sin foto) */}
      {isPremium && !hasFotoCuerpo && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 text-sm text-amber-800">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
          <p>Para aprovechar el <span className="font-bold">Virtual Try-On</span>, <Link to="/profile" className="font-bold underline hover:text-amber-900">sube una foto de cuerpo completo</Link>.</p>
        </div>
      )}

      {/* Aviso plan normal */}
      {!isPremium && (
        <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-start gap-3 text-sm text-gray-700">
          <Lock className="w-5 h-5 shrink-0 text-gray-400 mt-0.5" />
          <div>
            <p className="font-semibold">Plan Normal</p>
            <p className="text-gray-500">Recibirás recomendaciones de texto. Para el Virtual Try-On, <Link to="/premium" className="text-indigo-600 font-medium hover:underline">mejora a Premium</Link>.</p>
          </div>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={generateOutfit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">¿Qué buscas hoy?</label>
          <textarea
            required
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none bg-gray-50 hover:bg-white"
            placeholder="Ej: un look elegante para una cena de empresa en invierno..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ocasión</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all bg-gray-50 hover:bg-white"
            placeholder="Ej: formal, casual, fiesta..."
            value={ocasion}
            onChange={(e) => setOcasion(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !idArmario}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-50"
        >
          {loading
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Procesando...</>
            : <><Wand2 className="w-5 h-5" /> Generar Recomendación</>
          }
        </button>
      </form>

      {/* ── Panel de estado en tiempo real ── */}
      {cfg && (
        <div className={`mt-5 flex items-start gap-3 p-4 rounded-xl border transition-all ${colorMap[cfg.color]}`}>
          <cfg.Icon className={`w-5 h-5 shrink-0 mt-0.5 ${cfg.spin ? 'animate-spin' : ''}`} />
          <div className="flex-1">
            <p className="font-semibold text-sm">{cfg.label}</p>
            {estadoActual === 'pendiente' && (
              <p className="text-xs mt-0.5 opacity-75">La IA está en cola, puede tardar unos instantes...</p>
            )}
            {estadoActual === 'generando' && (
              <p className="text-xs mt-0.5 opacity-75">Puede tardar entre 20 y 60 segundos. Puedes seguir navegando.</p>
            )}
            {estadoActual === 'listo' && isPremium && resultImage && (
              <p className="text-xs mt-0.5 opacity-75">La imagen del try-on ya está disponible abajo.</p>
            )}
          </div>
          {/* Barra de progreso animada */}
          {(estadoActual === 'pendiente' || estadoActual === 'generando') && (
            <div className="w-16 h-1 rounded-full bg-current opacity-20 overflow-hidden relative shrink-0 mt-2">
              <div
                className="absolute top-0 left-0 h-full bg-current opacity-80 rounded-full"
                style={{ width: '40%', animation: 'progress-slide 1.5s ease-in-out infinite' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm flex gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Virtual Try-On (solo premium con imagen) */}
      {resultImage && isPremium && (
        <div className="mt-6">
          <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2 border-b pb-2">
            <ImageIcon className="w-4 h-4 text-indigo-500" /> Tu Virtual Try-On:
          </h4>
          <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200">
            <img src={resultImage} alt="Outfit Generado" className="w-full h-auto object-cover" />
          </div>
        </div>
      )}

      {/* CTA plan normal tras generación */}
      {estadoActual === 'listo' && !isPremium && (
        <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
          <h4 className="text-indigo-900 font-bold mb-2">¡Recomendación lista!</h4>
          <p className="text-indigo-700 text-sm mb-4">El look ha sido guardado. Para ver la imagen virtual del outfit en ti, necesitas el plan Premium.</p>
          <Link to="/premium" className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-indigo-700 transition">Mejorar Plan</Link>
        </div>
      )}
    </div>
  );
}
