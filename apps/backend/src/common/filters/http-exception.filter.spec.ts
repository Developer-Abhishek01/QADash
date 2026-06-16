import { HttpExceptionFilter } from './http-exception.filter';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  const mockArgumentsHost = (): any => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return {
      switchToHttp: () => ({
        getResponse: () => ({ status, json }),
      }),
    };
  };

  it('formats HttpException response correctly', () => {
    const host = mockArgumentsHost();
    const response = host.switchToHttp().getResponse();
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        message: 'Not found',
        timestamp: expect.any(String),
      }),
    );
  });

  it('extracts message from object response', () => {
    const host = mockArgumentsHost();
    const response = host.switchToHttp().getResponse();
    const exception = new HttpException(
      { message: 'Validation failed', errors: { field: 'required' } },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, host);

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        errors: { field: 'required' },
      }),
    );
  });

  it('handles non-HttpException errors', () => {
    const host = mockArgumentsHost();
    const response = host.switchToHttp().getResponse();
    const error = new Error('Unexpected error');

    filter.catch(error, host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Unexpected error',
      }),
    );
  });

  it('handles unknown exception types', () => {
    const host = mockArgumentsHost();
    const response = host.switchToHttp().getResponse();

    filter.catch('string error', host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Internal server error',
      }),
    );
  });
});
