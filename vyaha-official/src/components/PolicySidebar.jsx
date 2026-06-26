import { Link, useNavigate } from 'react-router-dom';
import { policyNavSections } from '../content/policyNav';

function PolicySidebar({ activePageType }) {
  return (
    <aside className="policy-sidebar" aria-label="Policy navigation">
      <nav className="policy-sidebar-nav">
        {policyNavSections.map((section) => (
          <div key={section.id} className="policy-sidebar-section">
            <p className="policy-sidebar-section-title">{section.title}</p>
            <ul className="policy-sidebar-list">
              {section.items.map((item) => {
                const isActive = item.pageType === activePageType;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`policy-sidebar-link${isActive ? ' policy-sidebar-link--active' : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function PolicyMobileNav({ activePageType }) {
  const navigate = useNavigate();
  const navItems = policyNavSections.flatMap((section) => section.items);
  const hasActiveItem = navItems.some((item) => item.pageType === activePageType);

  return (
    <label className="policy-mobile-nav">
      <span className="policy-mobile-nav-label">Jump to page</span>
      <select
        className="policy-mobile-nav-select"
        value={hasActiveItem ? activePageType : ''}
        onChange={(event) => {
          const item = navItems.find((navItem) => navItem.pageType === event.target.value);
          if (item) {
            navigate(item.path);
          }
        }}
      >
        {!hasActiveItem ? <option value="">Select a page</option> : null}
        {policyNavSections.map((section) => (
          <optgroup key={section.id} label={section.title}>
            {section.items.map((item) => (
              <option key={item.path} value={item.pageType}>
                {item.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

export default PolicySidebar;
