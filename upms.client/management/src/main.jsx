import React from 'react';
import { createRoot } from 'react-dom/client';
import { Management } from './Management.jsx';
import { SimpleV1 } from './SimpleV1.jsx';
import './management.css';
import './operations.css';
import './refresh.css';
createRoot(document.getElementById('root')).render(<React.StrictMode>{document.documentElement.dataset.upmsMode==='simple-v1'?<SimpleV1/>:<Management />}</React.StrictMode>);
