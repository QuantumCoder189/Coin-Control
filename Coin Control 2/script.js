/* ============================================================
   COIN CONTROL — script.js
   Features: onboarding, dark/light mode, push notifications,
             confetti on goal completion, split bill calculator
   ============================================================ */


/* ============================================================
   1. STATE & STORAGE
   ============================================================ */

let state = {
  income:       [],
  expenses:     [],
  goals:        [],
  weeklyBudget: 0,
  userName:     '',
  theme:        'dark',
  notifDismissed: false,
  splitPeople:  [],
};

function saveState() {
  localStorage.setItem('coincontrol_state', JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem('coincontrol_state');
  if (saved) state = Object.assign(state, JSON.parse(saved));
}


/* ============================================================
   2. UTILITIES
   ============================================================ */

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatMoney(amount) {
  return '$' + Number(amount).toLocaleString('en-AU', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

function todayString() {
  return new Date().toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

function showError(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, 3000);
}

function escapeHTML(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

const CAT_EMOJI = {
  Food: '🍔', Entertainment: '🎮', Transport: '🚌',
  Shopping: '🛍️', Health: '💊', Other: '📦',
};
const CAT_COLOURS = {
  Food: '#ff5e7a', Entertainment: '#5b8fff', Transport: '#22d68b',
  Shopping: '#f5c842', Health: '#c97bff', Other: '#8888a0',
};


/* ============================================================
   3. DARK / LIGHT MODE
   ============================================================ */

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  saveState();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  document.getElementById('theme-icon').textContent = state.theme === 'dark' ? '☀️' : '🌙';
}


/* ============================================================
   4. ONBOARDING
   ============================================================ */

let obStep = 0;
const OB_STEPS = 4;

function showOnboarding() {
  document.getElementById('onboarding').classList.remove('hidden');
}

function hideOnboarding() {
  document.getElementById('onboarding').classList.add('hidden');
}

function obUpdateUI() {
  // Update step dots
  document.querySelectorAll('.ob-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === obStep);
  });
  // Show/hide steps
  document.querySelectorAll('.ob-step').forEach(step => {
    step.classList.toggle('active', parseInt(step.dataset.step) === obStep);
  });
  // Show name input only on first step
  document.getElementById('ob-name-row').style.display = obStep === 0 ? 'block' : 'none';
  // Back button
  document.getElementById('ob-back').style.visibility = obStep === 0 ? 'hidden' : 'visible';
  // Next button label
  const nextBtn = document.getElementById('ob-next');
  nextBtn.textContent = obStep === OB_STEPS - 1 ? "Let's go! 🚀" : 'Next →';
}

function obNext() {
  if (obStep === 0) {
    const name = document.getElementById('ob-name').value.trim();
    if (name) {
      state.userName = name;
      saveState();
    }
  }
  if (obStep < OB_STEPS - 1) {
    obStep++;
    obUpdateUI();
  } else {
    // Finished onboarding
    localStorage.setItem('coincontrol_onboarded', 'true');
    hideOnboarding();
    updateGreeting();
    // Show notification banner if not already granted
    if (Notification.permission === 'default' && !state.notifDismissed) {
      document.getElementById('notif-banner').style.display = 'flex';
    }
  }
}

function obPrev() {
  if (obStep > 0) {
    obStep--;
    obUpdateUI();
  }
}

function skipNotifications() {
  obStep = OB_STEPS - 1;
  obNext();
}

function updateGreeting() {
  const el = document.getElementById('greeting');
  if (!el) return;
  const hour = new Date().getHours();
  const timeGreet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = state.userName ? `, ${state.userName}` : '';
  el.textContent = `${timeGreet}${name} 👋`;
}


/* ============================================================
   5. PUSH NOTIFICATIONS
   ============================================================ */

async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    alert('This browser does not support notifications.');
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    new Notification('Coin Control 🪙', {
      body: "Budget alerts are on! We'll let you know before you overspend.",
      icon: 'icons/icon-192.png',
    });
    dismissNotifBanner();
  }
}

function dismissNotifBanner() {
  document.getElementById('notif-banner').style.display = 'none';
  state.notifDismissed = true;
  saveState();
}

/** Send a push notification — called internally when budget thresholds are crossed */
function sendBudgetNotification(message) {
  if (Notification.permission === 'granted') {
    new Notification('Coin Control 🪙', {
      body: message,
      icon: 'icons/icon-192.png',
    });
  }
}

/** Check budget and fire notifications at 80% and 100% */
function checkBudgetNotifications(prevPct) {
  if (state.weeklyBudget <= 0) return;
  const totalExp = state.expenses.reduce((s, e) => s + e.amount, 0);
  const pct = (totalExp / state.weeklyBudget) * 100;

  if (prevPct < 80 && pct >= 80 && pct < 100) {
    sendBudgetNotification(`⚠️ You've used 80% of your weekly budget (${formatMoney(totalExp)} of ${formatMoney(state.weeklyBudget)})`);
  } else if (prevPct < 100 && pct >= 100) {
    sendBudgetNotification(`🚨 You're over budget! Spent ${formatMoney(totalExp)} vs ${formatMoney(state.weeklyBudget)} limit.`);
  }
}


/* ============================================================
   6. CONFETTI 🎉
   Pure canvas confetti — no library needed
   ============================================================ */

let confettiParticles = [];
let confettiAnimating = false;

function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const colours = ['#f5c842','#22d68b','#5b8fff','#ff5e7a','#c97bff','#ff9f43'];

  // Spawn 160 particles
  confettiParticles = Array.from({ length: 160 }, () => ({
    x: Math.random() * canvas.width,
    y: -10 - Math.random() * 200,
    r: 4 + Math.random() * 6,
    d: 1 + Math.random() * 3,         // fall speed
    color: colours[Math.floor(Math.random() * colours.length)],
    tilt: Math.random() * 10 - 5,
    tiltSpeed: 0.1 + Math.random() * 0.2,
    angle: 0,
  }));

  if (!confettiAnimating) {
    confettiAnimating = true;
    let frame = 0;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confettiParticles.forEach(p => {
        p.angle += p.tiltSpeed;
        p.y += p.d;
        p.x += Math.sin(p.angle) * 1.5;
        p.tilt = Math.sin(p.angle) * 12;
        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt, p.y);
        ctx.lineTo(p.x + p.tilt + p.r * 1.5, p.y + p.r * 1.5);
        ctx.stroke();
      });
      // Remove particles that have fallen off screen
      confettiParticles = confettiParticles.filter(p => p.y < canvas.height + 20);
      frame++;
      if (confettiParticles.length > 0 && frame < 300) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        confettiAnimating = false;
      }
    }
    animate();
  }
}


/* ============================================================
   7. INCOME
   ============================================================ */

function addIncome() {
  const nameEl   = document.getElementById('input-income-name');
  const amountEl = document.getElementById('input-income-amount');
  const name     = nameEl.value.trim();
  const amount   = parseFloat(amountEl.value);

  if (!name)  { showError('income-error', 'Please enter an income source name.'); return; }
  if (isNaN(amount) || amount <= 0) { showError('income-error', 'Please enter a valid amount greater than 0.'); return; }

  state.income.push({ id: uid(), name, amount, date: todayString() });
  saveState();
  nameEl.value = amountEl.value = '';
  renderAll();
}


/* ============================================================
   8. EXPENSES
   ============================================================ */

function addExpenseFrom(source) {
  const suffix   = source === 'dashboard' ? '-d' : '';
  const nameEl   = document.getElementById(`input-expense-name${suffix}`);
  const amountEl = document.getElementById(`input-expense-amount${suffix}`);
  const catEl    = document.getElementById(`input-expense-cat${suffix}`);
  const errorId  = source === 'dashboard' ? 'expense-error-d' : 'expense-error';

  const name     = nameEl.value.trim();
  const amount   = parseFloat(amountEl.value);
  const category = catEl.value;

  if (!name) { showError(errorId, 'Please enter a name for this expense.'); return; }
  if (isNaN(amount) || amount <= 0) { showError(errorId, 'Please enter a valid amount greater than 0.'); return; }

  // Calculate budget % before adding
  const prevPct = state.weeklyBudget > 0
    ? (state.expenses.reduce((s, e) => s + e.amount, 0) / state.weeklyBudget) * 100
    : 0;

  state.expenses.push({ id: uid(), name, amount, category, date: todayString() });
  saveState();
  nameEl.value = amountEl.value = '';

  checkBudgetNotifications(prevPct);
  renderAll();
}

function deleteExpense(id) {
  state.expenses = state.expenses.filter(e => e.id !== id);
  saveState();
  renderAll();
}

function clearAllExpenses() {
  if (!state.expenses.length) return;
  if (!confirm('Delete all expenses?')) return;
  state.expenses = [];
  saveState();
  renderAll();
}


/* ============================================================
   9. WEEKLY BUDGET
   ============================================================ */

function saveWeeklyBudget() {
  const val = parseFloat(document.getElementById('input-weekly-budget').value);
  if (isNaN(val) || val < 0) { alert('Please enter a valid budget.'); return; }
  state.weeklyBudget = val;
  saveState();
  renderWeeklyBudget();
}

function renderWeeklyBudget() {
  const totalExp = state.expenses.reduce((s, e) => s + e.amount, 0);
  const limit    = state.weeklyBudget;
  const fillEl   = document.getElementById('weekly-progress');
  const labelEl  = document.getElementById('weekly-label');
  const badgeEl  = document.getElementById('budget-badge');
  const inputEl  = document.getElementById('input-weekly-budget');

  if (limit > 0) inputEl.value = limit;

  if (limit <= 0) {
    fillEl.style.width = '0%';
    labelEl.textContent = 'Set a weekly budget to track your spending.';
    badgeEl.textContent = 'No limit set';
    badgeEl.classList.remove('over');
    return;
  }

  const pct  = Math.min((totalExp / limit) * 100, 100);
  const over = totalExp > limit;
  fillEl.style.width = pct + '%';
  fillEl.classList.toggle('over', over);

  if (over) {
    labelEl.textContent = `You're ${formatMoney(totalExp - limit)} over your ${formatMoney(limit)} budget!`;
    badgeEl.textContent = 'Over budget ✗';
    badgeEl.classList.add('over');
  } else {
    labelEl.textContent = `${formatMoney(totalExp)} spent of ${formatMoney(limit)} — ${formatMoney(limit - totalExp)} remaining.`;
    badgeEl.textContent = 'On track ✓';
    badgeEl.classList.remove('over');
  }
}


/* ============================================================
   10. GOALS
   ============================================================ */

function addGoal() {
  const name   = document.getElementById('input-goal-name').value.trim();
  const target = parseFloat(document.getElementById('input-goal-target').value);

  if (!name)  { showError('goal-error', 'Please enter a goal name.'); return; }
  if (isNaN(target) || target <= 0) { showError('goal-error', 'Please enter a target amount greater than 0.'); return; }

  state.goals.push({ id: uid(), name, target, saved: 0, celebrated: false });
  saveState();
  document.getElementById('input-goal-name').value  = '';
  document.getElementById('input-goal-target').value = '';
  renderGoals();
}

function contributeToGoal(id) {
  const inputEl = document.getElementById(`goal-input-${id}`);
  const amount  = parseFloat(inputEl.value);
  if (isNaN(amount) || amount <= 0) { alert('Please enter a valid amount.'); return; }

  const goal = state.goals.find(g => g.id === id);
  if (!goal) return;

  const wasComplete = goal.saved >= goal.target;
  goal.saved = Math.min(goal.saved + amount, goal.target);
  const nowComplete = goal.saved >= goal.target;

  // 🎉 Launch confetti on first completion!
  if (!wasComplete && nowComplete && !goal.celebrated) {
    goal.celebrated = true;
    launchConfetti();
    sendBudgetNotification(`🎉 Goal complete! You saved ${formatMoney(goal.target)} for "${goal.name}"!`);
  }

  saveState();
  inputEl.value = '';
  renderGoals();
}

function deleteGoal(id) {
  if (!confirm('Remove this savings goal?')) return;
  state.goals = state.goals.filter(g => g.id !== id);
  saveState();
  renderGoals();
}


/* ============================================================
   11. SPLIT BILL CALCULATOR
   ============================================================ */

function calcSplit() {
  const total   = parseFloat(document.getElementById('split-total').value)   || 0;
  const people  = parseInt(document.getElementById('split-people').value)    || 1;
  const tipPct  = parseFloat(document.getElementById('split-tip').value)     || 0;

  if (total <= 0 || people < 1) {
    document.getElementById('split-result').style.display   = 'none';
    document.getElementById('split-names-box').style.display = 'none';
    return;
  }

  const tipAmount  = total * (tipPct / 100);
  const totalTip   = total + tipAmount;
  const perPerson  = totalTip / people;
  const tipPP      = tipAmount / people;

  document.getElementById('split-total-tip').textContent   = formatMoney(totalTip);
  document.getElementById('split-per-person').textContent  = formatMoney(perPerson);
  document.getElementById('split-tip-pp').textContent      = formatMoney(tipPP);
  document.getElementById('split-result').style.display    = 'block';
  document.getElementById('split-names-box').style.display = 'block';

  // Update amounts on existing people cards
  renderSplitPeople();
}

function setTip(pct) {
  document.getElementById('split-tip').value = pct;
  // Update active tip button
  document.querySelectorAll('.tip-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.includes(pct + '%') || (pct === 0 && btn.textContent === 'No tip'));
  });
  calcSplit();
}

function addSplitPerson() {
  const input = document.getElementById('split-name-input');
  const name  = input.value.trim();
  if (!name) return;
  state.splitPeople.push({ id: uid(), name, paid: false });
  saveState();
  input.value = '';
  renderSplitPeople();
}

function togglePaid(id) {
  const p = state.splitPeople.find(p => p.id === id);
  if (p) { p.paid = !p.paid; saveState(); renderSplitPeople(); }
}

function renderSplitPeople() {
  const container = document.getElementById('split-people-list');
  if (!container) return;

  const total   = parseFloat(document.getElementById('split-total').value)   || 0;
  const people  = Math.max(parseInt(document.getElementById('split-people').value) || 1, 1);
  const tipPct  = parseFloat(document.getElementById('split-tip').value)     || 0;
  const perP    = (total * (1 + tipPct / 100)) / people;

  if (state.splitPeople.length === 0) {
    container.innerHTML = '<p class="empty-state">Add names above to track who\'s paid.</p>';
    return;
  }
  container.innerHTML = state.splitPeople.map(p => `
    <div class="split-person">
      <span class="split-person-name">${escapeHTML(p.name)}</span>
      <span class="split-person-amount">${formatMoney(perP)}</span>
      <button class="split-person-paid ${p.paid ? 'paid' : ''}" onclick="togglePaid('${p.id}')">
        ${p.paid ? '✓ Paid' : 'Mark paid'}
      </button>
      <button class="btn btn--danger btn--sm" onclick="removeSplitPerson('${p.id}')">✕</button>
    </div>
  `).join('');
}

function removeSplitPerson(id) {
  state.splitPeople = state.splitPeople.filter(p => p.id !== id);
  saveState();
  renderSplitPeople();
}

function addSplitAsExpense() {
  const total   = parseFloat(document.getElementById('split-total').value)   || 0;
  const people  = Math.max(parseInt(document.getElementById('split-people').value) || 1, 1);
  const tipPct  = parseFloat(document.getElementById('split-tip').value)     || 0;
  const perP    = (total * (1 + tipPct / 100)) / people;

  if (perP <= 0) return;
  state.expenses.push({
    id: uid(),
    name: 'Split bill (my share)',
    amount: Math.round(perP * 100) / 100,
    category: 'Food',
    date: todayString(),
  });
  saveState();
  renderAll();
  alert(`Added ${formatMoney(perP)} as an expense! Check the Expenses tab.`);
}


/* ============================================================
   12. CHART.JS — Pie & Bar charts
   ============================================================ */

let pieChartInstance = null;
let barChartInstance = null;

function renderPieChart() {
  const canvas = document.getElementById('pie-chart');
  const legend = document.getElementById('pie-legend');
  const totals = {};
  state.expenses.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });
  const labels = Object.keys(totals);
  const data   = labels.map(l => Math.round(totals[l] * 100) / 100);
  const colors = labels.map(l => CAT_COLOURS[l] || '#8888a0');

  if (pieChartInstance) pieChartInstance.destroy();
  if (!labels.length) {
    legend.innerHTML = '<p style="color:var(--clr-text-muted);font-size:0.85rem;">No expense data yet.</p>';
    return;
  }
  const isDark = state.theme === 'dark';
  pieChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: isDark ? '#18181f' : '#fff', borderWidth: 3, hoverOffset: 8 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '60%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${formatMoney(ctx.parsed)}` } }
      }
    }
  });
  legend.innerHTML = labels.map((l, i) => `
    <span class="legend-item">
      <span class="legend-dot" style="background:${colors[i]}"></span>
      ${CAT_EMOJI[l] || ''} ${l}
    </span>
  `).join('');
}

function renderBarChart() {
  const canvas  = document.getElementById('bar-chart');
  const income  = state.income.reduce((s, i) => s + i.amount, 0);
  const expense = state.expenses.reduce((s, e) => s + e.amount, 0);
  const balance = Math.max(income - expense, 0);

  if (barChartInstance) barChartInstance.destroy();
  const isDark = state.theme === 'dark';
  barChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Income', 'Expenses', 'Balance'],
      datasets: [{
        data: [income, expense, balance].map(v => Math.round(v * 100) / 100),
        backgroundColor: ['#22d68b', '#ff5e7a', '#5b8fff'],
        borderRadius: 8, borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${formatMoney(ctx.parsed.y)}` } }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' },
          ticks: { color: '#8888a0', callback: v => '$' + v }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#8888a0' }
        }
      }
    }
  });
}


/* ============================================================
   13. UI RENDERING
   ============================================================ */

function renderCards() {
  const income  = state.income.reduce((s, i) => s + i.amount, 0);
  const expense = state.expenses.reduce((s, e) => s + e.amount, 0);
  const balance = income - expense;
  document.getElementById('display-income').textContent   = formatMoney(income);
  document.getElementById('display-expenses').textContent = formatMoney(expense);
  const balEl = document.getElementById('display-balance');
  balEl.textContent = formatMoney(Math.abs(balance));
  balEl.style.color = balance < 0 ? 'var(--clr-red)' : 'var(--clr-blue)';
}

function renderExpenseList() {
  const container = document.getElementById('expense-list');
  if (!state.expenses.length) {
    container.innerHTML = '<p class="empty-state">No expenses yet. Add one above!</p>';
    return;
  }
  container.innerHTML = [...state.expenses].reverse().map((e, ri) => {
    const i = state.expenses.length - 1 - ri;
    const catInfo = CAT_EMOJI[e.category] || '📦';
    return `<div class="expense-item">
      <div class="expense-emoji">${catInfo}</div>
      <div class="expense-info">
        <div class="expense-name">${escapeHTML(e.name)}</div>
        <div class="expense-meta">${e.category} · ${e.date}</div>
      </div>
      <div class="expense-amount">${formatMoney(e.amount)}</div>
      <button class="btn btn--danger btn--sm" onclick="deleteExpense('${e.id}')" aria-label="Delete">Delete</button>
    </div>`;
  }).join('');
}

function renderGoals() {
  const container = document.getElementById('goals-list');
  if (!state.goals.length) {
    container.innerHTML = `<div class="section-box"><p class="empty-state">No savings goals yet. Add one above!</p></div>`;
    return;
  }
  container.innerHTML = state.goals.map(g => {
    const pct      = Math.min(Math.round((g.saved / g.target) * 100), 100);
    const complete = g.saved >= g.target;
    return `<div class="goal-card">
      <div class="goal-header">
        <span class="goal-name">${escapeHTML(g.name)}</span>
        ${complete
          ? '<span class="goal-complete-badge">🎉 Complete!</span>'
          : `<button class="btn btn--ghost btn--sm" onclick="deleteGoal('${g.id}')">Remove</button>`}
      </div>
      <div class="goal-amounts">
        <span class="goal-saved">${formatMoney(g.saved)}</span>
        <span class="goal-of">saved of ${formatMoney(g.target)}</span>
        <span class="goal-pct">${pct}%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${pct}%;background:${complete ? 'var(--clr-accent)' : 'var(--clr-green)'};"></div>
      </div>
      ${!complete ? `<div class="goal-contribute">
        <input type="number" id="goal-input-${g.id}" class="input" placeholder="Add savings ($)" min="0.01" step="0.01" />
        <button class="btn btn--primary btn--sm" onclick="contributeToGoal('${g.id}')">+ Add</button>
      </div>` : ''}
    </div>`;
  }).join('');
}

function renderAll() {
  renderCards();
  renderWeeklyBudget();
  renderExpenseList();
  renderGoals();
  const chartsTab = document.getElementById('tab-charts');
  if (chartsTab && chartsTab.classList.contains('active')) {
    renderPieChart();
    renderBarChart();
  }
}


/* ============================================================
   14. NAVIGATION (TABS)
   ============================================================ */

function switchTab(tabName) {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  const section = document.getElementById(`tab-${tabName}`);
  if (section) section.classList.add('active');
  const btn = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
  if (btn) { btn.classList.add('active'); btn.setAttribute('aria-selected', 'true'); }
  if (tabName === 'charts') { renderPieChart(); renderBarChart(); }
}

function initNavigation() {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}


/* ============================================================
   15. INIT
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  applyTheme();
  initNavigation();
  updateGreeting();
  renderAll();

  // Show onboarding only on first visit
  const onboarded = localStorage.getItem('coincontrol_onboarded');
  if (!onboarded) {
    obUpdateUI();
    showOnboarding();
  } else {
    hideOnboarding();
    // Show notification banner if permission not yet decided
    if (Notification.permission === 'default' && !state.notifDismissed) {
      document.getElementById('notif-banner').style.display = 'flex';
    }
  }
});
