import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import AppHeader from '../../components/AppHeader';
import Pagination from '../../components/Pagination';

// How many rows to show per page in each paginated table.
// Change these two numbers if you want different page sizes.
const USERS_PER_PAGE = 5;
const ORDERS_PER_PAGE = 10;

const emptyMenuForm = { date: '', itemName: '', description: '', price: 275, isPublished: true };
const emptyVendorForm = { name: '', contactInfo: '' };

// --- small date helpers -----------------------------------------------

function toISODate(d) {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD", what <input type="date"> and the API both expect
}

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toISODate(d);
}

// Returns the Monday and Sunday (inclusive) of the current calendar week,
// used to filter "Scheduled menus" down to just this week's entries.
function getCurrentWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday ... 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

// Maps the backend's OrderStatus enum (CONFIRMED/PENDING/CANCELLED) to a
// friendlier label + color class for display. The backend never sends
// "Completed" directly - that word only exists in this UI layer.
function statusBadge(status) {
  const map = {
    CONFIRMED: { label: 'Completed', cls: 'badge-completed' },
    PENDING: { label: 'Pending', cls: 'badge-pending' },
    CANCELLED: { label: 'Cancelled', cls: 'badge-cancelled' },
  };
  const s = map[status] || { label: status, cls: 'badge-pending' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const today = toISODate(new Date());

  // ---------------------------------------------------------------------
  // MENU MANAGEMENT (create/edit a day's menu, list this week's menus)
  // ---------------------------------------------------------------------
  const [menus, setMenus] = useState([]); // ALL menus from the API (any date)
  const [menuForm, setMenuForm] = useState(emptyMenuForm);
  const [menuMessage, setMenuMessage] = useState('');
  const [menuError, setMenuError] = useState('');
  const [savingMenu, setSavingMenu] = useState(false);

  // ---------------------------------------------------------------------
  // VENDOR MANAGEMENT
  // ---------------------------------------------------------------------
  const [vendors, setVendors] = useState([]);
  const [vendorForm, setVendorForm] = useState(emptyVendorForm);
  const [vendorMessage, setVendorMessage] = useState('');
  const [savingVendor, setSavingVendor] = useState(false);

  // ---------------------------------------------------------------------
  // USER MANAGEMENT (paginated, 5 per page)
  // ---------------------------------------------------------------------
  const [users, setUsers] = useState([]); // ALL employees from the API
  const [userMessage, setUserMessage] = useState('');
  const [userPage, setUserPage] = useState(1);

  // ---------------------------------------------------------------------
  // ORDERS REPORT (filters + User-wise/Vendor-wise views, paginated 10/page)
  // ---------------------------------------------------------------------
  const [filterMode, setFilterMode] = useState('today'); // 'today' | 'yesterday' | 'custom'
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [statusFilter, setStatusFilter] = useState(''); // '' means "All"
  const [reportView, setReportView] = useState('user'); // 'user' | 'vendor'
  const [ordersData, setOrdersData] = useState({ orders: [], totalQuantity: 0, totalAmount: 0 });
  const [orderPage, setOrderPage] = useState(1);

  // Selection + vendor assignment (works on individual rows or a bulk selection)
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [rowAssignVendor, setRowAssignVendor] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState('');

  // CSV export (separate single-date picker, independent of the filters above)
  const [exportDate, setExportDate] = useState(today);

  // -----------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------

  // Turns the current filter selection (Today / Yesterday / Custom range)
  // into a concrete { from, to } date pair for the API call.
  function currentRange() {
    if (filterMode === 'today') return { from: today, to: today };
    if (filterMode === 'yesterday') {
      const y = yesterdayISO();
      return { from: y, to: y };
    }
    return { from: customFrom, to: customTo };
  }

  async function loadOrders() {
    const { from, to } = currentRange();
    const params = new URLSearchParams({ from, to });
    if (statusFilter) params.set('status', statusFilter);
    const res = await api.get(`/orders?${params.toString()}`);
    setOrdersData(res.data);
    setSelectedOrderIds([]); // clear selection whenever the underlying data changes
  }

  // Loads everything that isn't the orders report: vendors, all menus,
  // and all employees. Called on first load and after any action that
  // changes one of these lists (adding a vendor, saving a menu, etc).
  async function loadStatics() {
    const vendorRes = await api.get('/admin/vendors');
    setVendors(vendorRes.data.vendors);
    const menuRes = await api.get('/menus');
    setMenus(menuRes.data.menus);
    const userRes = await api.get('/admin/users');
    setUsers(userRes.data.users);
  }

  useEffect(() => {
    loadStatics();
  }, []);

  // Re-fetch orders whenever a filter changes, and jump back to page 1
  // of the orders table since the previous page number may no longer
  // make sense for the new result set.
  useEffect(() => {
    loadOrders();
    setOrderPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode, customFrom, customTo, statusFilter]);

  // If the users list shrinks (e.g. after deleting someone) and the
  // current page no longer exists, clamp back to the last valid page.
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));
    if (userPage > maxPage) setUserPage(maxPage);
  }, [users, userPage]);

  // -----------------------------------------------------------------
  // Menu management
  // -----------------------------------------------------------------

  function handleMenuFormChange(e) {
    const { name, value, type, checked } = e.target;
    setMenuForm({ ...menuForm, [name]: type === 'checkbox' ? checked : value });
  }

  // Loads an existing menu into the form for editing.
  function editMenu(m) {
    setMenuForm({
      date: new Date(m.date).toISOString().slice(0, 10),
      itemName: m.itemName,
      description: m.description || '',
      price: m.price,
      isPublished: m.isPublished,
    });
    setMenuMessage('');
    setMenuError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleMenuSubmit(e) {
    e.preventDefault();
    setMenuMessage('');
    setMenuError('');
    if (!menuForm.date || !menuForm.itemName) {
      setMenuError('Date and dish name are required.');
      return;
    }
    setSavingMenu(true);
    try {
      // POST /menus is an "upsert" on the backend - if a menu already
      // exists for that date it gets updated, otherwise a new one is created.
      await api.post('/menus', menuForm);
      setMenuMessage(`Menu saved for ${menuForm.date}.`);
      setMenuForm(emptyMenuForm);
      loadStatics();
      loadOrders(); // in case the edited menu affects the currently viewed report
    } catch (err) {
      setMenuError(err.response?.data?.error || 'Failed to save menu.');
    } finally {
      setSavingMenu(false);
    }
  }

  // Only show this week's menus in the "Scheduled menus" table, even
  // though `menus` holds every menu ever created. The create/edit form
  // above can still target any date, past or future.
  const { monday, sunday } = getCurrentWeekRange();
  const weekMenus = menus.filter((m) => {
    const d = new Date(m.date);
    return d >= monday && d <= sunday;
  });

  // -----------------------------------------------------------------
  // Vendor management
  // -----------------------------------------------------------------

  function handleVendorFormChange(e) {
    setVendorForm({ ...vendorForm, [e.target.name]: e.target.value });
  }

  async function handleVendorSubmit(e) {
    e.preventDefault();
    setVendorMessage('');
    if (!vendorForm.name) return;
    setSavingVendor(true);
    try {
      await api.post('/admin/vendors', vendorForm);
      setVendorMessage(`Vendor "${vendorForm.name}" added.`);
      setVendorForm(emptyVendorForm);
      loadStatics();
    } catch (err) {
      setVendorMessage(err.response?.data?.error || 'Failed to add vendor.');
    } finally {
      setSavingVendor(false);
    }
  }

  // -----------------------------------------------------------------
  // User management (paginated)
  // -----------------------------------------------------------------

  async function handleDeleteUser(u) {
    if (!window.confirm(`Remove ${u.fullName} (${u.email})? They will no longer be able to log in.`)) return;
    setUserMessage('');
    try {
      // This is a "deactivate" under the hood, not a hard delete - see
      // backend/src/controllers/adminController.js for why (their past
      // orders need to stay intact for reporting).
      await api.delete(`/admin/users/${u.id}`);
      setUserMessage(`${u.fullName} removed.`);
      loadStatics();
    } catch (err) {
      setUserMessage(err.response?.data?.error || 'Failed to remove user.');
    }
  }

  const userTotalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));
  const pagedUsers = users.slice((userPage - 1) * USERS_PER_PAGE, userPage * USERS_PER_PAGE);

  // -----------------------------------------------------------------
  // Orders: selection + vendor assignment (paginated)
  // -----------------------------------------------------------------

  const orderTotalPages = Math.max(1, Math.ceil(ordersData.orders.length / ORDERS_PER_PAGE));
  const pagedOrders = ordersData.orders.slice(
    (orderPage - 1) * ORDERS_PER_PAGE,
    orderPage * ORDERS_PER_PAGE
  );

  function toggleSelectOne(id) {
    setSelectedOrderIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // The header checkbox only selects/deselects the rows on the CURRENT
  // page, not every order across all pages - this matches how most
  // table UIs behave and avoids silently selecting hundreds of hidden rows.
  function toggleSelectAll() {
    const pageIds = pagedOrders.map((o) => o.id);
    const allSelected = pageIds.every((id) => selectedOrderIds.includes(id));
    if (allSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  }

  // Shared by both the per-row "Assign" button (called with a single id)
  // and the "Assign to selected" bulk button (called with the full
  // selectedOrderIds array).
  async function assignToOrders(orderIds) {
    if (!rowAssignVendor) {
      setAssignMessage('Select a vendor first.');
      return;
    }
    setAssigning(true);
    setAssignMessage('');
    try {
      await api.post('/orders/assign-vendor', { orderIds, vendorId: rowAssignVendor });
      setAssignMessage(`Vendor assigned to ${orderIds.length} order${orderIds.length > 1 ? 's' : ''}.`);
      loadOrders();
    } catch (err) {
      setAssignMessage(err.response?.data?.error || 'Failed to assign vendor.');
    } finally {
      setAssigning(false);
    }
  }

  // -----------------------------------------------------------------
  // CSV export
  // -----------------------------------------------------------------

  async function handleExport() {
    const res = await api.get(`/admin/reports/daily?date=${exportDate}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lunch-report-${exportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // -----------------------------------------------------------------
  // Vendor-wise view: aggregates the SAME filtered orders client-side,
  // grouped by vendor instead of listed per-order. No separate API call.
  // -----------------------------------------------------------------
  const vendorRows = (() => {
    const map = {};
    for (const o of ordersData.orders) {
      const key = o.vendor ? o.vendor.name : 'Unassigned';
      if (!map[key]) map[key] = { vendor: key, quantity: 0, amount: 0 };
      map[key].quantity += o.quantity;
      map[key].amount += Number(o.totalAmount);
    }
    return Object.values(map);
  })();

  return (
    <div className="page">
      <AppHeader onLogout={logout} />
      <div className="page-wide">
        <h1>Admin dashboard</h1>
        <p className="greeting">Signed in as {user?.fullName}</p>

        {/* ================= MENU MANAGEMENT ================= */}
        <h2>Manage menu</h2>
        <div className="menu-hero">
          <form onSubmit={handleMenuSubmit}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="field" style={{ flex: '1 1 160px' }}>
                <label>Date</label>
                <input type="date" name="date" value={menuForm.date} onChange={handleMenuFormChange} required />
              </div>
              <div className="field" style={{ flex: '2 1 240px' }}>
                <label>Dish name</label>
                <input
                  name="itemName"
                  value={menuForm.itemName}
                  onChange={handleMenuFormChange}
                  required
                  placeholder="e.g. Chicken Biryani"
                />
              </div>
              <div className="field" style={{ flex: '1 1 120px' }}>
                <label>Price (Rs.)</label>
                <input type="number" name="price" value={menuForm.price} onChange={handleMenuFormChange} min="0" step="0.01" />
              </div>
            </div>
            <div className="field">
              <label>Description (optional)</label>
              <input
                name="description"
                value={menuForm.description}
                onChange={handleMenuFormChange}
                placeholder="e.g. Served with raita and salad"
              />
            </div>
            <div className="field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="isPublished"
                name="isPublished"
                checked={menuForm.isPublished}
                onChange={handleMenuFormChange}
                style={{ width: 'auto' }}
              />
              <label htmlFor="isPublished" style={{ margin: 0 }}>
                Published (visible to employees)
              </label>
            </div>
            {menuError && <p className="msg-error">{menuError}</p>}
            {menuMessage && <p className="msg-success">{menuMessage}</p>}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn" disabled={savingMenu}>
                {savingMenu ? 'Saving…' : 'Save menu'}
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => setMenuForm(emptyMenuForm)}>
                Clear
              </button>
            </div>
          </form>
        </div>

        <h2>Scheduled menus — this week</h2>
        {weekMenus.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)' }}>No menus scheduled for this week yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Dish</th>
                <th>Price</th>
                <th>Published</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {weekMenus.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                  <td>{m.itemName}</td>
                  <td>Rs. {m.price}</td>
                  <td>{m.isPublished ? 'Yes' : 'No'}</td>
                  <td>
                    <button className="btn btn-quiet btn-sm" onClick={() => editMenu(m)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ================= VENDOR MANAGEMENT ================= */}
        <h2>Manage vendors</h2>
        <form className="panel-row" onSubmit={handleVendorSubmit}>
          <div className="field" style={{ marginBottom: 0 }}>
            <input name="name" value={vendorForm.name} onChange={handleVendorFormChange} placeholder="Vendor name" required />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <input
              name="contactInfo"
              value={vendorForm.contactInfo}
              onChange={handleVendorFormChange}
              placeholder="Contact (phone/email, optional)"
            />
          </div>
          <button type="submit" className="btn" disabled={savingVendor}>
            {savingVendor ? 'Adding…' : 'Add vendor'}
          </button>
        </form>
        {vendorMessage && <p className="msg-success">{vendorMessage}</p>}
        {vendors.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id}>
                  <td>{v.name}</td>
                  <td>{v.contactInfo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ================= USER MANAGEMENT (5 per page) ================= */}
        <h2>Manage users</h2>
        {userMessage && <p className="msg-success">{userMessage}</p>}
        {users.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)' }}>No employees registered yet.</p>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.fullName}</td>
                    <td>{u.email}</td>
                    <td>{u.phone || '—'}</td>
                    <td>{u.isActive ? 'Active' : 'Removed'}</td>
                    <td>
                      {u.isActive && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u)}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={userPage} totalPages={userTotalPages} onChange={setUserPage} />
          </>
        )}

        {/* ================= ORDERS REPORT (10 per page) ================= */}
        <h2>Orders</h2>

        {/* --- Filter bar: quick date chips + custom range + status --- */}
        <div className="filter-row">
          <div className="chip-group">
            <button
              type="button"
              className={`chip ${filterMode === 'today' ? 'active' : ''}`}
              onClick={() => setFilterMode('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={`chip ${filterMode === 'yesterday' ? 'active' : ''}`}
              onClick={() => setFilterMode('yesterday')}
            >
              Yesterday
            </button>
            <button
              type="button"
              className={`chip ${filterMode === 'custom' ? 'active' : ''}`}
              onClick={() => setFilterMode('custom')}
            >
              Custom range
            </button>
          </div>
          {filterMode === 'custom' && (
            <>
              <div className="field">
                <label>From</label>
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              </div>
              <div className="field">
                <label>To</label>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            </>
          )}
          <div className="field">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              <option value="CONFIRMED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* --- User-wise / Vendor-wise toggle --- */}
        <div className="tab-row">
          <button className={`tab-btn ${reportView === 'user' ? 'active' : ''}`} onClick={() => setReportView('user')}>
            User-wise
          </button>
          <button className={`tab-btn ${reportView === 'vendor' ? 'active' : ''}`} onClick={() => setReportView('vendor')}>
            Vendor-wise
          </button>
        </div>

        {reportView === 'user' ? (
          <>
            {/* Vendor assignment controls - one dropdown shared by both the
                bulk "Assign to selected" button and every row's individual
                "Assign" button below. */}
            <div className="panel-row">
              <select value={rowAssignVendor} onChange={(e) => setRowAssignVendor(e.target.value)}>
                <option value="">Select vendor…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <button
                className="btn"
                disabled={selectedOrderIds.length === 0 || assigning}
                onClick={() => assignToOrders(selectedOrderIds)}
              >
                Assign to selected ({selectedOrderIds.length})
              </button>
              {assignMessage && (
                <span className="msg-success" style={{ margin: 0 }}>
                  {assignMessage}
                </span>
              )}
            </div>

            {ordersData.orders.length === 0 ? (
              <p style={{ color: 'var(--ink-soft)' }}>No orders in this range.</p>
            ) : (
              <>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={pagedOrders.length > 0 && pagedOrders.every((o) => selectedOrderIds.includes(o.id))}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th>Date</th>
                      <th>Employee</th>
                      <th>Dish</th>
                      <th>Quantity</th>
                      <th>Amount</th>
                      <th>Vendor</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedOrders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(o.id)}
                            onChange={() => toggleSelectOne(o.id)}
                          />
                        </td>
                        <td>{new Date(o.menu.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                        <td>{o.user.fullName}</td>
                        <td>{o.menu?.itemName}</td>
                        <td>{o.quantity}</td>
                        <td>Rs. {o.totalAmount}</td>
                        <td>{o.vendor ? o.vendor.name : 'Unassigned'}</td>
                        <td>{statusBadge(o.status)}</td>
                        <td>
                          <button
                            className="btn btn-quiet btn-sm"
                            disabled={!rowAssignVendor || assigning}
                            onClick={() => assignToOrders([o.id])}
                          >
                            Assign
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Grand total always reflects the FULL filtered result set,
                      not just the current page - it comes straight from the
                      API response (ordersData.totalQuantity/totalAmount). */}
                  <tfoot>
                    <tr>
                      <td colSpan={4}>Grand total</td>
                      <td>{ordersData.totalQuantity}</td>
                      <td>Rs. {ordersData.totalAmount}</td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
                <Pagination page={orderPage} totalPages={orderTotalPages} onChange={setOrderPage} />
              </>
            )}
          </>
        ) : vendorRows.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)' }}>No orders in this range.</p>
        ) : (
          // Vendor-wise summary rows are already small (one row per vendor),
          // so this view isn't paginated.
          <table className="data-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Quantity</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {vendorRows.map((r) => (
                <tr key={r.vendor}>
                  <td>{r.vendor}</td>
                  <td>{r.quantity}</td>
                  <td>Rs. {r.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Grand total</td>
                <td>{ordersData.totalQuantity}</td>
                <td>Rs. {ordersData.totalAmount}</td>
              </tr>
            </tfoot>
          </table>
        )}

        {/* ================= EXPORT ================= */}
        <h2>Export</h2>
        <div className="panel-row">
          <div className="field" style={{ marginBottom: 0 }}>
            <input type="date" value={exportDate} onChange={(e) => setExportDate(e.target.value)} />
          </div>
          <button onClick={handleExport} className="btn btn-quiet">
            Download CSV for this date
          </button>
        </div>
      </div>
    </div>
  );
}
