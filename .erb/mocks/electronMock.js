// Jest runs the renderer without Electron, so the preload bridge that the app
// reads via `window.require('electron')` has to exist. Minimal no-op surface;
// the App smoke test only needs the imports to resolve.
const ipcRenderer = {
  on: () => {},
  once: () => {},
  removeListener: () => {},
  removeAllListeners: () => {},
  send: () => {},
  invoke: () => Promise.resolve(),
}

window.require = (name) =>
  name === 'electron'
    ? { ipcRenderer, shell: { openExternal: () => Promise.resolve() }, clipboard: { writeText: () => {} } }
    : require(name)
