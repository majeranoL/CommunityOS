import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockHost: any;

  beforeEach(() => {
    filter = new PrismaExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => ({ method: 'GET', url: '/api/test' }),
      }),
    };
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('maps P2002 to 409 Conflict with success:false', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['email'] },
    });

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, statusCode: 409 }),
    );
    expect(mockResponse.json.mock.calls[0][0].message).toContain('email');
  });

  it('maps P2025 to 404 Not Found', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '6.19.3',
    });

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, statusCode: 404, message: 'Record not found.' }),
    );
  });

  it('passes through HttpException with success:false added', () => {
    filter.catch(new NotFoundException('User not found.'), mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'User not found.' }),
    );
  });
});
