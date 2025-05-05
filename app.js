// Конфигурация (для GitHub Pages можно оставить пустым или использовать ваш webhook при необходимости)
const BX_WEBHOOK = ''; // Не используется в автономном режиме
const CATALOG_ID = 24;
const SMART_PROCESS_ID = 1040;

// DOM элементы
const hotelNameEl = document.getElementById('hotelName');
const hotelDescEl = document.getElementById('hotelDescription');
const productSearchInput = document.getElementById('productSearch');
const productResultsContainer = document.getElementById('productResults');
const calculateBtn = document.getElementById('calculateBtn');
const totalAmountEl = document.getElementById('totalAmount');
const currencyEl = document.getElementById('currency');
const addProductForm = document.getElementById('addProductForm');
const notificationEl = document.getElementById('notification');

// DAYS
const daysContainer = document.getElementById('daysContainer');
const addDayBtn = document.getElementById('addDayBtn');
const totalDaysAmountEl = document.getElementById('totalDaysAmount');

// OPTIONAL
const optionalSearchInput = document.getElementById('optionalProductSearch');
const optionalResultsContainer = document.getElementById('optionalProductResults');

// Глобальные переменные
let allProducts = [];
let selectedProduct = null;
let selectedOptionalProduct = null;
let dayCounter = 0;
const PRODUCTS_PER_PAGE = 50;

// Загрузка данных отеля
async function loadHotelData() {
    hotelNameEl.textContent = 'Отель Demo';
    hotelDescEl.textContent = 'Демонстрационное описание отеля.';
}

// Функция загрузки ВСЕХ товаров из Bitrix24 (закомментировано для автономного режима)
async function loadAllProducts() {
    try {
        // Используйте это, если хотите работать через Bitrix24:
        /* if (typeof BX24 !== 'undefined') {
            const result = await new Promise((resolve) => {
                BX24.callMethod('crm.product.list', { select: ["ID", "NAME", "PRICE", "CURRENCY_ID"], start: -1 }, resolve);
            });
            allProducts = result.data() || [];
        } else { */

            // Альтернативный вариант — демо-товары
            allProducts = [
                { ID: "1", NAME: "Стандартный номер", PRICE: "5000", CURRENCY_ID: "RUB" },
                { ID: "2", NAME: "Люкс", PRICE: "10000", CURRENCY_ID: "RUB" },
                { ID: "3", NAME: "Апартаменты", PRICE: "15000", CURRENCY_ID: "RUB" }
            ];
            renderProductList();
            showNotification(`Загружено ${allProducts.length} товаров (демо-режим)`);
        // }
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        showNotification('Не удалось загрузить товары', true);
    }
}
// Отрисовка товаров
function renderProductList() {
    const searchQuery = productSearchInput.value.toLowerCase().trim();
    const filtered = allProducts.filter(p => p.NAME.toLowerCase().includes(searchQuery));
    productResultsContainer.innerHTML = '';
    if (filtered.length === 0 && searchQuery) {
        productResultsContainer.innerHTML = '<div class="search-result-item">Не найдено</div>';
        productResultsContainer.style.display = 'block';
        return;
    }
    if (filtered.length > 0) {
        productResultsContainer.style.display = 'block';
        filtered.forEach(product => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
                <strong>${product.NAME}</strong><br/>
                <small>${product.PRICE} ${product.CURRENCY_ID}</small>
            `;
            item.addEventListener('click', () => {
                selectedProduct = product;
                productSearchInput.value = `${product.NAME} (${product.PRICE} ${product.CURRENCY_ID})`;
                productResultsContainer.style.display = 'none';
                showNotification(`Выбран товар: ${product.NAME}`);
            });
            productResultsContainer.appendChild(item);
        });
    } else {
        productResultsContainer.innerHTML = '<div class="search-result-item">Нет доступных товаров</div>';
        productResultsContainer.style.display = 'block';
    }
}

// Расчёт стоимости основного блока
function calculateTotal() {
    const nights = parseInt(document.getElementById('nights').value) || 0;
    const rooms = parseInt(document.getElementById('rooms').value) || 0;
    if (!selectedProduct) {
        showNotification('Выберите номер', true);
        return;
    }
    const price = parseFloat(selectedProduct.PRICE) || 0;
    const currency = selectedProduct.CURRENCY_ID || 'RUB';
    const total = price * rooms * nights;
    totalAmountEl.textContent = total.toFixed(2);
    currencyEl.textContent = currency;
    updateFinalTotal(); // <-- Здесь вызов
}

// Функция создания DAY-блока
function createDayCard(index) {
    const card = document.createElement('div');
    card.className = 'day-card';
    const dayNumber = index + 1;
    card.innerHTML = `
        <div class="day-header">DAY ${dayNumber}</div>
        <div class="form-group">
            <label>Выберите номер</label>
            <div class="search-select">
                <input type="text" class="day-product-search" placeholder="Поиск номера..." autocomplete="off" />
                <div class="search-results day-product-results"></div>
            </div>
        </div>
        <button type="button" class="remove-day-btn">Удалить</button>
    `;
    // Поиск
    const searchInput = card.querySelector('.day-product-search');
    const resultsContainer = card.querySelector('.day-product-results');
    searchInput.addEventListener('input', () => renderDayProductList(searchInput, resultsContainer));
    searchInput.addEventListener('focus', () => {
        if (allProducts.length > 0) resultsContainer.style.display = 'block';
    });
    // Удаление
    card.querySelector('.remove-day-btn').addEventListener('click', () => {
        daysContainer.removeChild(card);
        updateTotalDaysSum();
    });
    daysContainer.appendChild(card);
}

// Рендеринг списка товаров для DAY
function renderDayProductList(inputEl, resultsContainer) {
    const searchQuery = inputEl.value.toLowerCase().trim();
    const filtered = allProducts.filter(p => p.NAME.toLowerCase().includes(searchQuery));
    resultsContainer.innerHTML = '';
    if (filtered.length === 0 && searchQuery) {
        resultsContainer.innerHTML = '<div class="search-result-item">Не найдено</div>';
        resultsContainer.style.display = 'block';
        return;
    }
    if (filtered.length > 0) {
        resultsContainer.style.display = 'block';
        filtered.forEach(product => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
                <strong>${product.NAME}</strong><br/>
                <small>${product.PRICE} ${product.CURRENCY_ID}</small>
            `;
            item.addEventListener('click', () => {
                inputEl.value = `${product.NAME} (${product.PRICE} ${product.CURRENCY_ID})`;
                resultsContainer.style.display = 'none';
                updateTotalDaysSum();
                showNotification(`Выбран товар: ${product.NAME}`);
            });
            resultsContainer.appendChild(item);
        });
    } else {
        resultsContainer.innerHTML = '<div class="search-result-item">Нет доступных товаров</div>';
        resultsContainer.style.display = 'block';
    }
}

function updateFinalTotal() {
    let total = 0;
    // Основная стоимость (ACCOMMODATION)
    const accommodationTotal = parseFloat(totalAmountEl.textContent) || 0;
    total += accommodationTotal;
    // DAYS
    const dayCards = document.querySelectorAll('.day-card');
    dayCards.forEach(card => {
        const input = card.querySelector('.day-product-search');
        if (input.value) {
            const match = input.value.match(/(\d+\.?\d*)\s([A-Z]+)/); // Ищем цену
            if (match && match[1]) {
                total += parseFloat(match[1]);
            }
        }
    });
    // OPTIONAL
    if (selectedOptionalProduct) {
        total += parseFloat(selectedOptionalProduct.PRICE);
    }
    // Обновляем итог
    document.getElementById('finalTotalAmount').textContent = total.toFixed(2);
}

// Рендеринг списка товаров для OPTIONAL
function renderOptionalProductList(inputEl, resultsContainer) {
    const searchQuery = inputEl.value.toLowerCase().trim();
    const filtered = allProducts.filter(p => p.NAME.toLowerCase().includes(searchQuery));
    resultsContainer.innerHTML = '';
    if (filtered.length === 0 && searchQuery) {
        resultsContainer.innerHTML = '<div class="search-result-item">Не найдено</div>';
        resultsContainer.style.display = 'block';
        return;
    }
    if (filtered.length > 0) {
        resultsContainer.style.display = 'block';
        filtered.forEach(product => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
                <strong>${product.NAME}</strong><br/>
                <small>${product.PRICE} ${product.CURRENCY_ID}</small>
            `;
            item.addEventListener('click', () => {
                selectedOptionalProduct = product;
                inputEl.value = `${product.NAME} (${product.PRICE} ${product.CURRENCY_ID})`;
                resultsContainer.style.display = 'none';
                updateTotalDaysSum();
                showNotification(`Выбран товар: ${product.NAME}`);
            });
            resultsContainer.appendChild(item);
        });
    } else {
        resultsContainer.innerHTML = '<div class="search-result-item">Нет доступных товаров</div>';
        resultsContainer.style.display = 'block';
    }
}

// Подсчёт суммы по дням
function updateTotalDaysSum() {
    let total = 0;
    const dayCards = document.querySelectorAll('.day-card');
    dayCards.forEach(card => {
        const input = card.querySelector('.day-product-search');
        if (input.value) {
            const match = input.value.match(/(\d+\.?\d*)\s([A-Z]+)/); // Ищем цену
            if (match && match[1]) {
                total += parseFloat(match[1]);
            }
        }
    });
    if (selectedOptionalProduct) {
        total += parseFloat(selectedOptionalProduct.PRICE);
    }
    totalDaysAmountEl.textContent = total.toFixed(2);
    // Объединённая сумма
    const baseTotal = parseFloat(totalAmountEl.textContent || 0);
    const overallTotal = baseTotal + total;
    totalAmountEl.textContent = overallTotal.toFixed(2);
    updateFinalTotal();
}

// Уведомления
function showNotification(message, isError = false) {
    notificationEl.textContent = message;
    notificationEl.className = isError ? 'notification error show' : 'notification show';
    setTimeout(() => {
        notificationEl.classList.remove('show');
    }, 5000);
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadHotelData();
    loadAllProducts();

    // Основные события
    calculateBtn.addEventListener('click', calculateTotal);
    productSearchInput.addEventListener('input', renderProductList);
    productSearchInput.addEventListener('focus', () => {
        if (allProducts.length > 0) productResultsContainer.style.display = 'block';
    });
    document.addEventListener('click', (e) => {
        if (!productResultsContainer.contains(e.target) && e.target !== productSearchInput) {
            productResultsContainer.style.display = 'none';
        }
    });

    // DAYS
    if (addDayBtn) {
        addDayBtn.addEventListener('click', () => {
            createDayCard(dayCounter);
            dayCounter++;
        });
    }

    // OPTIONAL
    if (optionalSearchInput) {
        optionalSearchInput.addEventListener('input', () => renderOptionalProductList(optionalSearchInput, optionalResultsContainer));
        optionalSearchInput.addEventListener('focus', () => {
            if (allProducts.length > 0) optionalResultsContainer.style.display = 'block';
        });
    }
});
