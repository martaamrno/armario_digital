const API_URL = 'http://localhost:8000';

function getAuthHeaders() {
  const token = localStorage.getItem('access_token');
  return {
    'Authorization': `Bearer ${token}`
  };
}

export const api = {
  login: async (email, password) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: email, password })
    });
    if (!response.ok) throw new Error('Login fallido.');
    return response.json();
  },
  
  register: async (data) => {
    const response = await fetch(`${API_URL}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Registro fallido.');
    return response.json();
  },

  getAuthMe: async () => {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener perfil');
    return response.json();
  },

  updateAuthMe: async (data) => {
    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error al actualizar perfil');
    return response.json();
  },

  uploadFotoCuerpo: async (formData) => {
    const response = await fetch(`${API_URL}/auth/me/foto-cuerpo`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    });
    if (!response.ok) throw new Error('Error al subir foto de cuerpo');
    return response.json();
  },

  getFotoCuerpoUrl: async () => {
    const response = await fetch(`${API_URL}/auth/me/foto-cuerpo/url`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) return null;
    return response.json();
  },

  uploadFotoPerfil: async (formData) => {
    const response = await fetch(`${API_URL}/auth/me/foto-perfil`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    });
    if (!response.ok) throw new Error('Error al subir foto de perfil');
    return response.json();
  },

  getFotoPerfilUrl: async () => {
    const response = await fetch(`${API_URL}/auth/me/foto-perfil/url`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) return null;
    return response.json();
  },

  changePassword: async (data) => {
    const response = await fetch(`${API_URL}/auth/me/password`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Error al cambiar contraseña');
    return result;
  },

  generarAvatar: async (data) => {
    const response = await fetch(`${API_URL}/auth/me/avatar`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error al generar avatar');
    return response.json();
  },

  getAvatarUrl: async () => {
    const response = await fetch(`${API_URL}/auth/me/avatar/url`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) return null;
    return response.json();
  },

  getAvatarStatus: async () => {
    const response = await fetch(`${API_URL}/auth/me/avatar/estado`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('No se pudo obtener el estado del avatar');
    return response.json();
  },

  getArmarios: async () => {
    const response = await fetch(`${API_URL}/armarios`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
        if(response.status === 401) throw new Error('Unauthorized');
        throw new Error('Error al obtener armarios');
    }
    return response.json();
  },

  createArmario: async (data) => {
    const response = await fetch(`${API_URL}/armarios`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      if (response.status === 403) throw new Error('Has alcanzado el límite de armarios de tu plan');
      throw new Error('Error al crear armario');
    }
    return response.json();
  },

  deleteArmario: async (id) => {
    const response = await fetch(`${API_URL}/armarios/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Error al eliminar armario');
  },

  getCategorias: async () => {
    const response = await fetch(`${API_URL}/categorias`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener categorias');
    return response.json();
  },

  getPrendas: async (idArmario) => {
    const response = await fetch(`${API_URL}/prendas?id_armario=${idArmario}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener prendas');
    return response.json();
  },

  uploadPrenda: async (formData) => {
    const response = await fetch(`${API_URL}/prendas`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData 
    });
    if (!response.ok) {
      if (response.status === 403) throw new Error('Capacidad máxima de prendas alcanzada');
      throw new Error('Error al subir prenda');
    }
    return response.json();
  },

  updatePrenda: async (id, data) => {
    const response = await fetch(`${API_URL}/prendas/${id}`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error al actualizar prenda');
    return response.json();
  },

  deletePrenda: async (id) => {
    const response = await fetch(`${API_URL}/prendas/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Error al eliminar prenda');
  },

  getPrendaImageUrl: async (idPrenda) => {
    const response = await fetch(`${API_URL}/prendas/${idPrenda}/url-imagen`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener URL de imagen');
    return response.json();
  },

  generateOutfit: async (data) => {
    const response = await fetch(`${API_URL}/looks/generar`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error al generar outfit');
    return response.json();
  },

  getOutfitStatus: async (idLook) => {
    const response = await fetch(`${API_URL}/looks/${idLook}/estado`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`${response.status} - Error al consultar estado de outfit`);
    return response.json();
  },

  getOutfitImageUrl: async (idLook) => {
    const response = await fetch(`${API_URL}/looks/${idLook}/url-imagen`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) return null;
    return response.json();
  },

  createPaymentIntent: async () => {
    const response = await fetch(`${API_URL}/stripe/create-payment-intent`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Error al iniciar pago');
    return response.json();
  },

  confirmPayment: async () => {
    const response = await fetch(`${API_URL}/stripe/confirm-payment`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Error al confirmar pago');
    return response.json();
  },

  cancelSubscription: async () => {
    const response = await fetch(`${API_URL}/stripe/cancel`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Error al cancelar suscripción');
    return response.json();
  }
};
