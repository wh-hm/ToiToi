// main.tsx

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'        // 削除
import App from './App.tsx'
  
createRoot(document.getElementById('root')!).render(
  <StrictMode>  
    <App />
  </StrictMode>,  
)