import { useMemo, useState, useRef } from 'react'
import { ArrowLeft, List, X, ImageOff } from 'lucide-react'

// Prefijo de assets: en Pages es /web-manager-hub/, en dev '/'. Las imagenes
// de los playbooks viven en public/docs/ y el JSON las guarda como 'docs/xxx.png'.
const asset = (src) => (import.meta.env.BASE_URL || '/') + String(src || '').replace(/^\/+/, '')

// Un parrafo del playbook puede venir como "Término \t\t definición" (layout de
// 2 columnas aplanado). Lo detectamos para renderizarlo como fila término/def.
function splitDef(text) {
  if (!text.includes('\t')) return null
  const parts = text.split(/\t+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length >= 2) return [parts[0], parts.slice(1).join(' — ')]
  return null
}

function slug(text, i) {
  return 'sec-' + i + '-' + String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
}

function Figure({ src, onOpen }) {
  const [broken, setBroken] = useState(false)
  if (broken) {
    return (
      <div className="doc-fig doc-fig-broken"><ImageOff size={18} /> Imagen no disponible</div>
    )
  }
  return (
    <figure className="doc-fig">
      <img src={asset(src)} loading="lazy" alt="" onError={() => setBroken(true)} onClick={() => onOpen(asset(src))} />
    </figure>
  )
}

function Table({ rows, onOpen }) {
  if (!rows?.length) return null
  // ¿Alguna celda tiene solo imagen? Muchas "tablas" del doc son figuras con
  // caption al lado. Las renderizamos igual como grilla, con imagenes embebidas.
  return (
    <div className="doc-table-wrap">
      <table className="doc-table">
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}>
                  {cell.text && cell.text.split('\n').map((line, li) => <div key={li}>{line}</div>)}
                  {(cell.imgs || []).map((im, ii) => (
                    <img key={ii} className="doc-table-img" src={asset(im)} loading="lazy" alt="" onClick={() => onOpen(asset(im))} />
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DocViewer({ doc, onBack }) {
  const [lightbox, setLightbox] = useState(null)
  const bodyRef = useRef(null)

  // Indice de navegacion: solo H1.
  const toc = useMemo(
    () => doc.blocks
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => b.type === 'h1')
      .map(({ b, i }) => ({ id: slug(b.text, i), text: b.text })),
    [doc]
  )

  // Agrupamos <li> consecutivos en listas.
  const rendered = useMemo(() => {
    const out = []
    let list = null
    doc.blocks.forEach((b, i) => {
      if (b.type === 'li') {
        if (!list) { list = { type: 'ul', items: [] }; out.push(list) }
        list.items.push(b.text)
        return
      }
      list = null
      out.push({ ...b, _i: i })
    })
    return out
  }, [doc])

  function jump(id) {
    const el = bodyRef.current?.querySelector('#' + CSS.escape(id))
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="doc-viewer">
      <div className="doc-side">
        <button className="btn btn-sm doc-back" onClick={onBack}><ArrowLeft size={14} /> Documentacion</button>
        <div className="doc-toc-title"><List size={13} /> Contenido</div>
        <nav className="doc-toc">
          {toc.map((t) => (
            <button key={t.id} className="doc-toc-link" onClick={() => jump(t.id)}>{t.text}</button>
          ))}
        </nav>
      </div>

      <div className="doc-main" ref={bodyRef}>
        <div className="doc-head">
          <span className="doc-tag">{doc.tag}</span>
          <h1>{doc.title}</h1>
          <p>{doc.subtitle}</p>
        </div>

        <article className="doc-body">
          {rendered.map((b, k) => {
            if (b.type === 'ul') {
              return <ul key={k} className="doc-ul">{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
            }
            if (b.type === 'h1') return <h2 key={k} id={slug(b.text, b._i)} className="doc-h1">{b.text}</h2>
            if (b.type === 'h2') return <h3 key={k} className="doc-h2">{b.text}</h3>
            if (b.type === 'h3') return <h4 key={k} className="doc-h3">{b.text}</h4>
            if (b.type === 'title') return <div key={k} className="doc-lead">{b.text}</div>
            if (b.type === 'subtitle') return <div key={k} className="doc-sublead">{b.text}</div>
            if (b.type === 'img') return <Figure key={k} src={b.src} onOpen={setLightbox} />
            if (b.type === 'table') return <Table key={k} rows={b.rows} onOpen={setLightbox} />
            // parrafo: puede ser término/definición
            const def = splitDef(b.text)
            if (def) {
              return (
                <div key={k} className="doc-def">
                  <span className="doc-def-term">{def[0]}</span>
                  <span className="doc-def-desc">{def[1]}</span>
                </div>
              )
            }
            return <p key={k} className="doc-p">{b.text}</p>
          })}
        </article>
      </div>

      {lightbox && (
        <div className="doc-lightbox" onClick={() => setLightbox(null)}>
          <button className="doc-lightbox-close" onClick={() => setLightbox(null)}><X size={20} /></button>
          <img src={lightbox} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
