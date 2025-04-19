import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Path is now relative within src/ui/options
import './index.css'; // Path is now relative within src/ui/options

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
