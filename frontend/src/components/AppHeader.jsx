import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';

// Top navigation bar shown on both the employee and admin dashboards.
// "onLogout" is passed in by whichever page renders this (see
// pages/employee/Dashboard.jsx and pages/admin/Dashboard.jsx).
export default function AppHeader({ onLogout }) {
  return (
    <div className="topbar">
      <BrandMark />
      <div className="topbar-actions">
        <Link to="/change-password">Change password</Link>
        <button className="btn btn-quiet" onClick={onLogout}>
          Log out
        </button>
      </div>
    </div>
  );
}
