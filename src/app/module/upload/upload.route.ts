import express from 'express';
import { UploadController } from './upload.controller';
import { upload } from '../../utils/cloudinary';
import auth from '../../middleware/auth';

const router = express.Router();

router.post(
  '/image',
  auth('PROVIDER', 'ADMIN'),
  upload.single('file'),
  UploadController.uploadImage
);

router.delete(
  '/image/:publicId',
  auth('PROVIDER', 'ADMIN'),
  UploadController.deleteImage
);

export const UploadRoutes = router;