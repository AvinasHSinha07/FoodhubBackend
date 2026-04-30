import express from 'express';
import { SearchController } from './search.controller';

const router = express.Router();

// GET /api/v1/search/suggestions?q=chicken
router.get('/suggestions', SearchController.getSuggestions);

export const SearchRoutes = router;
