import { CATEGORY_ACCESS, TAB_TO_CATEGORY } from '../src/constants/inAppConstants';

describe('admin dashboard categories', () => {
  it('maps the Financial tab to the finance notification category', () => {
    expect(TAB_TO_CATEGORY.Financial).toBe('finance');
  });

  it('limits Financial visibility to finance administrators', () => {
    expect(CATEGORY_ACCESS.Financial).toEqual(['super_admin', 'finance']);
  });
});
