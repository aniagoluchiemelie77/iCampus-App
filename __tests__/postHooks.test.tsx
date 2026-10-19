/**
 * usePostInteractions (optimistic like/bookmark/repost/vote with rollback)
 * and usePostComments (paging, replies, optimistic send + retry, likes).
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockApi = {
  toggleLikeAPI: jest.fn(),
  createRepostAPI: jest.fn(),
  toggleBookmarkAPI: jest.fn(),
  castPollVoteAPI: jest.fn(),
  fetchPostCommentsAPI: jest.fn(),
  addCommentAPI: jest.fn(),
  toggleCommentLikeAPI: jest.fn(),
};
jest.mock('../src/api/localPostApis', () => ({
  toggleLikeAPI: (...a: any[]) => mockApi.toggleLikeAPI(...a),
  createRepostAPI: (...a: any[]) => mockApi.createRepostAPI(...a),
  addCommentAPI: (...a: any[]) => mockApi.addCommentAPI(...a),
  toggleCommentLikeAPI: (...a: any[]) => mockApi.toggleCommentLikeAPI(...a),
}));
jest.mock('../src/api/localPatchApis', () => ({
  toggleBookmarkAPI: (...a: any[]) => mockApi.toggleBookmarkAPI(...a),
  castPollVoteAPI: (...a: any[]) => mockApi.castPollVoteAPI(...a),
}));
jest.mock('../src/api/localGetApis', () => ({
  fetchPostCommentsAPI: (...a: any[]) => mockApi.fetchPostCommentsAPI(...a),
}));
jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));
jest.mock('../src/utils/dateFormatter', () => ({ parseFirestoreDate: (v: any) => new Date(v) }));

const mockPatchPost = jest.fn();
const mockCtx = {
  currentUser: { uid: 'me', firstname: 'Me', lastname: 'User', username: 'me', tier: 'free', profilePic: [] },
  patchPost: mockPatchPost,
  incrementShareCount: jest.fn(),
};
jest.mock('../src/context/EventContext', () => ({ useAppDataContext: () => mockCtx }));

const { usePostInteractions } = require('../src/hooks/usePostInteractions');
const { usePostComments } = require('../src/hooks/usePostComments');

const flush = () => new Promise(r => setTimeout(r, 0));

function renderHook<T>(hook: () => T) {
  const ref: { current: T } = { current: undefined as any };
  const Probe = () => {
    ref.current = hook();
    return null;
  };
  act(() => {
    ReactTestRenderer.create(<Probe />);
  });
  return ref;
}

const basePost = () => ({
  postId: 'P1',
  content: 'hi',
  likes: ['x'],
  bookmarks: [],
  repostersDetails: [],
  featuredReposter: null,
  poll: {
    totalVotes: 1,
    options: [
      { optionId: 'a', text: 'A', votes: ['x'] },
      { optionId: 'b', text: 'B', votes: [] },
    ],
  },
});

beforeEach(() => {
  Object.values(mockApi).forEach(fn => fn.mockReset());
  mockPatchPost.mockReset();
});

describe('usePostInteractions', () => {
  it('likes optimistically, then adopts the server list', async () => {
    let resolve: (v: any) => void = () => {};
    mockApi.toggleLikeAPI.mockReturnValue(new Promise(r => (resolve = r)));
    const post = basePost();
    const h = renderHook(() => usePostInteractions(post));
    act(() => {
      h.current.toggleLike();
    });
    expect(h.current.isLiked).toBe(true);
    expect(h.current.likesCount).toBe(2);
    expect(mockPatchPost).toHaveBeenCalledWith('P1', expect.any(Function));
    await act(async () => {
      resolve({ success: true, likes: ['x', 'me', 'y'] });
      await flush();
    });
    expect(h.current.likesCount).toBe(3);
  });

  it('rolls a failed like back and ignores double taps while in flight', async () => {
    let resolve: (v: any) => void = () => {};
    mockApi.toggleLikeAPI.mockReturnValue(new Promise(r => (resolve = r)));
    const post = basePost();
    const h = renderHook(() => usePostInteractions(post));
    act(() => {
      h.current.toggleLike();
      h.current.toggleLike();
    });
    expect(mockApi.toggleLikeAPI).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve({ success: false, message: 'nope' });
      await flush();
    });
    expect(h.current.isLiked).toBe(false);
    expect(h.current.likesCount).toBe(1);
  });

  it('repost adds me as reposter; failure restores the previous state', async () => {
    mockApi.createRepostAPI.mockResolvedValue({ success: false, message: 'x' });
    const post = basePost();
    const h = renderHook(() => usePostInteractions(post));
    let pending: Promise<void>;
    act(() => {
      pending = h.current.toggleRepost();
    });
    expect(h.current.isReposted).toBe(true);
    expect(h.current.post.featuredReposter.uid).toBe('me');
    await act(async () => {
      await pending;
    });
    expect(h.current.isReposted).toBe(false);
    expect(h.current.post.featuredReposter).toBeNull();
  });

  it('votes once, using the poll the server returns', async () => {
    const serverPoll = { totalVotes: 2, options: [{ optionId: 'a', votes: ['x'] }, { optionId: 'b', votes: ['me'] }] };
    mockApi.castPollVoteAPI.mockResolvedValue({ success: true, poll: serverPoll });
    const post = basePost();
    const h = renderHook(() => usePostInteractions(post));
    await act(async () => {
      await h.current.vote('b');
    });
    expect(mockApi.castPollVoteAPI).toHaveBeenCalledWith('P1', 'b');
    expect(h.current.hasVoted).toBe(true);
    expect(h.current.post.poll).toEqual(serverPoll);
    await act(async () => {
      await h.current.vote('a');
    });
    expect(mockApi.castPollVoteAPI).toHaveBeenCalledTimes(1);
  });
});

const comment = (id: string, extra: any = {}) => ({
  commentId: id,
  postId: 'P1',
  parentId: null,
  type: 'text',
  text: id,
  likes: [],
  likesCount: 0,
  createdAt: '2026-10-01T00:00:00Z',
  author: { uid: 'u', firstname: 'U', profilePic: [] },
  replyCount: 0,
  replies: [],
  ...extra,
});

describe('usePostComments', () => {
  it('pages without duplicates and syncs the post comment count', async () => {
    mockApi.fetchPostCommentsAPI
      .mockResolvedValueOnce({ success: true, comments: [comment('c1'), comment('c2')], nextCursor: 'k2', total: 3 })
      .mockResolvedValueOnce({ success: true, comments: [comment('c2'), comment('c3')], nextCursor: null });
    const h = renderHook(() => usePostComments('P1'));
    await act(async () => {
      await flush();
    });
    expect(h.current.comments.map((c: any) => c.commentId)).toEqual(['c1', 'c2']);
    expect(mockPatchPost).toHaveBeenCalled();
    await act(async () => {
      await h.current.loadMore();
    });
    expect(h.current.comments.map((c: any) => c.commentId)).toEqual(['c1', 'c2', 'c3']);
    expect(h.current.hasMore).toBe(false);
  });

  it('loads replies, replacing the 2-reply preview', async () => {
    const root = comment('r', { replyCount: 3, replies: [comment('a', { parentId: 'r' }), comment('b', { parentId: 'r' })] });
    mockApi.fetchPostCommentsAPI
      .mockResolvedValueOnce({ success: true, comments: [root], nextCursor: null, total: 4 })
      .mockResolvedValueOnce({
        success: true,
        comments: ['a', 'b', 'c'].map(id => comment(id, { parentId: 'r' })),
        nextCursor: null,
      });
    const h = renderHook(() => usePostComments('P1'));
    await act(async () => {
      await flush();
    });
    await act(async () => {
      await h.current.loadReplies('r');
    });
    expect(h.current.comments[0].replies.map((c: any) => c.commentId)).toEqual(['a', 'b', 'c']);
    expect(h.current.replyState.r.loadedAll).toBe(true);
  });

  it('sends optimistically, marks failures, and retries in place', async () => {
    mockApi.fetchPostCommentsAPI.mockResolvedValueOnce({ success: true, comments: [comment('c1')], nextCursor: null, total: 1 });
    mockApi.addCommentAPI
      .mockResolvedValueOnce({ success: false, message: 'offline' })
      .mockResolvedValueOnce({ success: true, comment: comment('real', { text: 'hello' }), commentsCount: 2 });
    const h = renderHook(() => usePostComments('P1'));
    await act(async () => {
      await flush();
    });
    let ok: boolean | undefined;
    await act(async () => {
      ok = await h.current.send({ type: 'text', text: 'hello' });
    });
    expect(ok).toBe(false);
    const failed = h.current.comments[0];
    expect(failed.failed).toBe(true);
    expect(h.current.comments).toHaveLength(2);
    await act(async () => {
      await h.current.retry(failed);
    });
    expect(h.current.comments.map((c: any) => c.commentId)).toEqual(['real', 'c1']);
    expect(h.current.comments[0].failed).toBeFalsy();
  });

  it('likes a comment and keeps the server likes', async () => {
    mockApi.fetchPostCommentsAPI.mockResolvedValueOnce({ success: true, comments: [comment('c1')], nextCursor: null, total: 1 });
    mockApi.toggleCommentLikeAPI.mockResolvedValue({ success: true, likes: ['me', 'z'] });
    const h = renderHook(() => usePostComments('P1'));
    await act(async () => {
      await flush();
    });
    await act(async () => {
      await h.current.toggleLike(h.current.comments[0]);
    });
    expect(mockApi.toggleCommentLikeAPI).toHaveBeenCalledWith('P1', 'c1');
    expect(h.current.comments[0].likesCount).toBe(2);
  });
});
