import { ApiResponse } from '../interfaces/api-response.interface';

export class ApiResponseUtil {
  static success<T>(message: string, data?: T): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
    };
  }

  static error(message: string, errors?: string[]): ApiResponse<null> {
    return {
      success: false,
      message,
      errors,
    };
  }
}