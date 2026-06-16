import { TransformInterceptor } from './transform.interceptor';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  const mockExecutionContext = (): any => ({
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', url: '/api/test' }),
      getResponse: () => ({ statusCode: 200, get: () => '100' }),
    }),
  });

  it('wraps response in success object', (done) => {
    const context = mockExecutionContext();
    const next = { handle: () => of({ id: '1', name: 'test' }) };

    interceptor.intercept(context, next).subscribe((result) => {
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data', { id: '1', name: 'test' });
      expect(result).toHaveProperty('timestamp');
      done();
    });
  });

  it('preserves data shape', (done) => {
    const context = mockExecutionContext();
    const data = [{ id: '1' }, { id: '2' }];
    const next = { handle: () => of(data) };

    interceptor.intercept(context, next).subscribe((result) => {
      expect(result.data).toEqual(data);
      done();
    });
  });

  it('handles empty data', (done) => {
    const context = mockExecutionContext();
    const next = { handle: () => of(null) };

    interceptor.intercept(context, next).subscribe((result) => {
      expect(result.data).toBeNull();
      done();
    });
  });
});
