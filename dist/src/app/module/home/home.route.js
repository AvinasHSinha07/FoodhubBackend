import express from 'express';
import { HomeController } from './home.controller';
const router = express.Router();
router.get('/summary', HomeController.getHomeSummary);
export const HomeRoutes = router;
