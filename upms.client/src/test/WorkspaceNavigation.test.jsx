import {fireEvent,render,screen} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
import {WorkspaceNavigation} from '../../management/src/WorkspaceNavigation.jsx';
describe('workspace navigation',()=>{
 it('groups only supplied authorized entries and marks the current workspace',()=>{
  const go=vi.fn();render(<WorkspaceNavigation items={[["","Dashboard","grid"],["items","Items","box"],["reports","Reports","grid"]]} page="items" onNavigate={go}/>);
  expect(screen.getByRole('button',{name:'Items'}).getAttribute('aria-current')).toBe('page');
  expect(screen.queryByRole('button',{name:'Cheques'})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Reports'}));expect(go).toHaveBeenCalledWith('reports');
 });
 it('finds a workspace without changing navigation and explains an empty result',()=>{
  const go=vi.fn();render(<WorkspaceNavigation items={[["items","Items","box"],["reports","Reports","grid"]]} page="items" onNavigate={go}/>);
  fireEvent.change(screen.getByRole('searchbox'),{target:{value:'report'}});
  expect(screen.queryByRole('button',{name:'Items'})).toBeNull();expect(screen.getByRole('button',{name:'Reports'})).toBeTruthy();expect(go).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('searchbox'),{target:{value:'unavailable'}});expect(screen.getByRole('status').textContent).toContain('No matching workspace');
 });
});
