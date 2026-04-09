
import app from './app';
import { Server } from 'http';
import dotenv from 'dotenv';
dotenv.config();

let server: Server;

async function main() {
  try {
    const port = process.env.PORT || 5000;
    
    server = app.listen(port, () => {
      console.log(`FoodHub backend is listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

main();

process.on('unhandledRejection', () => {
  console.log('😈 unhandledRejection is detected, shutting down...');
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', () => {
  console.log('😈 uncaughtException is detected, shutting down...');
  process.exit(1);
});