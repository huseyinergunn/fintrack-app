import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get('CLOUDINARY_API_KEY'),
      api_secret: config.get('CLOUDINARY_API_SECRET'),
    });
  }

  uploadFile(buffer: Buffer, folder: string): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder, resource_type: 'auto' }, (error, result: UploadApiResponse) => {
          if (error) return reject(error);
          resolve({ url: result.secure_url, publicId: result.public_id });
        })
        .end(buffer);
    });
  }

  deleteFile(publicId: string): Promise<void> {
    return cloudinary.uploader.destroy(publicId).then(() => undefined);
  }
}
