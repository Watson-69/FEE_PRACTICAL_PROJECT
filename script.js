// ─────────────────────────────────────────────────────
//  Budget Tracker — Application Logic
// ─────────────────────────────────────────────────────

(() => {
  'use strict';

  // ── Constants ──────────────────────────────────────
  const STORAGE_KEY = 'budget_tracker_transactions';

  const CATEGORY_COLORS = {
    Food:            '#f97316',
    Transport:       '#3b82f6',
    Shopping:        '#ec4899',
    Bills:           '#eab308',
    Entertainment:   '#8b5cf6',
    Health:          '#14b8a6',
    Education:       '#06b6d4',
    'Other Expense': '#6b7280',
    Salary:          '#22c55e',
    Freelance:       '#10b981',
    Investment:      '#0ea5e9',
    Gift:            '#f472b6',
    'Other Income':  '#a3e635',
  };

  // ── DOM References ─────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const form            = $('#transaction-form');
  const inputName       = $('#input-name');
  const inputAmount     = $('#input-amount');
  const inputCategory   = $('#input-category');
  const formError       = $('#form-error');
  const btnTypeIncome   = $('#btn-type-income');
  const btnTypeExpense  = $('#btn-type-expense');
  const totalBalanceEl  = $('#total-balance');
  const totalIncomeEl   = $('#total-income');
  const totalExpenseEl  = $('#total-expense');
  const historyList     = $('#history-list');
  const emptyState      = $('#empty-state');
  const chartContainer  = $('#chart-container');
  const noChartData     = $('#no-chart-data');
  const btnClearAll     = $('#btn-clear-all');
  const modalOverlay    = $('#modal-overlay');
  const modalCancel     = $('#modal-cancel');
  const modalConfirm    = $('#modal-confirm');
  const toastContainer  = $('#toast-container');

  // ── State ──────────────────────────────────────────
  let transactions = [];
  let selectedType = 'income'; // default

  // ── LocalStorage Helpers ───────────────────────────
  function loadTransactions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      transactions = raw ? JSON.parse(raw) : [];
    } catch {
      transactions = [];
    }
  }

  function saveTransactions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }

  // ── Currency Formatter ─────────────────────────────
  function formatCurrency(amount) {
    return '₹' + Math.abs(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // ── Toast Notifications ────────────────────────────
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      toast.style.transition = 'all .35s ease';
      setTimeout(() => toast.remove(), 350);
    }, 2800);
  }

  // ── Confirm Modal ──────────────────────────────────
  function showModal() {
    modalOverlay.classList.add('show');
    modalCancel.focus();
  }

  function hideModal() {
    modalOverlay.classList.remove('show');
  }

  // ── Type Toggle ────────────────────────────────────
  function setSelectedType(type) {
    selectedType = type;
    if (type === 'income') {
      btnTypeIncome.classList.add('active-income');
      btnTypeIncome.setAttribute('aria-pressed', 'true');
      btnTypeExpense.classList.remove('active-expense');
      btnTypeExpense.setAttribute('aria-pressed', 'false');
    } else {
      btnTypeExpense.classList.add('active-expense');
      btnTypeExpense.setAttribute('aria-pressed', 'true');
      btnTypeIncome.classList.remove('active-income');
      btnTypeIncome.setAttribute('aria-pressed', 'false');
    }
  }

  btnTypeIncome.addEventListener('click', () => setSelectedType('income'));
  btnTypeExpense.addEventListener('click', () => setSelectedType('expense'));

  // ── Form Validation ────────────────────────────────
  function validateForm() {
    const name = inputName.value.trim();
    const amountStr = inputAmount.value.trim();
    const category = inputCategory.value;

    if (!name) {
      showError('Please enter a description for this transaction.');
      inputName.focus();
      return null;
    }

    if (!amountStr) {
      showError('Please enter an amount.');
      inputAmount.focus();
      return null;
    }

    const amount = parseFloat(amountStr);

    if (isNaN(amount)) {
      showError('Amount must be a valid number.');
      inputAmount.focus();
      return null;
    }

    if (amount <= 0) {
      showError('Amount must be greater than zero.');
      inputAmount.focus();
      return null;
    }

    if (!category) {
      showError('Please select a category.');
      inputCategory.focus();
      return null;
    }

    clearError();
    return { name, amount, category };
  }

  function showError(msg) {
    formError.textContent = msg;
    formError.style.opacity = '1';
  }

  function clearError() {
    formError.textContent = '';
  }

  // ── Add Transaction ────────────────────────────────
  function addTransaction(e) {
    e.preventDefault();
    const data = validateForm();
    if (!data) return;

    const transaction = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      type: selectedType,
      name: data.name,
      amount: data.amount,
      category: data.category,
      date: new Date().toISOString(),
    };

    transactions.unshift(transaction);
    saveTransactions();
    updateUI();
    resetForm();
    showToast(`${selectedType === 'income' ? 'Income' : 'Expense'} added successfully!`, 'success');
  }

  function resetForm() {
    form.reset();
    setSelectedType('income');
    clearError();
  }

  // ── Delete Transaction ─────────────────────────────
  function deleteTransaction(id) {
    transactions = transactions.filter((t) => t.id !== id);
    saveTransactions();
    updateUI();
    showToast('Transaction deleted.', 'info');
  }

  // ── Clear All ──────────────────────────────────────
  function clearAll() {
    transactions = [];
    saveTransactions();
    updateUI();
    hideModal();
    showToast('All transactions cleared.', 'error');
  }

  // ── Update Dashboard Cards ─────────────────────────
  function updateSummary() {
    const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;

    totalBalanceEl.textContent  = (balance < 0 ? '-' : '') + formatCurrency(balance);
    totalIncomeEl.textContent   = formatCurrency(income);
    totalExpenseEl.textContent  = formatCurrency(expense);
  }

  // ── Render History ─────────────────────────────────
  function renderHistory() {
    // Clear existing items (except empty state which we toggle)
    historyList.querySelectorAll('.history-item').forEach(el => el.remove());

    if (transactions.length === 0) {
      emptyState.style.display = '';
      return;
    }

    emptyState.style.display = 'none';

    transactions.forEach((t, i) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.style.animationDelay = `${i * 0.04}s`;

      const isIncome = t.type === 'income';
      const dateStr  = new Date(t.date).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
      });

      item.innerHTML = `
        <div class="indicator ${isIncome ? 'inc' : 'exp'}"></div>
        <div class="details">
          <div class="name">${escapeHTML(t.name)}</div>
          <div class="meta">${escapeHTML(t.category)} · ${dateStr}</div>
        </div>
        <div class="amount ${isIncome ? 'inc' : 'exp'}">
          ${isIncome ? '+' : '-'}${formatCurrency(t.amount)}
        </div>
        <button class="btn-delete" data-id="${t.id}" aria-label="Delete ${escapeHTML(t.name)}" title="Delete">✕</button>
      `;

      historyList.appendChild(item);
    });
  }

  // ── Render Pie Chart ───────────────────────────────
  function renderChart() {
    // Remove old chart elements
    const oldPie = chartContainer.querySelector('.pie-chart');
    const oldLegend = chartContainer.querySelector('.chart-legend');
    if (oldPie) oldPie.remove();
    if (oldLegend) oldLegend.remove();

    const expenses = transactions.filter(t => t.type === 'expense');

    if (expenses.length === 0) {
      noChartData.style.display = '';
      return;
    }

    noChartData.style.display = 'none';

    // Group by category
    const categoryTotals = {};
    expenses.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const totalExpense = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

    // Build conic-gradient stops
    let accumulated = 0;
    const gradientStops = [];

    sortedCategories.forEach(([cat, amount]) => {
      const pct = (amount / totalExpense) * 100;
      const color = CATEGORY_COLORS[cat] || '#6b7280';
      gradientStops.push(`${color} ${accumulated.toFixed(2)}% ${(accumulated + pct).toFixed(2)}%`);
      accumulated += pct;
    });

    const gradientCSS = `conic-gradient(${gradientStops.join(', ')})`;

    // Create pie element with inline style for the dynamic conic-gradient
    const pie = document.createElement('div');
    pie.className = 'pie-chart';
    pie.setAttribute('role', 'img');
    pie.setAttribute('aria-label', 'Expense breakdown pie chart');
    pie.style.background = gradientCSS;

    const center = document.createElement('div');
    center.className = 'pie-chart-center';
    center.innerHTML = `<span>Total</span><strong>${formatCurrency(totalExpense)}</strong>`;
    pie.appendChild(center);

    // Create legend
    const legend = document.createElement('div');
    legend.className = 'chart-legend';

    sortedCategories.forEach(([cat, amount]) => {
      const pct = ((amount / totalExpense) * 100).toFixed(1);
      const color = CATEGORY_COLORS[cat] || '#6b7280';
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML = `
        <span class="legend-dot" style="background:${color}"></span>
        ${escapeHTML(cat)} (${pct}%)
      `;
      legend.appendChild(item);
    });

    chartContainer.appendChild(pie);
    chartContainer.appendChild(legend);
  }

  // ── Orchestrator ───────────────────────────────────
  function updateUI() {
    updateSummary();
    renderHistory();
    renderChart();
  }

  // ── Utility ────────────────────────────────────────
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Event Listeners ────────────────────────────────
  form.addEventListener('submit', addTransaction);

  historyList.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-delete');
    if (btn) {
      deleteTransaction(btn.dataset.id);
    }
  });

  btnClearAll.addEventListener('click', () => {
    if (transactions.length === 0) {
      showToast('Nothing to clear!', 'info');
      return;
    }
    showModal();
  });

  modalCancel.addEventListener('click', hideModal);
  modalConfirm.addEventListener('click', clearAll);

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) hideModal();
  });

  // Close modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('show')) {
      hideModal();
    }
  });

  // ── Init ───────────────────────────────────────────
  loadTransactions();
  updateUI();
})();
