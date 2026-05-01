import express from 'express';
import dotenv from 'dotenv';
// Use .js extension even if the file is .ts (required by NodeNext/ESM)
import { setupStaticServing } from './static-serve.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000; // Use 3000 as per system instructions for external access

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Example API Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// API Test Route
app.get('/api/hello', (req, res) => {
  res.json({ message: "Hello from the Express server!" });
});

export async function startServer(port: number | string) {
  try {
    // Only serve static files in production.
    // In development, Vite's dev server handles the frontend.
    if (process.env.NODE_ENV === 'production') {
      setupStaticServing(app);
    }

    app.listen(port, () => {
      console.log(`Server environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Check if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer(PORT);
}
