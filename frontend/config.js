// frontend/src/config.js

// 1. Put your Render Backend URL here
const RENDER_URL = "https://mind-saga-testing.onrender.com"; 

// 2. Put your Local Backend URL here
const LOCAL_URL = "http://localhost:8000";

// 3. This logic automatically selects the right URL
// If the app is running on localhost, use LOCAL_URL. Otherwise, use RENDER_URL.
export const API_BASE_URL = window.location.hostname === "localhost" 
  ? LOCAL_URL 
  : RENDER_URL;