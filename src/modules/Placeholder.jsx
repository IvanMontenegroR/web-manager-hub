export default function Placeholder({ title, desc, icon: Icon }) {
  return (
    <div className="content">
      <div className="placeholder-mod">
        <div className="pm-inner">
          <div className="pm-icon">{Icon && <Icon size={26} />}</div>
          <h2>{title}</h2>
          <p>{desc}</p>
          <span className="soon">En construccion</span>
        </div>
      </div>
    </div>
  )
}
