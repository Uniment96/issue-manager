jest.mock('../src/services/firebase/config', () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue('mock-token') } },
}));

// Load client to trigger interceptor registration (must be after mocks)
const axios = require('axios');
require('../src/services/api/client');

// Capture interceptors once — clearAllMocks would erase mock.results
const axiosInstance = axios.create.mock.results[0]?.value;
const requestInterceptor: ((config: any) => Promise<any>) | undefined =
  axiosInstance?.interceptors.request.use.mock.calls[0]?.[0];
const responseSuccessHandler: ((res: any) => any) | undefined =
  axiosInstance?.interceptors.response.use.mock.calls[0]?.[0];
const responseErrorHandler: ((err: any) => Promise<never>) | undefined =
  axiosInstance?.interceptors.response.use.mock.calls[0]?.[1];

describe('apiClient', () => {
  describe('axios instance creation', () => {
    it('calls axios.create once', () => {
      expect(axios.create).toHaveBeenCalledTimes(1);
    });

    it('creates instance with correct timeout and content-type header', () => {
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 10_000,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('registers a request interceptor', () => {
      expect(requestInterceptor).toBeDefined();
    });

    it('registers response success and error handlers', () => {
      expect(responseSuccessHandler).toBeDefined();
      expect(responseErrorHandler).toBeDefined();
    });
  });

  describe('request interceptor (token attachment)', () => {
    it('attaches Bearer token when currentUser is present', async () => {
      const config = { headers: {} as Record<string, string> };
      const result = await requestInterceptor!(config);
      expect(result.headers.Authorization).toBe('Bearer mock-token');
    });

    it('proceeds without Authorization when currentUser is null', async () => {
      const { auth } = require('../src/services/firebase/config');
      const saved = auth.currentUser;
      auth.currentUser = null;

      const config = { headers: {} as Record<string, string> };
      const result = await requestInterceptor!(config);
      expect(result.headers.Authorization).toBeUndefined();

      auth.currentUser = saved;
    });

    it('proceeds without Authorization when getIdToken throws', async () => {
      const { auth } = require('../src/services/firebase/config');
      auth.currentUser.getIdToken.mockRejectedValueOnce(new Error('Token error'));

      const config = { headers: {} as Record<string, string> };
      await expect(requestInterceptor!(config)).resolves.toBeDefined();
    });
  });

  describe('response success handler', () => {
    it('passes the response through unchanged', () => {
      const res = { data: { id: '1' }, status: 200 };
      expect(responseSuccessHandler!(res)).toBe(res);
    });
  });

  describe('response error handler (normalisation)', () => {
    it('extracts message from response data', async () => {
      const err = { response: { data: { message: 'Not Found' } }, message: 'Request failed' };
      await expect(responseErrorHandler!(err)).rejects.toThrow('Not Found');
    });

    it('falls back to error.message when response data has no message', async () => {
      const err = { response: { data: {} }, message: 'Network Error' };
      await expect(responseErrorHandler!(err)).rejects.toThrow('Network Error');
    });

    it('uses generic fallback when no message available', async () => {
      await expect(responseErrorHandler!({})).rejects.toThrow('An unexpected error occurred');
    });
  });
});
