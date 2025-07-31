// Monaco CSS Worker - This will be replaced by the actual worker from node_modules
// during build process. For now, we'll use a simple fallback.
self.MonacoEnvironment = {
  baseUrl: '/assets/monaco-editor/'
};

// Import the actual CSS worker from Monaco Editor
importScripts('/node_modules/monaco-editor/esm/vs/language/css/css.worker.js');