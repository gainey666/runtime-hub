function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].qty;
  }
  return total;
}

function applyDiscount(total, discountPercent) {
  const discount = total * discountPercent / 100;
  return total - discount;
}

function formatPrice(amount) {
  return '$' + amount.toFixed(2);
}

function applyTax(amount, taxRate) {
  const taxAmount = amount * taxRate;
  return Math.round((amount + taxAmount) * 100) / 100;
}

function getOrderSummary(items, discountPercent) {
  const total = calculateTotal(items);
  const discounted = applyDiscount(total, discountPercent);
  return {
    original: formatPrice(total),
    final: formatPrice(discounted),
    savings: formatPrice(total - discounted)
  };
}

module.exports = { calculateTotal, applyDiscount, formatPrice, applyTax, getOrderSummary };
