import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/theme.css'; // global design tokens + base styles - see this file for colors/fonts

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
