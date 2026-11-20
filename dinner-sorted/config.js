/* Optional server feature. OFF: this version has no server.
   recognizeUrl: a server endpoint YOU run that takes a photo (POST, image body) and returns
   {"ingredients": ["eggs", "spinach", ...]}. Keep any AI API key on that server, never in this file.
   Suggestions are shown as "tap to confirm" and are never added unless the user confirms them.
   Any AI-written recipes added later must pass DSEngine.validateRecipe() before they are shown. */
window.DS_CONFIG = {
  recognizeUrl: null
};
