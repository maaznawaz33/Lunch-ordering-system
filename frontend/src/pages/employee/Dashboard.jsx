import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import AppHeader from '../../components/AppHeader';

// Employee's main screen: shows whichever day's menu is currently
// orderable (see backend/src/utils/orderWindow.js for the "today before
// 9:30, tomorrow after 9:30" logic), a quantity picker, and their past
// order history.
export default function EmployeeDashboard() {
  const { user, logout } = useAuth();

  const [menu, setMenu] = useState(null);
  // dayLabel is "Today" or "Tomorrow"; weekday is e.g. "Saturday".
  // Both come straight from the backend's /menus/today response so the
  // frontend never has to duplicate the cutoff-time math itself.
  const [dayInfo, setDayInfo] = useState({ dayLabel: '', weekday: '' });

  const [quantity, setQuantity] = useState(1);
  const [orders, setOrders] = useState([]);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success'); // 'success' | 'error'

  async function loadData() {
    try {
      const menuRes = await api.get('/menus/today');
      setMenu(menuRes.data.menu);
      setDayInfo({ dayLabel: menuRes.data.dayLabel, weekday: menuRes.data.weekday });
    } catch (err) {
      // A 404 here just means that day's menu hasn't been published yet -
      // the backend still sends dayLabel/weekday on the error response so
      // we can show "Saturday's menu hasn't been published yet."
      setMenu(null);
      setDayInfo({
        dayLabel: err.response?.data?.dayLabel || '',
        weekday: err.response?.data?.weekday || '',
      });
    }
    const ordersRes = await api.get('/orders/mine');
    setOrders(ordersRes.data.orders);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleOrder(e) {
    e.preventDefault();
    setMessage('');
    try {
      await api.post('/orders', { quantity });
      setMessage(`Order confirmed for ${dayInfo.weekday || 'the selected day'}.`);
      setMessageType('success');
      loadData(); // refresh so the order history list picks up the new order
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to place order.');
      setMessageType('error');
    }
  }

  const heading = dayInfo.dayLabel
    ? `${dayInfo.dayLabel}'s dish${dayInfo.weekday ? ` — ${dayInfo.weekday}` : ''}`
    : "Today's dish";

  return (
    <div className="page">
      <AppHeader onLogout={logout} />
      <div className="page-wide">
        <h1>Hi, {user?.fullName?.split(' ')[0]}</h1>
        <p className="greeting">
          Orders close daily at 9:30 AM — after that, you're ordering for the next day.
        </p>

        <div className="menu-hero">
          {menu ? (
            <>
              <p className="menu-hero-eyebrow">{heading}</p>
              <p className="menu-hero-name">{menu.itemName}</p>
              <div className="price-tag">Rs. {menu.price}</div>
              <form className="order-form" onSubmit={handleOrder}>
                <div className="field">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn">
                  Confirm order
                </button>
              </form>
              {message && (
                <p className={messageType === 'error' ? 'msg-error' : 'msg-success'}>{message}</p>
              )}
            </>
          ) : (
            <p className="menu-empty">
              {dayInfo.weekday
                ? `${dayInfo.weekday}'s menu hasn't been published yet.`
                : "Menu hasn't been published yet."}{' '}
              Check back shortly.
            </p>
          )}
        </div>

        <h2>Your order history</h2>
        {orders.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)' }}>No orders yet.</p>
        ) : (
          <ul className="order-list">
            {orders.map((o) => (
              <li key={o.id}>
                <span className="order-date">
                  {new Date(o.menu.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span style={{ flex: 1, marginLeft: '1rem' }}>
                  {o.menu.itemName} × {o.quantity}
                </span>
                <span style={{ marginRight: '1rem' }}>Rs. {o.totalAmount}</span>
                <span className="order-status">{o.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
