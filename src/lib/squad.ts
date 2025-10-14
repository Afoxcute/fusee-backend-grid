import dotenv from 'dotenv';
dotenv.config();
import { GridClient } from '@sqds/grid';

const gridClient = new GridClient({
  environment: process.env.GRID_ENVIRONMENT as 'sandbox' | 'production',
  apiKey: process.env.GRID_API_KEY!,
  baseUrl: 'https://grid.squads.xyz',
});

export default gridClient;
