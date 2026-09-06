// Registro LOCAL de lo que el runner creo. No sale de la maquina: es para poder
// revertir (todo queda despublicado, pero hay que saber QUE se creo) y para la
// revision de compliance, que va a preguntar exactamente eso.
import { appendFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

export function logRun(entry, file = 'logs/runs.jsonl') {
  const path = resolve(file)
  mkdirSync(dirname(path), { recursive: true })
  appendFileSync(path, JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n')
  return path
}
