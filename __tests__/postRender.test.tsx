/**
 * Rendering regressions: a comment or post without author details must not
 * crash ("Cannot read property 'firstname' of null"), and the options sheet
 * must stay closed until asked for.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Modal, Text } from 'react-native';

jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-video', () => 'Video');
jest.mock('@react-native-clipboard/clipboard', () => ({ setString: jest.fn() }));
jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({
    colors: new Proxy({}, { get: () => '#888888' }),
  }),
}));
jest.mock('../src/components/UserAvatar', () => ({ UserAvatar: () => null }));
jest.mock('../src/components/UserIdentity', () => {
  const { Text: T } = require('react-native');
  return { UserIdentity: (p: any) => <T>{p.firstname}</T> };
});
jest.mock('../src/components/LogoutModal', () => ({ ActionModal: () => null }));
jest.mock('../src/components/LazyImage', () => ({ LazyImage: () => null }));
jest.mock('../src/components/LazyRotatingImages', () => ({ LazyRotatingImages: () => null }));
jest.mock('../src/api/localGetApis', () => ({ searchGifsAPI: jest.fn() }));
jest.mock('../src/api/localPostApis', () => ({}));
jest.mock('../src/api/localPatchApis', () => ({}));
jest.mock('../src/context/EventContext', () => ({
  useAppDataContext: () => ({
    currentUser: { uid: 'me' },
    patchPost: jest.fn(),
    incrementShareCount: jest.fn(),
    handleDeletePost: jest.fn(),
    isDeletingPost: false,
  }),
}));

const { CommentItem } = require('../src/components/CommentSection');
const { PostCard } = require('../src/components/PostCard');

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAllByType(Text).map(t => [].concat(t.props.children).join(''));

const noop = () => {};

it('renders a comment whose author is missing (the PostDetail crash)', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <CommentItem
        comment={{
          commentId: 'c1', postId: 'P1', parentId: null, type: 'text', text: 'Hello there',
          likes: [], likesCount: 0, createdAt: null, author: null, replyCount: 0, replies: [],
        }}
        onLike={noop} onReply={noop} onRetry={noop} onDiscard={noop}
      />,
    );
  });
  expect(texts(tree).some(t => t.includes('iCampus user'))).toBe(true);
});

it('renders a legacy post with no author, and keeps the options sheet closed', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <PostCard
        post={{ postId: 'P1', content: 'Campus life', postAuthorsDetails: null, repostersDetails: [], likes: [], bookmarks: [] }}
        isVisible
      />,
    );
  });
  expect(texts(tree)).toContain('iCampus');
  // The sheet used to be bound to the card's visibility, covering the screen.
  expect(tree.root.findByType(Modal).props.visible).toBe(false);
});

it('shows who reposted and the school-memo badge', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <PostCard
        post={{
          postId: 'P2', content: 'Exams Monday', audience: 'school',
          postAuthorsDetails: { uid: 'A', firstname: 'Ada', lastname: 'O', tier: 'free', profilePic: [] },
          repostersDetails: [{ uid: 'B', firstname: 'Bola', lastname: 'K', tier: 'free', profilePic: [] }, { uid: 'C', firstname: 'C', tier: 'free', profilePic: [] }],
          featuredReposter: { uid: 'B', firstname: 'Bola', lastname: 'K', tier: 'free', profilePic: [] },
          likes: [], bookmarks: [],
        }}
        isVisible
      />,
    );
  });
  const all = texts(tree).join(' | ');
  expect(all).toContain('Bola K');
  expect(all).toContain('and 1 other reposted');
  expect(all).toContain('School memo');
});
