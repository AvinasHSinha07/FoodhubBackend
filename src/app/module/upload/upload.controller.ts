import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { sendImageToCloudinary, deleteImageFromCloudinary } from '../../utils/cloudinary';

const uploadImage = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new Error('Image file is missing');
  }

  const imageName = req.file.originalname + '-' + Date.now();
  const path = req.file.path;

  const result = await sendImageToCloudinary(imageName, path);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Image uploaded successfully',
    data: result,
  });
});

const deleteImage = catchAsync(async (req: Request, res: Response) => {
  const { publicId } = req.params;

  const result = await deleteImageFromCloudinary(publicId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Image deleted successfully',
    data: result,
  });
});

export const UploadController = {
  uploadImage,
  deleteImage,
};