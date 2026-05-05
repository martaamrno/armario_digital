import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useToast } from './Toast';
import { Check, ArrowLeft, Star, Loader2, X, Crown, Sparkles, AlertTriangle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_test_51TQehRB0YAiOXX9cjIi8xkgu9eSgYwDuGOXNrpUMY1afYH6FnWAeffBfFkjXFmOIzJ9aQ7VghJ1nd825n4t3e8nK007ENfRUzB');

function CheckoutForm({ onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const response = await api.createPaymentIntent();
      const { clientSecret } = response;
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) }
      });
      if (result.error) {
        addToast(result.error.message, 'error');
      } else {
        await api.confirmPayment();
        addToast('¡Suscripción Premium activada con éxito!', 'success');
        navigate('/dashboard');
      }
    } catch {
      addToast('Error al procesar el pago', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5">
      <div>
        <label className="label-field">Datos de la tarjeta</label>
        <div className="input-field py-3.5">
          <CardElement options={{ style: { base: { fontSize: '15px', color: '#26011C', '::placeholder': { color: '#F2ACD3' } } } }} />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancelar</button>
        <button type="submit" disabled={!stripe || loading} className="btn-primary">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : 'Pagar 9.99€'}
        </button>
      </div>
    </form>
  );
}

const NORMAL_FEATURES = [
  { text: 'Hasta 2 armarios', active: true },
  { text: 'Máximo 10 prendas por armario', active: true },
  { text: 'Generación de looks con IA (texto)', active: true },
  { text: 'Virtual Try-On', active: false },
  { text: 'Avatar personalizado IA', active: false },
];

const PREMIUM_FEATURES = [
  { text: 'Hasta 25 armarios', active: true },
  { text: 'Máximo 25 prendas por armario', active: true },
  { text: 'Generación de looks con IA (texto)', active: true },
  { text: 'Virtual Try-On en tus prendas', active: true },
  { text: 'Avatar personalizado IA', active: true },
];

export default function PremiumPlans() {
  const [user, setUser] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [loadingCancel, setLoadingCancel] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.getAuthMe().then(setUser).catch(() => {});
  }, []);

  const handleCancelSubscription = async () => {
    setLoadingCancel(true);
    try {
      await api.cancelSubscription();
      addToast('Suscripción cancelada correctamente', 'success');
      setUser({ ...user, tipo_usuario: 'normal' });
      setShowCancelModal(false);
    } catch {
      addToast('Error al cancelar la suscripción', 'error');
    } finally {
      setLoadingCancel(false);
    }
  };

  const isPremium = user?.tipo_usuario === 'premium';

  return (
    <div className="min-h-screen bg-rose-light flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-rose-soft/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-lavender-soft/20 blur-3xl" />
      </div>

      <header className="bg-white/80 backdrop-blur-sm border-b border-rose-soft/50 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center">
          <Link to="/dashboard" className="btn-ghost text-sm py-2 px-3">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-14 w-full relative">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-5">
            <div className="w-10 h-10 rounded-2xl gradient-rose flex items-center justify-center shadow-burgundy">
              <span className="text-white text-lg">✦</span>
            </div>
            <span className="font-playfair text-2xl font-semibold text-plum">OutfitLab</span>
          </div>
          <h1 className="font-playfair text-4xl font-semibold text-plum mb-3">Elige tu plan</h1>
          <p className="text-plum/50 text-base max-w-md mx-auto">Desbloquea el poder total de la IA y organiza tu estilo sin límites.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-8 flex flex-col">
            <div className="mb-6">
              <p className="text-xs font-semibold text-plum/30 uppercase tracking-widest mb-2">Plan gratuito</p>
              <h3 className="font-playfair text-3xl font-semibold text-plum">Normal</h3>
              <p className="text-plum/40 text-sm mt-1">Para organizar lo esencial.</p>
            </div>
            <div className="mb-8">
              <span className="font-playfair text-4xl font-semibold text-plum">Gratis</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {NORMAL_FEATURES.map((f, i) => (
                <li key={i} className={`flex items-center gap-3 text-sm ${f.active ? 'text-plum/70' : 'text-plum/25'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${f.active ? 'bg-rose-soft' : 'bg-rose-light'}`}>
                    <Check className={`w-3 h-3 ${f.active ? 'text-burgundy' : 'text-plum/15'}`} />
                  </span>
                  {f.text}
                </li>
              ))}
            </ul>
            {!isPremium ? (
              <button disabled className="btn-secondary w-full opacity-60 cursor-not-allowed">Plan actual</button>
            ) : (
              <button onClick={() => navigate('/dashboard')} className="btn-secondary w-full">Seguir usando</button>
            )}
          </div>

          <div className={`relative bg-white rounded-3xl shadow-rose-lg border-2 p-8 flex flex-col md:-translate-y-4 overflow-hidden transition-all ${isPremium ? 'border-emerald-400/30 shadow-emerald-100' : 'border-rose-mid/40 shadow-rose-lg'}`}>
            <div className="absolute top-0 right-8 -translate-y-1/2">
              <span className={`text-white text-[10px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-full flex items-center gap-1 shadow-md ${isPremium ? 'bg-emerald-500' : 'bg-burgundy'}`}>
                {isPremium ? <><Check className="w-3 h-3" /> Plan Activo</> : <><Star className="w-3 h-3" fill="currentColor" /> Recomendado</>}
              </span>
            </div>
            <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-2xl -translate-y-10 translate-x-10 pointer-events-none ${isPremium ? 'bg-emerald-100/30' : 'bg-rose-soft/20'}`} />
            <div className="mb-6 relative">
              <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${isPremium ? 'text-emerald-500' : 'text-rose-mid'}`}>
                {isPremium ? 'Acceso total' : 'Desbloquea todo'}
              </p>
              <h3 className="font-playfair text-3xl font-semibold text-plum">Premium</h3>
              <p className="text-plum/40 text-sm mt-1">Capacidad profesional para amantes de la moda.</p>
            </div>
            <div className="mb-8">
              <span className="font-playfair text-4xl font-semibold text-plum">9.99€</span>
              <span className="text-plum/40 text-sm">/mes</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {PREMIUM_FEATURES.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-plum/70">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isPremium ? 'bg-emerald-50' : 'bg-rose-soft'}`}>
                    <Check className={`w-3 h-3 ${isPremium ? 'text-emerald-500' : 'text-burgundy'}`} />
                  </span>
                  {f.text}
                </li>
              ))}
            </ul>
            {isPremium ? (
              <button 
                onClick={() => setShowCancelModal(true)} 
                className="w-full py-3.5 px-6 rounded-2xl border-2 border-red-100 text-red-500 font-semibold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancelar suscripción
              </button>
            ) : (
              <button onClick={() => setShowPaymentModal(true)} className="btn-primary w-full">
                <Crown className="w-4 h-4" /> Actualizar a Premium
              </button>
            )}
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: <Sparkles className="w-5 h-5 text-rose-mid" />, title: 'Virtual Try-On', desc: 'Pruébate outfits generados por IA usando tu propia foto.' },
            { icon: <Crown className="w-5 h-5 text-rose-mid" />, title: 'Avatar IA', desc: 'Crea una versión digital personalizada de ti misma.' },
            { icon: <Check className="w-5 h-5 text-rose-mid" />, title: 'Sin límites', desc: 'Hasta 25 armarios y 25 prendas por armario.' },
          ].map((item, i) => (
            <div key={i} className="card p-5 text-center">
              <div className="w-10 h-10 bg-rose-light rounded-2xl flex items-center justify-center mx-auto mb-3">
                {item.icon}
              </div>
              <p className="font-semibold text-plum text-sm mb-1">{item.title}</p>
              <p className="text-xs text-plum/40 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {showPaymentModal && (
        <div className="fixed inset-0 bg-plum/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-rose-lg w-full max-w-md overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-5 border-b border-rose-soft/50">
              <div>
                <h3 className="font-playfair text-xl font-semibold text-plum">Pago seguro</h3>
                <p className="text-xs text-plum/40 mt-0.5">Procesado por Stripe · 9.99€/mes</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 text-plum/30 hover:text-plum hover:bg-rose-light rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <Elements stripe={stripePromise}>
              <CheckoutForm onCancel={() => setShowPaymentModal(false)} />
            </Elements>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-plum/40 backdrop-blur-sm" onClick={() => setShowCancelModal(false)} />
          <div className="bg-white rounded-3xl shadow-rose-lg w-full max-w-sm relative z-10 p-7 animate-scale-in text-center border border-rose-soft/50">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="font-playfair text-2xl font-semibold text-plum mb-2">¿Cancelar Premium?</h3>
            <p className="text-sm text-plum/50 mb-8 leading-relaxed">
              Sentimos que te vayas. Al cancelar, perderás el acceso al <strong>Virtual Try-On</strong>, generación de avatares y los límites extendidos.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleCancelSubscription} 
                disabled={loadingCancel}
                className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                {loadingCancel ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar cancelación'}
              </button>
              <button 
                onClick={() => setShowCancelModal(false)} 
                disabled={loadingCancel}
                className="w-full py-3.5 bg-rose-light text-plum font-semibold rounded-2xl hover:bg-rose-soft transition-all"
              >
                No, mantener mi plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
