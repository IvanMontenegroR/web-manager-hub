import { useState, useEffect } from 'react'
import { FolderPlus, Users, CalendarOff, Download, RotateCw, CalendarX2, CalendarRange, EyeOff, Eye, Archive, ChevronRight, ChevronDown, Ghost, Settings } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import Gantt from '../components/gantt/Gantt.jsx'
import ControlPanel from '../components/panels/ControlPanel.jsx'
import DelayPanel from '../components/panels/DelayPanel.jsx'
import ProjectModal from '../components/modals/ProjectModal.jsx'
import TaskModal from '../components/modals/TaskModal.jsx'
import PartnersModal from '../components/modals/PartnersModal.jsx'
import HolidaysModal from '../components/modals/HolidaysModal.jsx'
import LaunchWidget from '../components/panels/LaunchWidget.jsx'
import { deleteProject, deleteTask, setProjectArchived } from '../lib/db'
import { exportGlobal, exportProject } from '../lib/exportTimeline'

export default function WebProjects() {
  const { loading, error, projects, tasks, partners, enriched, refresh } = useData()
  const [modal, setModal] = useState(null) // {type, project?, task?}
  // Preferencias de vista: todas se recuerdan entre sesiones (localStorage).
  const [hidePast, setHidePast] = useState(() => localStorage.getItem('wmh_hidepast') === '1')
  const [zoom, setZoom] = useState(() => (localStorage.getItem('wmh_zoom') === 'week' ? 'week' : 'day'))
  const [showGhosts, setShowGhosts] = useState(() => localStorage.getItem('wmh_ghosts') === '1')
  const [archivedOpen, setArchivedOpen] = useState(() => localStorage.getItem('wmh_archived_open') === '1')
  const [showHiddenBar, setShowHiddenBar] = useState(false) // popover transitorio, no se recuerda
  const [adminOpen, setAdminOpen] = useState(false) // popover transitorio, no se recuerda
  const [hidden, setHidden] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('wmh_hidden_projects') || '[]')) } catch { return new Set() }
  })
  useEffect(() => {
    localStorage.setItem('wmh_hidden_projects', JSON.stringify([...hidden]))
  }, [hidden])
  useEffect(() => { localStorage.setItem('wmh_zoom', zoom) }, [zoom])
  useEffect(() => { localStorage.setItem('wmh_ghosts', showGhosts ? '1' : '0') }, [showGhosts])
  useEffect(() => { localStorage.setItem('wmh_hidepast', hidePast ? '1' : '0') }, [hidePast])
  useEffect(() => { localStorage.setItem('wmh_archived_open', archivedOpen ? '1' : '0') }, [archivedOpen])

  const archivedProjects = projects.filter((p) => p.archived)
  const hiddenExisting = projects.filter((p) => !p.archived && hidden.has(p.id))
  const activeProjects = projects.filter((p) => !p.archived && !hidden.has(p.id))

  const hideProject = (project) => setHidden((s) => new Set(s).add(project.id))
  const unhideProject = (id) => setHidden((s) => { const n = new Set(s); n.delete(id); return n })
  const showAllHidden = () => setHidden(new Set())

  async function handleDeleteProject(project) {
    if (!confirm(`Borrar el proyecto "${project.name}" y todas sus tareas? Esta accion no se puede deshacer.`)) return
    await deleteProject(project.id)
    await refresh()
  }

  async function handleArchiveProject(project) {
    await setProjectArchived(project.id, !project.archived)
    await refresh()
  }

  async function handleDeleteTask(task, project) {
    if (!confirm(`Borrar la tarea "${task.action_name}" de ${project.name}?`)) return
    await deleteTask(task.id)
    await refresh()
  }

  function handleExportProject(project) {
    exportProject(project, enriched, partners)
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Web Projects</h1>
          <div className="sub">Gantt maestro por dia, solapamientos y retrasos</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-icon" title="Recargar" onClick={refresh}><RotateCw size={16} /></button>
          <button
            className={`btn${hidePast ? ' active' : ''}`}
            title={hidePast ? 'Mostrar dias pasados' : 'Ocultar dias pasados'}
            onClick={() => setHidePast((v) => !v)}
          >
            <CalendarX2 size={16} /> {hidePast ? 'Mostrando desde hoy' : 'Ocultar pasado'}
          </button>
          <button
            className={`btn${zoom === 'week' ? ' active' : ''}`}
            title={zoom === 'week' ? 'Ver por días' : 'Ver por semanas'}
            onClick={() => setZoom((z) => (z === 'week' ? 'day' : 'week'))}
          >
            <CalendarRange size={16} /> {zoom === 'week' ? 'Semanas' : 'Días'}
          </button>
          <button
            className={`btn${showGhosts ? ' active' : ''}`}
            title={showGhosts ? 'Ocultar plan original (fantasmas)' : 'Mostrar plan original (fantasmas)'}
            onClick={() => setShowGhosts((v) => !v)}
          >
            <Ghost size={16} /> Fantasmas
          </button>
          {hiddenExisting.length > 0 && (
            <button
              className={`btn${showHiddenBar ? ' active' : ''}`}
              title="Proyectos ocultos"
              onClick={() => setShowHiddenBar((v) => !v)}
            >
              <EyeOff size={16} /> {hiddenExisting.length} oculto{hiddenExisting.length > 1 ? 's' : ''}
            </button>
          )}
          <button className="btn" onClick={() => exportGlobal(enriched, projects, partners)} disabled={tasks.length === 0}>
            <Download size={16} /> Exportar
          </button>
          <div className="dropdown">
            <button className={`btn${adminOpen ? ' active' : ''}`} title="Administracion" onClick={() => setAdminOpen((v) => !v)}>
              <Settings size={16} /> Admin <ChevronDown size={13} />
            </button>
            {adminOpen && (
              <>
                <div className="dropdown-overlay" onClick={() => setAdminOpen(false)} />
                <div className="dropdown-menu">
                  <button className="dropdown-item" onClick={() => { setModal({ type: 'partners' }); setAdminOpen(false) }}><Users size={15} /> Partners</button>
                  <button className="dropdown-item" onClick={() => { setModal({ type: 'holidays' }); setAdminOpen(false) }}><CalendarOff size={15} /> Feriados</button>
                </div>
              </>
            )}
          </div>
          <button className="btn btn-primary" onClick={() => setModal({ type: 'project' })}>
            <FolderPlus size={16} /> Nuevo proyecto
          </button>
        </div>
      </div>

      <div className="content">
        {loading ? (
          <div className="center-state"><div className="spinner" /><div>Cargando datos...</div></div>
        ) : error ? (
          <div className="center-state">
            <div style={{ color: 'var(--danger)', fontWeight: 600 }}>No se pudo cargar Supabase</div>
            <div style={{ fontSize: 13 }}>{error}</div>
            <button className="btn" onClick={refresh}><RotateCw size={15} /> Reintentar</button>
          </div>
        ) : (
          <>
            {showHiddenBar && hiddenExisting.length > 0 && (
              <div className="hidden-bar">
                <span className="hb-label"><EyeOff size={13} /> Ocultos:</span>
                {hiddenExisting.map((p) => (
                  <button key={p.id} className="hb-chip" title="Restaurar" onClick={() => unhideProject(p.id)}>
                    {p.name} <Eye size={12} />
                  </button>
                ))}
                <button className="btn btn-sm" onClick={showAllHidden}>Mostrar todos</button>
              </div>
            )}
            <LaunchWidget />
            <div className="legend">
              <span className="lg-label">Estado:</span>
              <span className="lg"><span className="lg-swatch" style={{ background: 'var(--ink-3)' }} /> Pendiente</span>
              <span className="lg"><span className="lg-swatch" style={{ background: 'var(--info)' }} /> En curso</span>
              <span className="lg"><span className="lg-swatch" style={{ background: 'var(--ok)' }} /> Completado</span>
              <span className="lg-sep" />
              <span className="lg"><span className="lg-dot" /> Punto = partner</span>
              <span className="lg"><span className="lg-swatch conflict" /> Solapamiento de partner</span>
              <span className="lg"><span className="lg-swatch delay" /> Delay</span>
              {showGhosts && <span className="lg"><span className="lg-swatch ghost" /> Plan original (fantasma)</span>}
              <span className="lg"><span className="lg-swatch launch" /> Market Launch (deadline del mercado)</span>
              <span className="lg"><span className="lg-swatch nonwork" /> Finde / feriado (no laboral)</span>
            </div>

            <Gantt
              projects={activeProjects}
              hidePast={hidePast}
              zoom={zoom}
              showGhosts={showGhosts}
              onHideProject={hideProject}
              emptyLabel={
                archivedProjects.length > 0
                  ? 'No hay proyectos activos. Los archivados estan abajo.'
                  : 'No hay proyectos todavia. Crea el primero con el boton Nuevo proyecto.'
              }
              onEditProject={(p) => setModal({ type: 'project', project: p })}
              onDeleteProject={handleDeleteProject}
              onArchiveProject={handleArchiveProject}
              onAddTask={(p) => setModal({ type: 'task', project: p })}
              onEditTask={(t, p) => setModal({ type: 'task', task: t, project: p })}
              onDeleteTask={handleDeleteTask}
              onExportProject={handleExportProject}
            />

            <div className="panels">
              <ControlPanel />
              <DelayPanel />
            </div>

            {archivedProjects.length > 0 && (
              <div className={`archived${archivedOpen ? ' open' : ''}`}>
                <button className="archived-toggle" onClick={() => setArchivedOpen((v) => !v)}>
                  <ChevronRight size={16} className="chev" />
                  <Archive size={15} />
                  <span>Proyectos archivados</span>
                  <span className="count">{archivedProjects.length}</span>
                </button>
                {archivedOpen && (
                  <div className="archived-body">
                    <Gantt
                      projects={archivedProjects}
                      hidePast={false}
                      zoom={zoom}
                      showGhosts={showGhosts}
                      onEditProject={(p) => setModal({ type: 'project', project: p })}
                      onDeleteProject={handleDeleteProject}
                      onArchiveProject={handleArchiveProject}
                      onAddTask={(p) => setModal({ type: 'task', project: p })}
                      onEditTask={(t, p) => setModal({ type: 'task', task: t, project: p })}
                      onDeleteTask={handleDeleteTask}
                      onExportProject={handleExportProject}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {modal?.type === 'project' && (
        <ProjectModal project={modal.project} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'task' && (
        <TaskModal task={modal.task} project={modal.project} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'partners' && <PartnersModal onClose={() => setModal(null)} />}
      {modal?.type === 'holidays' && <HolidaysModal onClose={() => setModal(null)} />}
    </>
  )
}
