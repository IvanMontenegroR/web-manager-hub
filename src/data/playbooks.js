import introBlocks from './intro-playbook.json'
import componentBlocks from './component-playbook.json'
import designBlocks from './design-playbook.json'

// Documentacion de la migracion Purina Ecosystem v2.0. El contenido (texto +
// imagenes en orden) se extrae de los playbooks .docx originales; las imagenes
// viven en public/docs/ y se referencian con BASE_URL. Cada doc es una lista de
// bloques ({type: h1|h2|h3|p|li|img|table|...}). Ver src/data/*.json.
export const PLAYBOOKS = [
  {
    id: 'intro',
    title: 'Introduction playbook',
    subtitle: 'Acciones base del backend usadas en todas las transacciones',
    tag: 'Base',
    blocks: introBlocks,
  },
  {
    id: 'component',
    title: 'Component page playbook',
    subtitle: 'Creacion y edicion de component pages, bloques y componentes',
    tag: 'Componentes',
    blocks: componentBlocks,
  },
  {
    id: 'design',
    title: 'Platform Design Guidelines',
    subtitle: 'Tamanos de imagen por componente, formatos y reglas de espaciado',
    tag: 'Diseno',
    blocks: designBlocks,
  },
]

export function getPlaybook(id) {
  return PLAYBOOKS.find((d) => d.id === id) || null
}
