const { calculateTotal, applyDiscount, applyTax } = require('../scratch/buggy');

describe('Buggy Functions', () => {
  test('calculateTotal with valid array of items', () => {
    const items = [
      { price: 10, qty: 2 },
      { price: 5, qty: 3 },
      { price: 20, qty: 1 }
    ];
    const result = calculateTotal(items);
    expect(result).toBe(10*2 + 5*3 + 20*1); // 20 + 15 + 20 = 55
  });

  test('applyDiscount at 20% discount on $100', () => {
    const result = applyDiscount(100, 20);
    expect(result).toBe(80); // 100 - (100 * 0.20) = 80
  });

  test('applyTax at 8% on $50', () => {
    const result = applyTax(50, 0.08);
    expect(result).toBe(54); // 50 + (50 * 0.08) = 54
  });
});
