import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import RunDetailPage from './pages/RunDetailPage.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<App />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/history/:runId" element={<RunDetailPage />} />
            </Routes>
        </BrowserRouter>
    </React.StrictMode>
);
