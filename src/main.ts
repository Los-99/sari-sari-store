import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { startServiceWorker } from './lib/pwa.svelte';
import { initStorage, storage } from './lib/db/storage.svelte';
import { loadBackupStatus } from './lib/backup/backup.svelte';

const app = mount(App, { target: document.getElementById('app')! });

void initStorage().then(() => {
  if (storage.status === 'ready') void loadBackupStatus();
});
startServiceWorker();

export default app;
