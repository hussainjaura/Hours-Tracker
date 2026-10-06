function MenuButton({ onToggle }) {
    return(
        <button
              type="button"
              className="mobile-landing-menu"
              onClick={onToggle}
            >
              ☰
        </button>
    )
}

export default MenuButton
