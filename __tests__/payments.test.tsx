/**
 * Payment sheet: shows the server's price, only reports success after the
 * server verified the payment, and never treats a cancel as paid.
 * Currency conversion: a code-based conversion (NGN -> GHS) actually converts.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';

const mockEnv = { FLUTTERWAVE_PUBLIC_KEY: 'FLWPUBK_TEST' };
jest.mock('../src/config/payments', () => ({ getFlutterwavePublicKey: () => mockEnv.FLUTTERWAVE_PUBLIC_KEY }));
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));
jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#888888' }) }),
}));
jest.mock('../src/assets/components/AppUIComponents', () => {
  const { Text: T, TouchableOpacity: B } = require('react-native');
  return {
    CustomButton: (p: any) => (
      <B onPress={p.onPress} testID={p.title}>
        <T>{p.title}</T>
      </B>
    ),
  };
});
// Captures what the sheet hands to Flutterwave and lets a test "finish" it.
let mockFlw: any = null;
jest.mock('flutterwave-react-native', () => ({
  PayWithFlutterwave: (p: any) => {
    mockFlw = p;
    return p.customButton({ onPress: () => {}, disabled: false });
  },
}));
const mockCreate = jest.fn();
const mockConfirm = jest.fn();
jest.mock('../src/api/localPostApis', () => ({
  createPaymentIntentAPI: (...a: any[]) => mockCreate(...a),
  confirmPaymentAPI: (...a: any[]) => mockConfirm(...a),
}));
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: async (k: string) => mockStorage[k] ?? null,
  setItem: async (k: string, v: string) => {
    mockStorage[k] = v;
  },
}));
jest.mock('axios', () => ({
  get: async () => ({ data: { conversion_rates: { USD: 1, NGN: 1500, GHS: 15 } } }),
}));
jest.mock('crypto-js', () => ({}));

const { FlutterwavePaySheet } = require('../src/components/FlutterwavePaySheet');
const { useConvertedCurrency } = require('../src/hooks/useCurrencyConverter');

const flush = () => new Promise(r => setTimeout(r, 0));
const intent = {
  success: true,
  txRef: 'ICP-EXC-1',
  amount: 2250,
  currency: 'NGN',
  title: 'Extra lecture exception',
  customer: { email: 'a@b.c', name: 'A' },
};
const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAllByType(Text).map(t => [].concat(t.props.children).join(''));

const mountSheet = (onPaid = jest.fn()) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <FlutterwavePaySheet
        visible
        onClose={jest.fn()}
        request={{ purpose: 'exception' }}
        title="Buy an extra exception"
        onPaid={onPaid}
      />,
    );
  });
  return { tree, onPaid };
};

beforeEach(() => {
  mockCreate.mockReset();
  mockConfirm.mockReset();
  mockFlw = null;
  mockEnv.FLUTTERWAVE_PUBLIC_KEY = 'FLWPUBK_TEST';
});

it('charges exactly what the server priced', async () => {
  mockCreate.mockResolvedValue(intent);
  const { tree } = mountSheet();
  await act(async () => { await flush(); });
  expect(mockCreate).toHaveBeenCalledWith({ purpose: 'exception' });
  expect(mockFlw.options).toMatchObject({ tx_ref: 'ICP-EXC-1', amount: 2250, currency: 'NGN', authorization: 'FLWPUBK_TEST' });
  expect(texts(tree)).toContain('Pay ₦2,250.00');
});

it('reports success only after the server confirms', async () => {
  mockCreate.mockResolvedValue(intent);
  mockConfirm.mockResolvedValue({ success: true, purpose: 'exception', exceptionCredits: 1 });
  const { onPaid } = mountSheet();
  await act(async () => { await flush(); });
  await act(async () => {
    mockFlw.onRedirect({ status: 'successful', transaction_id: '9001', tx_ref: 'ICP-EXC-1' });
    await flush();
  });
  expect(mockConfirm).toHaveBeenCalledWith('ICP-EXC-1', '9001');
  expect(onPaid).toHaveBeenCalledWith(expect.objectContaining({ exceptionCredits: 1 }));
});

it('a cancelled checkout is not treated as paid and gets a fresh reference', async () => {
  mockCreate.mockResolvedValueOnce(intent).mockResolvedValueOnce({ ...intent, txRef: 'ICP-EXC-2' });
  const { onPaid } = mountSheet();
  await act(async () => { await flush(); });
  await act(async () => {
    mockFlw.onRedirect({ status: 'cancelled', tx_ref: 'ICP-EXC-1' });
    await flush();
  });
  expect(mockConfirm).not.toHaveBeenCalled();
  expect(onPaid).not.toHaveBeenCalled();
  expect(mockFlw.options.tx_ref).toBe('ICP-EXC-2');
});

it('shows the server refusal instead of succeeding', async () => {
  mockCreate.mockResolvedValue(intent);
  mockConfirm.mockResolvedValue({ success: false, status: 409, message: 'Sold out. Your payment is being refunded.' });
  const { tree, onPaid } = mountSheet();
  await act(async () => { await flush(); });
  await act(async () => {
    mockFlw.onRedirect({ status: 'successful', transaction_id: '9002', tx_ref: 'ICP-EXC-1' });
    await flush();
  });
  expect(onPaid).not.toHaveBeenCalled();
  expect(texts(tree)).toContain('Sold out. Your payment is being refunded.');
});

it('without the public key it says payments are not set up and asks nothing', async () => {
  mockEnv.FLUTTERWAVE_PUBLIC_KEY = '';
  const { tree } = mountSheet();
  await act(async () => { await flush(); });
  expect(mockCreate).not.toHaveBeenCalled();
  expect(texts(tree).join(' ')).toMatch(/aren't set up yet/);
});

it('converts between currency codes (NGN -> GHS)', async () => {
  let value: number | undefined;
  const Probe = () => {
    value = useConvertedCurrency(3000, 'NGN', 'Ghana').convertedValue;
    return null;
  };
  await act(async () => {
    ReactTestRenderer.create(<Probe />);
    await flush();
    await flush();
  });
  expect(value).toBe(30);
});

// Keep TouchableOpacity referenced for the mocked button.
void TouchableOpacity;
