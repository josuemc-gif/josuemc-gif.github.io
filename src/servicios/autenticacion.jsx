import { useState } from 'react'

const ACCOUNTS_KEY = 'autodash-demo-accounts'
const SESSION_KEY = 'autodash-demo-session'
const HASH_ITERATIONS = 120000

function readAccounts() {
  const raw = localStorage.getItem(ACCOUNTS_KEY)
  if (!raw) return []

  const accounts = JSON.parse(raw)
  if (!Array.isArray(accounts)) {
    throw new Error('Los datos de acceso guardados están dañados. Borra el almacenamiento local de AutoDash para volver a empezar.')
  }
  return accounts
}

function writeAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

function toHex(bytes) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password, salt) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('El navegador requiere una conexión segura (HTTPS o localhost) para crear el acceso de demostración.')
  }

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const digest = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt: encoder.encode(salt),
    iterations: HASH_ITERATIONS,
    hash: 'SHA-256',
  }, key, 256)
  return toHex(digest)
}

function createSalt() {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Este navegador no permite generar credenciales seguras.')
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return toHex(bytes)
}

function createAccountId() {
  return createSalt()
}

function asUser(account) {
  return {
    id: account.id,
    email: account.email,
    user_metadata: { username: account.username },
  }
}

export function mensajeErrorAutenticacion(error, contexto) {
  const message = error?.message?.toLowerCase() || ''
  if (message.includes('already registered')) return 'Ya existe una cuenta con ese correo en este navegador.'
  if (message.includes('invalid login credentials')) return 'El correo o la contraseña no son correctos.'
  if (message.includes('quota') || message.includes('storage')) return 'No se pudo guardar la cuenta. Revisa el almacenamiento disponible del navegador.'
  if (message.includes('access is denied') || message.includes('securityerror')) return 'El navegador bloqueó el almacenamiento local. Permite los datos del sitio e inténtalo de nuevo.'
  if (error?.message) return error.message

  return {
    registro: 'No se pudo crear la cuenta de demostración.',
    acceso: 'No se pudo iniciar sesión.',
    cierre: 'No se pudo cerrar la sesión.',
  }[contexto] || 'No se pudo completar la solicitud.'
}

export function useAutenticacion() {
  const [initialAuth] = useState(() => {
    try {
      const sessionId = localStorage.getItem(SESSION_KEY)
      if (sessionId) {
        const account = readAccounts().find((item) => item.id === sessionId)
        if (account) return { user: asUser(account), error: '' }
        localStorage.removeItem(SESSION_KEY)
      }
      return { user: null, error: '' }
    } catch (error) {
      return { user: null, error: mensajeErrorAutenticacion(error, 'acceso') }
    }
  })
  const [user, setUser] = useState(initialAuth.user)
  const [loading] = useState(false)
  const [initializationError] = useState(initialAuth.error)

  async function iniciarSesion(email, password) {
    const accounts = readAccounts()
    const account = accounts.find((item) => item.email === email.trim().toLowerCase())
    if (!account || await hashPassword(password, account.salt) !== account.passwordHash) {
      throw new Error('Invalid login credentials')
    }
    localStorage.setItem(SESSION_KEY, account.id)
    setUser(asUser(account))
  }

  async function registrarCuenta(username, email, password) {
    const accounts = readAccounts()
    const normalizedEmail = email.trim().toLowerCase()
    if (accounts.some((item) => item.email === normalizedEmail)) {
      throw new Error('User already registered')
    }

    const salt = createSalt()
    const account = {
      id: createAccountId(),
      username: username.trim(),
      email: normalizedEmail,
      salt,
      passwordHash: await hashPassword(password, salt),
    }
    writeAccounts([...accounts, account])
    localStorage.setItem(SESSION_KEY, account.id)
    setUser(asUser(account))
  }

  async function cerrarSesion() {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  return {
    user,
    loading,
    initializationError,
    iniciarSesion,
    registrarCuenta,
    cerrarSesion,
  }
}
