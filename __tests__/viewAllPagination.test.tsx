/**
 * View All screens: fetch exactly once on mount, then once per user scroll.
 */
import React from 'react';
import { FlatList } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useLoadMoreOnScroll } from '../src/hooks/useLoadMoreOnScroll';

jest.mock('../src/api/localGetApis', () => ({
  getInstitutionsAPI: jest.fn(),
}));
jest.mock('../src/api/localDeleteApis', () => ({ deleteInstitutionApi: jest.fn() }));
jest.mock('../src/context/navigationContext', () => ({ navigate: jest.fn() }));
jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({ colors: { background: '#fff', btnColor: '#f50', primary: '#f50' } }),
}));
jest.mock('../src/components/PageHeader', () => ({ PageHeader: () => null }));
jest.mock('../src/components/SchoolItem', () => ({ SchoolItem: () => null }));
jest.mock('../src/assets/components/AppUIComponents', () => ({ CustomButton: () => null }));
jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

const { getInstitutionsAPI } = jest.requireMock('../src/api/localGetApis');
const { ViewAllSchoolsScreen } = require('../src/screens/ViewAllSchoolsScreen');

const flush = () => act(async () => { await Promise.resolve(); });
const page = (n: number, size = 20) =>
  Array.from({ length: size }, (_, i) => ({ id: `p${n}-${i}` }));

describe('useLoadMoreOnScroll', () => {
  const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
  afterEach(() => {
    act(() => mounted.splice(0).forEach(r => r.unmount()));
  });
  const setup = (loadMore: jest.Mock) => {
    let props: ReturnType<typeof useLoadMoreOnScroll>;
    const Probe = () => {
      props = useLoadMoreOnScroll(loadMore);
      return null;
    };
    act(() => { mounted.push(ReactTestRenderer.create(<Probe />)); });
    return () => props!;
  };

  it('ignores onEndReached fired before the user scrolls (mount-time fire)', async () => {
    const loadMore = jest.fn();
    const get = setup(loadMore);
    await act(async () => { await get().onEndReached(); });
    expect(loadMore).not.toHaveBeenCalled();
  });

  it('loads once per scroll gesture', async () => {
    const loadMore = jest.fn();
    const get = setup(loadMore);
    get().onScrollBeginDrag();
    await act(async () => {
      await get().onEndReached();
      await get().onEndReached();
    });
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('never overlaps loads while one is in flight', async () => {
    let resolve!: () => void;
    // First load stays pending until we resolve it; later loads finish at once.
    const loadMore = jest
      .fn(() => Promise.resolve())
      .mockImplementationOnce(() => new Promise<void>(r => { resolve = r; }));
    const get = setup(loadMore);
    get().onScrollBeginDrag();
    const first = get().onEndReached();
    get().onScrollBeginDrag();
    await get().onEndReached();
    expect(loadMore).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(); await first; });
    get().onScrollBeginDrag();
    await act(async () => { await get().onEndReached(); });
    expect(loadMore).toHaveBeenCalledTimes(2);
  });
});

describe('ViewAllSchoolsScreen', () => {
  beforeEach(() => getInstitutionsAPI.mockReset());

  it('fetches page 1 exactly once on mount, then one page per scroll, then stops', async () => {
    getInstitutionsAPI
      .mockResolvedValueOnce(page(1))
      .mockResolvedValueOnce(page(2))
      .mockResolvedValueOnce(page(3, 5)); // short page = last page

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => { tree = ReactTestRenderer.create(<ViewAllSchoolsScreen />); });
    await flush();
    expect(getInstitutionsAPI).toHaveBeenCalledTimes(1);
    expect(getInstitutionsAPI).toHaveBeenLastCalledWith(1, 20);

    const list = () => tree.root.findByType(FlatList).props;

    // FlatList's spurious mount-time onEndReached must not load anything.
    await act(async () => { await list().onEndReached(); });
    expect(getInstitutionsAPI).toHaveBeenCalledTimes(1);

    // Scroll 1 -> page 2 (once, even if onEndReached fires repeatedly).
    list().onScrollBeginDrag();
    await act(async () => {
      await list().onEndReached();
      await list().onEndReached();
    });
    expect(getInstitutionsAPI).toHaveBeenCalledTimes(2);
    expect(getInstitutionsAPI).toHaveBeenLastCalledWith(2, 20);

    // Scroll 2 -> page 3 (short, so it is the last page).
    list().onScrollBeginDrag();
    await act(async () => { await list().onEndReached(); });
    expect(getInstitutionsAPI).toHaveBeenLastCalledWith(3, 20);
    expect(list().data).toHaveLength(45);

    // Scroll 3 -> nothing left to fetch.
    list().onScrollBeginDrag();
    await act(async () => { await list().onEndReached(); });
    expect(getInstitutionsAPI).toHaveBeenCalledTimes(3);

    act(() => tree.unmount());
    // First render lazily loads React Native's components, slow on Windows.
  }, 30000);
});
