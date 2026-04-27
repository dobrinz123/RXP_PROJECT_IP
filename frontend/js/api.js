// RXP API helper
export const API_BASE = '/api'; // Nginx proxiază către FastAPI

export async function apiGet(path){
  // LOW-05: credentials: 'include' ensures the HttpOnly auth cookie is sent
  const r = await fetch(API_BASE + path, { credentials: 'include', cache: 'no-store' });
  if(!r.ok) throw new Error('HTTP '+r.status);
  return await r.json();
}

// Listă produse active
export async function fetchProducts(){
  return await apiGet('/products'); // implicit include_inactive=false
}

// Un produs după id
export async function fetchProduct(id){
  return await apiGet('/products/'+id);
}