import { Request, Response } from 'express';
import status from 'http-status';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { getSearchSuggestions } from './search.service';

const getSuggestions = catchAsync(async (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';

  const suggestions = await getSearchSuggestions(query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'Search suggestions retrieved.',
    data: { suggestions },
  });
});

export const SearchController = {
  getSuggestions,
};
