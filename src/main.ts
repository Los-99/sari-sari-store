import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { startServiceWorker } from './lib/pwa.svelte';
import { initStorage } from './lib/db/storage.svelte';

const app = mount(App, { target: document.getElementById('app')! });

void initStorage();
startServiceWorker();

export default app;
