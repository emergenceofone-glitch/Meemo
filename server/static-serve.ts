import path from 'path';
import express from 'express';

/**
 * Sets up static file serving for the Express app
 * @param app Express application instance
 */
export function setupStaticServing(app: express.Application) {
  // Point this to where Vite actually builds the files
  const distPath = path.join(process.cwd(), 'dist', 'public');

  // Serve static files (js, css, images)
  app.use(express.static(distPath));

  // Catch-all route: Serve index.html for any non-API request
  // (This enables client-side routing like React Router)
  app.get('*', (req, res, next) => {
    // Skip if it looks like an API call
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    // Send the index.html from the build folder
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) {
        // If index.html is missing, the build likely hasn't run
        res.status(404).send("Frontend build not found. Run 'npm run build' first.");
      }
    });
  });
}
