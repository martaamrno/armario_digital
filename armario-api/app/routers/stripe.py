import stripe
import logging
import os
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from app.database import get_db, SessionLocal
from app.auth import get_current_user
from app.models import Usuario, Pago
from app.email_service import send_subscription_email_real
from app.config import settings

router = APIRouter(prefix="/stripe", tags=["Stripe"])

stripe.api_key = settings.stripe_api_key
# TODO: Añadir STRIPE_WEBHOOK_SECRET en .env
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_...")

from datetime import datetime


@router.post("/create-payment-intent")
def create_payment_intent(db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    try:
        paymentIntent = stripe.PaymentIntent.create(
            amount=999, # 9.99€ en céntimos
            currency='eur',
            metadata={'user_id': str(usuario.id_usuario), 'email': usuario.email}
        )
        return {"clientSecret": paymentIntent.client_secret}
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"ERROR STRIPE: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/confirm-payment")
def confirm_payment(db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    try:
        # Fallback manual en caso de que Webhooks no lleguen en local
        if usuario.tipo_usuario != "premium":
            usuario.tipo_usuario = "premium"
            pago = Pago(id_usuario=usuario.id_usuario, stripe_payment_id="manual_fallback", monto=999)
            db.add(pago)
            db.commit()
            send_subscription_email_real(usuario.email, 9.99)
        return {"status": "success", "message": "Plan premium activado"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    payload = await request.body()
    try:
        # Si tienes la firma configurada, descomenta para validar
        # event = stripe.Webhook.construct_event(payload, stripe_signature, STRIPE_WEBHOOK_SECRET)
        event = stripe.Event.construct_from(import_json(payload), stripe.api_key)
    except Exception as e:
        # Fallback sin validación de firma estricta (solo para desarrollo)
        import json
        try:
            event = stripe.Event.construct_from(json.loads(payload), stripe.api_key)
        except ValueError as e:
            raise HTTPException(status_code=400, detail="Invalid payload")

    if event.type == 'payment_intent.succeeded':
        payment_intent = event.data.object
        user_id = payment_intent.metadata.get('user_id')
        email = payment_intent.metadata.get('email')
        
        if user_id:
            db = SessionLocal()
            try:
                usuario = db.get(Usuario, int(user_id))
                if usuario and usuario.tipo_usuario != "premium":
                    usuario.tipo_usuario = "premium"
                    # Registrar pago
                    pago = Pago(id_usuario=usuario.id_usuario, stripe_payment_id=payment_intent.id, monto=payment_intent.amount)
                    db.add(pago)
                    db.commit()
                    # Enviar email (mock)
                    send_subscription_email_real(email or usuario.email, payment_intent.amount / 100.0)
            finally:
                db.close()
                
    return {"status": "success"}

@router.post("/cancel")
def cancel_subscription(db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    try:
        usuario.tipo_usuario = "normal"
        db.commit()
        return {"status": "success", "message": "Suscripción cancelada"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

