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
 * "Use a JPEG, PNG or WebP image up to 5 MB." (SRS 3.2.12.5). Other errors keep their own response.
 */
@Catch(HttpException)
export class AvatarUploadFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (
      exception instanceof AppException ||
      ![400, 413].includes(exception.getStatus())
    ) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }
    response.status(ERR.AVATAR_INVALID.status).json({
      statusCode: ERR.AVATAR_INVALID.status,
      code: 'AVATAR_INVALID',
      message: ERR.AVATAR_INVALID.message,
    });
  }
}
