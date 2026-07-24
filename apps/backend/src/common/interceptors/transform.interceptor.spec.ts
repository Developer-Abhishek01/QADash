import { TransformInterceptor } from './transform.interceptor';
import { of, lastValueFrom } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  const mockExecutionContext = () => ({
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', url: '/api/test' }),
      getResponse: () => ({ statusCode: 200, get: () => '100' }),
    }),
  });

  it('wraps response in success object', async () => {
    const context = mockExecutionContext();
    const next = { handle: () => of({ id: '1', name: 'test' }) };

    const result = await lastValueFrom(interceptor.intercept(context, next));
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('data', { id: '1', name: 'test' });
    expect(result).toHaveProperty('timestamp');
  });

  it('preserves data shape', async () => {
    const context = mockExecutionContext();
    const data = [{ id: '1' }, { id: '2' }];
    const next = { handle: () => of(data) };

    const result = await lastValueFrom(interceptor.intercept(context, next));
    expect(result.data).toEqual(data);
  });

  it('handles empty data', async () => {
    const context = mockExecutionContext();
    const next = { handle: () => of(null) };

    const result = await lastValueFrom(interceptor.intercept(context, next));
    expect(result.data).toBeNull();
  });
});
