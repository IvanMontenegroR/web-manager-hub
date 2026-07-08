import { useState } from 'react'
import { FolderPlus, Users, Timer, Download, RotateCw, CalendarX2 } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import Gantt from '../components/gantt/Gantt.jsx'
import OverlapPanel from '../components/panels/OverlapPanel.jsx'
import DelayPanel from '../components/panels/DelayPanel.jsx'
import ProjectModal from '../components/modals/ProjectModal.jsx'
import TaskModal from '../components/modals/TaskModal.jsx'
import PartnersModal from '../components/modals/PartnersModal.jsx'
import SlaModal from '../components/modals/SlaModal.jsx'
import { deleteProject, deleteTask } from '../lib/db'
import { exportGlobal } from '../lib/exportXlsx'

export default function WebProjects() {
  const { loading, error, projects, tasks, partners, refresh } = useData()
  const [modal, setModal] = useState(null) // {type, project?, task?}
  const [hidePast, setHidePast] = useState(false)

  async function handleDeleteProject(project) {
    if (!confirm(`Borrar el proyecto "${project.name}" y todas sus tareas? Esta accion no se puede deshacer.`)) return
    await deleteProject(project.id)
    await refresh()
  }

  async function handleDeleteTask(task, project) {
    if (!confirm(`Borrar la tarea "${task.action_name}" de ${project.name}?`)) return
    await deleteTask(task.id)
    await refresh()
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
          <button className="btn" onClick={() => setModal({ type: 'partners' })}><Users size={16} /> Partners</button>
          <button className="btn" onClick={() => setModal({ type: 'slas' })}><Timer size={16} /> SLAs</button>
          <button className="btn" onClick={() => exportGlobal(tasks, projects, partners)} disabled={tasks.length === 0}>
            <Download size={16} /> Exportar
          </button>
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
            <div className="legend">
              <span className="lg"><span className="lg-swatch" style={{ background: 'var(--info)' }} /> Barra = tarea planificada (color del partner)</span>
              <span className="lg"><span className="lg-swatch conflict" /> Solapamiento de partner</span>
              <span className="lg"><span className="lg-swatch delay" /> Extension de retraso</span>
            </div>

            <Gantt
              hidePast={hidePast}
              onEditProject={(p) => setModal({ type: 'project', project: p })}
              onDeleteProject={handleDeleteProject}
              onAddTask={(p) => setModal({ type: 'task', project: p })}
              onEditTask={(t, p) => setModal({ type: 'task', task: t, project: p })}
              onDeleteTask={handleDeleteTask}
            />

            <div className="panels">
              <OverlapPanel />
              <DelayPanel />
            </div>
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
      {modal?.type === 'slas' && <SlaModal onClose={() => setModal(null)} />}
    </>
  )
}
