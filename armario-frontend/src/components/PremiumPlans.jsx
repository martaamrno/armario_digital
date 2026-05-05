import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useToast } from './Toast';
import { Check, ArrowLeft, Star, Loader2, X, Crown, Sparkles } from 'lucide-react';
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  return (
    <div className="min-h-screen bg-rose-light flex flex-col">
      {/* Decoración */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-rose-soft/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-lavender-soft/20 blur-3xl" />
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-rose-soft/50 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center">
          <Link to="/dashboard" className="btn-ghost text-sm py-2 px-3">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-14 w-full relative">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-5">
            <div className="w-10 h-10 rounded-2xl gradient-rose flex items-center justify-center shadow-burgundy">
              <span className="text-white text-lg">✦</span>
            </div>
            <span className="font-playfair text-2xl font-semibold text-plum">Armario Digital</span>
          </div>
          <h1 className="font-playfair text-4xl font-semibold text-plum mb-3">Elige tu plan</h1>
          <p className="text-plum/50 text-base max-w-md mx-auto">Desbloquea el poder total de la IA y organiza tu estilo sin límites.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Plan Normal */}
          <div className="card p-8 flex flex-col">
            <div className="mb-6">
              <p className="text-xs font-semibold text-plum/30 uppercase tracking-widest mb-2">Plan actual</p>
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
            <button disabled className="btn-secondary w-full opacity-60 cursor-not-allowed">Plan actual</button>
          </div>

          {/* Plan Premium */}
          <div className="relative bg-white rounded-3xl shadow-rose-lg border-2 border-rose-mid/40 p-8 flex flex-col md:-translate-y-4 overflow-hidden">
            {/* Badge recomendado */}
            <div className="absolute top-0 right-8 -translate-y-1/2">
              <span className="bg-burgundy text-white text-[10px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-full flex items-center gap-1 shadow-burgundy">
                <Star className="w-3 h-3" fill="currentColor" /> Recomendado
              </span>
            </div>

            {/* Decoración interna */}
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-rose-soft/20 blur-2xl -translate-y-10 translate-x-10 pointer-events-none" />

            <div className="mb-6 relative">
              <p className="text-xs font-semibold text-rose-mid uppercase tracking-widest mb-2">Desbloquea todo</p>
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
                  <span className="w-5 h-5 rounded-full bg-rose-soft flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-burgundy" />
                  </span>
                  {f.text}
                </li>
              ))}
            </ul>
            <button onClick={() => setShowPaymentModal(true)} className="btn-primary w-full">
              <Crown className="w-4 h-4" /> Actualizar a Premium
            </button>
          </div>
        </div>

        {/* Features highlight */}
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

      {/* Modal pago */}
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
    </div>
  );
}
