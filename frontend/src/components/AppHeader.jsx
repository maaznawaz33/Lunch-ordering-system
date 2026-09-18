import { Link } from 'react-router-dom';

const LOGO_URL =
  'https://365news.pk/wp-content/uploads/2025/01/channels4_profile-removebg-preview-1.png';

export default function AppHeader({ onLogout }) {
  return (
    <div className="topbar">
      <div className="topbar-brand">
        <img src={LOGO_URL} alt="Company logo" />
        <span>Lunch Board</span>
      </div>
      <div className="topbar-actions">
        <Link to="/change-password">Change password</Link>
        <button className="btn btn-quiet" onClick={onLogout}>
          Log out
        </button>
      </div>
    </div>
  );
}
