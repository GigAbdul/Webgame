import { jsx as _jsx } from "react/jsx-runtime";
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { AppProviders } from './app/providers';
import './styles/index.css';
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(AppProviders, { children: _jsx(App, {}) }));
