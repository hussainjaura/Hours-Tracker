function MenuButton({ isOpen, onClose, links, onToggle }) {

    return (
    <>
      <button type="button" className="mobile-landing-menu" onClick={onToggle}>☰</button>
    {/* if true the menu button will slide open */}
      {isOpen && (
        <div className="landing-drawer-overlay" onClick={onClose}>
          <aside className="landing-drawer" onClick={e => e.stopPropagation()}>
            <div className="landing-drawer-header">
                <div className="landing-drawer-title">
                    <span className="landing-drawer-mark">ISC</span>
                    <span>Menu</span>
                </div>
                <button className="landing-drawer-close" onClick={onClose} aria-label="Close menu">×</button>
            </div>
            <nav className="landing-drawer-nav">
              {links.map(link => (
                <a key={link.href} href={link.href} onClick={onClose}>{link.label}</a>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </>
  )
}

export default MenuButton
