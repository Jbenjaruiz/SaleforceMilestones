import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import Icon from './Icon.jsx';

const ADMIN_LINKS = [
  { to: '/admin/projects', label: 'Proyectos' },
  { to: '/admin/users', label: 'Usuarios' },
  { to: '/admin/roles', label: 'Roles' },
];

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div className="container header__inner">
        <img className="header__logo" src={`${import.meta.env.BASE_URL}images/lucalza-logo.png`} alt="Lucalza" width="124" height="51" />
        <div className="header__title">
          <p className="eyebrow">Tablero ejecutivo</p>
          <h1>Proyectos corporativos</h1>
        </div>
        <div className="header__meta">
          <nav className="header__nav" aria-label="Principal">
            <NavLink to="/" end>Tablero</NavLink>
            {user?.isAdmin && ADMIN_LINKS.map((link) => <NavLink key={link.to} to={link.to}>{link.label}</NavLink>)}
          </nav>
          <div className="user-chip">
            <span className="user-chip__name">{user?.fullName}</span>
            <span className="user-chip__role">{user?.roleName}</span>
          </div>
          <button type="button" className="button button--light" onClick={logout}>
            <Icon name="logout" />
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
