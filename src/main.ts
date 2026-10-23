import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { startServiceWorker } from './lib/pwa.svelte';

const app = mount(App, { target: document.getElementById('app')! });

startServiceWorker();

export default app;
