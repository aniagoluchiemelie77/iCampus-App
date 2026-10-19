/**
 * Regression: blocking showed "User Blocked", then the profile refetched
 * (because the Redux user changed), got a 403, toasted an error and fell
 * back to "User not found".
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockSearch = jest.fn();
const mockToggleBlock = jest.fn();
const mockToggleFollow = jest.fn();
const mockDispatch = jest.fn();
jest.mock('../src/api/localGetApis.ts', () => ({ searchUserProfile: (...a: any[]) => mockSearch(...a) }));
jest.mock('../src/api/localPostApis.ts', () => ({
  toggleBlockUser: (...a: any[]) => mockToggleBlock(...a),
  toggleFollowUser: (...a: any[]) => mockToggleFollow(...a),
}));
jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch }));
jest.mock('../src/context/UserSlice.ts', () => ({ updateBlockedUsers: (p: any) => ({ type: 'blocked', payload: p }) }));
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
  [mockSearch, mockToggleBlock, mockToggleFollow, mockDispatch, mockToast].forEach(m => m.mockReset());
});

it('stays on the blocked state after blocking, even when the Redux user updates', async () => {
  mockSearch.mockResolvedValue({ status: 'ok', data: profile });
  mockToggleBlock.mockResolvedValue({ success: true, action: 'blocked' });
  const { ref, rerender } = mount({ uid: 'ME', blockedUsers: [] });
  await act(async () => { await flush(); });
  expect(ref.current.status).toBe('ready');

  await act(async () => {
    await ref.current.handleBlockToggle();
  });
  expect(ref.current.status).toBe('blocked');
  expect(ref.current.blockedByViewer).toBe(true);

  // Redux hands the screen a new user object with the updated block list.
  rerender({ uid: 'ME', blockedUsers: ['BOB'] });
  await act(async () => { await flush(); });
  expect(mockSearch).toHaveBeenCalledTimes(1); // no refetch
  expect(ref.current.status).toBe('blocked');
});

it('unblocking refetches and shows the profile again', async () => {
  mockSearch
    .mockResolvedValueOnce({ status: 'blocked', blockedByViewer: true, targetUid: 'BOB' })
    .mockResolvedValueOnce({ status: 'ok', data: profile });
  mockToggleBlock.mockResolvedValue({ success: true, action: 'unblocked' });
  const { ref } = mount({ uid: 'ME', blockedUsers: ['BOB'] });
  await act(async () => { await flush(); });
  expect([ref.current.status, ref.current.blockedByViewer]).toEqual(['blocked', true]);
  await act(async () => {
    await ref.current.handleBlockToggle();
    await flush();
  });
  expect(mockToggleBlock).toHaveBeenCalledWith('BOB');
  expect(ref.current.status).toBe('ready');
});

it('blocked BY the other user is not offered an unblock', async () => {
  mockSearch.mockResolvedValue({ status: 'blocked', blockedByViewer: false, targetUid: null });
  const { ref } = mount({ uid: 'ME' });
  await act(async () => { await flush(); });
  expect([ref.current.status, ref.current.blockedByViewer]).toEqual(['blocked', false]);
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
