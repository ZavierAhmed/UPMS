import {describe,it,expect} from 'vitest';
import {managementResponse} from '../management/src/managementResponse.js';

describe('management response handling',()=>{
  it('preserves successful API responses',async()=>{
    await expect(managementResponse({status:200,json:async()=>({csrfToken:'token'})})).resolves.toEqual({csrfToken:'token'});
  });
  it('supports empty logout and password-change responses',async()=>{
    await expect(managementResponse({status:204})).resolves.toEqual({});
  });
  it('replaces a text proxy error with a useful message without exposing response contents',async()=>{
    await expect(managementResponse({status:502,json:async()=>{throw new SyntaxError('Unexpected token T: The server secret');}}))
      .rejects.toThrow('The local sign-in service is unavailable.');
  });
});
