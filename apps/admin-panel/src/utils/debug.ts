export const debugAuth = () => {
  console.log("🔍 === DEBUG AUTH === 🔍");
  console.log("LocalStorage contents:");
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      console.log(`  ${key}:`, value?.substring(0, 100) + (value && value.length > 100 ? '...' : ''));
    }
  }
  
  const token = localStorage.getItem('adminToken');
  if (token) {
    try {
      const tokenParts = token.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));
      console.log("🔍 Decoded token payload:", payload);
      console.log("🔍 Role in token:", payload.role);
    } catch (e) {
      console.error("Cannot decode token:", e);
    }
  }
  
  console.log("🔍 === END DEBUG === 🔍");
};