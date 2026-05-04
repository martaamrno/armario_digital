import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useToast } from './Toast';
import { Check, ArrowLeft, Star, Loader2, X } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Reemplazar con la clave pública de Stripe (la que empieza por pk_test_ o similar)
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
        payment_method: {
          card: elements.getElement(CardElement),
        }
      });

      if (result.error) {
        addToast(result.error.message, 'error');
      } else {
        await api.confirmPayment();
        addToast('¡Suscripción Premium activada con éxito!', 'success');
        navigate('/dashboard');
      }
    } catch (error) {
      addToast('Error al procesar el pago', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Datos de la tarjeta</label>
        <div className="p-3 border border-gray-300 rounded-lg bg-white shadow-sm">
          <CardElement options={{style: {base: {fontSize: '16px', color: '#424770', '::placeholder': {color: '#aab7c4'}}}}} />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={!stripe || loading} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : 'Pagar 9.99€'}
        </button>
      </div>
    </form>
  );
}

export default function PremiumPlans() {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link to="/dashboard" className="text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Volver al Dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-16 w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Mejora tu Armario Digital</h1>
          <p className="mt-4 text-xl text-gray-500">Desbloquea el poder total de la IA y organiza sin límites.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col">
            <h3 className="text-2xl font-bold text-gray-900">Normal</h3>
            <p className="text-gray-500 mt-2">Para organizar lo esencial.</p>
            <div className="my-6">
              <span className="text-4xl font-extrabold text-gray-900">Gratis</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-gray-600"><Check className="w-5 h-5 text-green-500 shrink-0" /> Hasta 2 armarios</li>
              <li className="flex gap-3 text-gray-600"><Check className="w-5 h-5 text-green-500 shrink-0" /> Máximo 10 prendas por armario</li>
              <li className="flex gap-3 text-gray-600"><Check className="w-5 h-5 text-green-500 shrink-0" /> Generación de looks con IA (texto)</li>
              <li className="flex gap-3 text-gray-400"><Check className="w-5 h-5 text-gray-300 shrink-0" /> Sin Virtual Try-On</li>
            </ul>
            <button disabled className="w-full bg-gray-100 text-gray-500 font-semibold py-3 rounded-xl">Plan Actual</button>
          </div>

          <div className="bg-gradient-to-b from-indigo-50 to-white rounded-2xl shadow-xl border-2 border-indigo-500 p-8 flex flex-col relative transform md:-translate-y-4">
            <div className="absolute top-0 right-8 transform -translate-y-1/2">
              <span className="bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full flex items-center gap-1">
                <Star className="w-3 h-3" fill="currentColor" /> Recomendado
              </span>
            </div>
            <h3 className="text-2xl font-bold text-indigo-900">Premium</h3>
            <p className="text-indigo-600 mt-2">Capacidad profesional para amantes de la moda.</p>
            <div className="my-6">
              <span className="text-4xl font-extrabold text-gray-900">9.99€</span>
              <span className="text-gray-500">/mes</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-gray-700"><Check className="w-5 h-5 text-indigo-500 shrink-0" /> Hasta 25 armarios</li>
              <li className="flex gap-3 text-gray-700"><Check className="w-5 h-5 text-indigo-500 shrink-0" /> Máximo 25 prendas por armario</li>
              <li className="flex gap-3 text-gray-700"><Check className="w-5 h-5 text-indigo-500 shrink-0" /> Virtual try-on en tus prendas</li>
              <li className="flex gap-3 text-gray-700"><Check className="w-5 h-5 text-indigo-500 shrink-0" /> Avatar personalizado por IA</li>
            </ul>
            <button 
              onClick={() => setShowPaymentModal(true)} 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-md flex justify-center items-center gap-2"
            >
              Actualizar a Premium
            </button>
          </div>
        </div>
      </main>

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-900">Pago Seguro con Stripe</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
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
