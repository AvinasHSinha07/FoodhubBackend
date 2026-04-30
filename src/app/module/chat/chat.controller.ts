import { Request, Response, NextFunction } from 'express';
import status from 'http-status';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { getChatResponse, TChatMessage } from './chat.service';

const sendMessage = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { message, history } = req.body as {
    message: string;
    history: TChatMessage[];
  };

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return sendResponse(res, {
      httpStatusCode: status.BAD_REQUEST,
      success: false,
      message: 'Message is required.',
      data: { reply: '' },
    });
  }

  const reply = await getChatResponse(message.trim(), history || []);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'Chat response generated successfully.',
    data: { reply },
  });
});

export const ChatController = {
  sendMessage,
};
