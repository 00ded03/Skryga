import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { seedDefaults } from './db/database'
import './index.css'

seedDefaults()
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
