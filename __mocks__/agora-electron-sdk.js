// Jest runs without Electron, so the native Agora addon cannot load. The App
// smoke test only imports the module graph, so a permissive stub is enough.
const engine = new Proxy(
  {},
  {
    get: () => () => {},
  },
)

module.exports = {
  createAgoraRtcEngine: () => engine,
  default: { createAgoraRtcEngine: () => engine },
}
