/**
 * useProfileData: follow rollback, and no refetch when the Redux user object
 * changes for unrelated reasons.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockSearch = jest.fn();
const mockToggleFollow = jest.fn();
jest.mock('../src/api/localGetApis.ts', () => ({ searchUserProfile: (...a: any[]) => mockSearch(...a) }));
jest.mock('../src/api/localPostApis.ts', () => ({
  toggleFollowUser: (...a: any[]) => mockToggleFollow(...a),
}));
const mockToast = jest.fn();
jest.mock('react-native-toast-message', () => ({ show: (...a: any[]) => mockToast(...a) }));

const { useProfileData } = require('../src/hooks/useProfileData');

const flush = () => new Promise(r => setTimeout(r, 0));
const profile = { uid: 'BOB', firstname: 'Bob', isFollowing: false, followersCount: 4 };

function mount(viewer: any) {
  const ref: { current: any } = { current: undefined };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  const Probe = ({ user }: { user: any }) => {
    const h = useProfileData('bob_prof', user);
    ref.current = h;
    React.useEffect(() => {
      h.fetchProfile();
    }, [h.fetchProfile]);
    return null;
  };
  act(() => {
    tree = ReactTestRenderer.create(<Probe user={viewer} />);
  });
  return { ref, rerender: (u: any) => act(() => tree.update(<Probe user={u} />)) };
}

beforeEach(() => {
  [mockSearch, mockToggleFollow, mockToast].forEach(m => m.mockReset());
});

it('does not refetch when the Redux user object changes', async () => {
  mockSearch.mockResolvedValue({ status: 'ok', data: profile });
  const { ref, rerender } = mount({ uid: 'ME', firstname: 'Me' });
  await act(async () => { await flush(); });
  expect(ref.current.status).toBe('ready');

  rerender({ uid: 'ME', firstname: 'Me (edited)' });
  await act(async () => { await flush(); });
  expect(mockSearch).toHaveBeenCalledTimes(1);
  expect(ref.current.status).toBe('ready');
});

it('a missing profile is shown as not found without an error toast', async () => {
  mockSearch.mockResolvedValue({ status: 'notFound' });
  const { ref } = mount({ uid: 'ME' });
  await act(async () => { await flush(); });
  expect(ref.current.status).toBe('notFound');
  expect(mockToast).not.toHaveBeenCalled();
});

it('a failed follow rolls back instead of showing success', async () => {
  mockSearch.mockResolvedValue({ status: 'ok', data: profile });
  mockToggleFollow.mockResolvedValue({ success: false, message: 'nope' });
  const { ref } = mount({ uid: 'ME' });
  await act(async () => { await flush(); });
  await act(async () => {
    await ref.current.handleFollowToggle();
  });
  expect(ref.current.isFollowing).toBe(false);
  expect(ref.current.profileData.followersCount).toBe(4);
  expect(mockToast).toHaveBeenCalledTimes(1);
  expect(mockToast.mock.calls[0][0].type).toBe('error');
});
