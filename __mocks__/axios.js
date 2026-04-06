const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn((fn) => fn) },
    response: { use: jest.fn((fn) => fn) },
  },
};

const axios = {
  create: jest.fn(() => mockAxiosInstance),
  ...mockAxiosInstance,
};

module.exports = axios;
module.exports.default = axios;
