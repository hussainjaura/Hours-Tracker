// Shows a person's name under their main identifier (University ID for
// students, organisation for employers), with a small role label in front.
// Older accounts were created before names were collected, so fall back
// to a muted "Name not provided" rather than leaving a gap.
function PersonName({ name, role = 'Student', className = '' }) {
  return (
    <div className={`person-name ${name ? '' : 'person-name-missing'} ${className}`.trim()}>
      <span className="person-name-role">{role}</span>
      <span className="person-name-value">{name || 'Name not provided'}</span>
    </div>
  )
}

export default PersonName
