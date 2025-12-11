import { utilEnv } from './util-env.js';

describe('utilEnv', () => {
  it('should work', () => {
    expect(utilEnv()).toEqual('util-env');
  });
});
