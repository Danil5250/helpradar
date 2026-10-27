import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { AppException, ERR } from '../../common/errors';

/**
 * Upload problems detected by multer (file too large, unexpected field, ...) are reported with the SRS text
 * "Use JPEG, PNG or WebP files up to 10 MB." (SRS 3.2.4.5). Other errors keep their own response.
 */
@Catch(HttpException)
export class PhotoUploadFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (
      exception instanceof AppException ||
      ![400, 413].includes(exception.getStatus())
    ) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }
    response.status(ERR.PHOTO_INVALID.status).json({
      statusCode: ERR.PHOTO_INVALID.status,
      code: 'PHOTO_INVALID',
      message: ERR.PHOTO_INVALID.message,
    });
  }
}
