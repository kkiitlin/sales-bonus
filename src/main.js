/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // Расчет выручки от операции: sale_price * quantity * (1 - discount/100)
  const { discount, sale_price, quantity } = purchase;
  const discountFactor = 1 - discount / 100;
  return sale_price * quantity * discountFactor;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве (0 — лучший)
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  const { profit } = seller;

  if (index === 0) {
    return profit * 0.15;
  }
  // Второе и третье место (index === 1 или index === 2)
  if (index === 1 || index === 2) {
    return profit * 0.1;
  }
  // Последнее место (index === total - 1)
  if (index === total - 1) {
    return 0;
  }
  // Все остальные продавцы
  return profit * 0.05;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // Проверка входных данных
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    data.sellers.length === 0 ||
    !Array.isArray(data.products) ||
    data.products.length === 0 ||
    !Array.isArray(data.purchase_records) ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }

  // Проверка наличия опций
  if (!options || typeof options !== "object") {
    throw new Error("Отсутствуют опции");
  }
  const { calculateRevenue, calculateBonus } = options;
  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error("Чего-то не хватает");
  }

  // Подготовка промежуточных данных для сбора статистики
  const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  // Индексация продавцов и товаров для быстрого доступа
  const sellerIndex = Object.fromEntries(
    sellerStats.map((seller) => [seller.id, seller]),
  );
  const productIndex = Object.fromEntries(
    data.products.map((product) => [product.sku, product]),
  );

  // Расчет выручки и прибыли для каждого продавца
  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];
    // Увеличить количество продаж
    seller.sales_count += 1;
    // Увеличить общую сумму выручки всех продаж
    seller.revenue += record.total_amount;

    // Расчёт для каждого товара в чеке
    record.items.forEach((item) => {
      const product = productIndex[item.sku];
      if (!product) return; // защита от отсутствующего товара

      // Себестоимость (cost) товара = product.purchase_price * количество
      const cost = product.purchase_price * item.quantity;
      // Выручка с учётом скидки через функцию calculateRevenue
      const revenue = calculateRevenue(item, product);
      // Прибыль: выручка минус себестоимость
      const profit = revenue - cost;
      // Увеличить общую накопленную прибыль у продавца
      seller.profit += profit;

      // Учёт количества проданных товаров
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity;
    });
  });

  // Сортировка продавцов по прибыли (по убыванию)
  sellerStats.sort((a, b) => b.profit - a.profit);

  // Назначение премий на основе ранжирования и формирование топ-10 товаров
  const totalSellers = sellerStats.length;
  sellerStats.forEach((seller, index) => {
    // Бонус
    seller.bonus = calculateBonus(index, totalSellers, seller);

    // Топ-10 продуктов
    const productsArray = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
    seller.top_products = productsArray;
  });

  // Подготовка итоговой коллекции с нужными полями
  return sellerStats.map((seller) => ({
    seller_id: seller.id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2),
  }));
}
