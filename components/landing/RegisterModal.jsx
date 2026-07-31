'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Sparkles, X } from 'lucide-react';
import { artistDisciplines } from '@/lib/site';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useMotionPresets } from '@/hooks/useMotionPresets';

const EMPTY_FORM = { name: '', email: '', discipline: '', portfolio: '', password: '' };

const COPY = {
  welcome: {
    title: '¿Quieres unirte a la comunidad?',
    description:
      'Crea tu cuenta y completa tu perfil para ser considerado como expositor o artista en nuestros próximos festivales.',
  },
  signup: {
    title: 'Crea tu cuenta',
    description: 'Cuéntanos quién eres y qué haces. Así te avisamos de cada convocatoria.',
  },
  login: {
    title: 'Hola de nuevo',
    description: 'Entra a tu cuenta para gestionar tu perfil de artista.',
  },
};

/** Validación mínima en cliente; los mensajes se anuncian vía aria-describedby. */
function validate(mode, values) {
  const errors = {};
  const email = values.email.trim();

  if (!email) errors.email = 'Necesitamos tu correo.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    errors.email = 'Ese correo no parece válido.';

  if (mode === 'signup') {
    if (!values.name.trim()) errors.name = 'Escribe tu nombre o el de tu marca.';
    if (!values.discipline) errors.discipline = 'Elige una categoría.';
  }

  if (mode === 'login' && !values.password) {
    errors.password = 'Escribe tu contraseña.';
  }

  return errors;
}

/** Mensaje de error de un campo. */
function FieldError({ id, children }) {
  return (
    <p id={id} className="mt-1.5 text-sm font-semibold text-yuca-coral-deep">
      {children}
    </p>
  );
}

/**
 * Campo de texto del formulario.
 * Vive a nivel de módulo (no dentro del modal) para que React no lo remonte en
 * cada pulsación y el input conserve el foco.
 */
function TextField({ id, label, value, error, onChange, optional = false, ...inputProps }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        {optional && <span className="ml-1 font-normal text-yuca-ink-soft">(opcional)</span>}
      </label>
      <input
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`field ${error ? 'field-invalid' : ''}`}
        {...inputProps}
      />
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}

/**
 * Modal de bienvenida / registro / inicio de sesión.
 *
 * Se cierra con Escape, con click fuera o con el botón de cerrar; atrapa el
 * foco mientras está abierto y lo devuelve al elemento que lo abrió.
 *
 * `variant` fija el estado inicial ('welcome' | 'signup' | 'login').
 * `onSubmit(payload)` es el punto de enganche para el backend; hoy sólo se
 * muestra la confirmación en pantalla.
 */
export default function RegisterModal({ open, variant = 'welcome', onClose, onSubmit }) {
  const dialogRef = useRef(null);
  const formRef = useRef(null);
  const { overlay, dialog } = useMotionPresets();

  const [mode, setMode] = useState(variant);
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useBodyScrollLock(open);
  useFocusTrap(open, dialogRef, onClose);

  // Cada apertura empieza limpia y en la variante pedida.
  useEffect(() => {
    if (!open) return;
    setMode(variant);
    setValues(EMPTY_FORM);
    setErrors({});
    setSubmitted(false);
  }, [open, variant]);

  const copy = COPY[mode] ?? COPY.welcome;

  const handleChange = (field) => (event) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [field]: value }));
    // El error desaparece en cuanto la persona corrige el campo.
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  /** Cambia de vista y lleva el foco al formulario recién montado. */
  const goToMode = (next) => {
    setMode(next);
    setErrors({});
    window.requestAnimationFrame(() => {
      formRef.current?.querySelector('input, select')?.focus();
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate(mode, values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      // Lleva el foco al primer campo con problema.
      window.requestAnimationFrame(() => {
        formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
      });
      return;
    }

    // TODO: conectar con el backend/CRM real de Proyecto Yuca.
    onSubmit?.({ mode, values });
    setSubmitted(true);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          {/* Capa de fondo: cerrar al tocar fuera */}
          <motion.div
            className="absolute inset-0 bg-yuca-ink/50 backdrop-blur-sm"
            variants={overlay}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby="modal-description"
            className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-4xl bg-yuca-bg p-6 shadow-lift sm:rounded-4xl sm:p-8"
            variants={dialog}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="btn-ghost absolute right-4 top-4 p-1.5 text-yuca-ink-soft hover:text-yuca-ink"
            >
              <X size={22} aria-hidden="true" />
            </button>

            {submitted ? (
              /* ---------- Confirmación ---------- */
              <div className="py-2 text-center">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-yuca-green-mist">
                  <CheckCircle2 size={28} className="text-yuca-green" aria-hidden="true" />
                </span>
                <h2 id="modal-title" className="mb-2 text-2xl">
                  {mode === 'login' ? '¡Bienvenida de vuelta!' : '¡Ya eres una YUQUITA más!'}
                </h2>
                <p id="modal-description" className="mb-6 leading-relaxed text-yuca-ink-soft">
                  {mode === 'login'
                    ? 'Estamos preparando tu panel de artista.'
                    : `Te escribiremos a ${values.email} en cuanto se abra la próxima convocatoria.`}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary btn-lg w-full"
                  data-autofocus
                >
                  Volver a la web
                </button>
              </div>
            ) : (
              <>
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-yuca-cream">
                  <Sparkles size={22} className="text-yuca-coral" aria-hidden="true" />
                </span>

                <h2 id="modal-title" className="mb-2 text-2xl">
                  {copy.title}
                </h2>
                <p id="modal-description" className="mb-6 leading-relaxed text-yuca-ink-soft">
                  {copy.description}
                </p>

                {mode === 'welcome' ? (
                  /* ---------- Bienvenida ---------- */
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => goToMode('signup')}
                      className="btn-primary btn-lg w-full"
                      data-autofocus
                    >
                      Crear cuenta
                    </button>
                    <button type="button" onClick={onClose} className="btn-outline btn-lg w-full">
                      Ahora no
                    </button>
                  </div>
                ) : (
                  /* ---------- Registro / inicio de sesión ---------- */
                  <form
                    ref={formRef}
                    onSubmit={handleSubmit}
                    noValidate
                    className="flex flex-col gap-4"
                  >
                    {mode === 'signup' && (
                      <TextField
                        id="name"
                        label="Nombre o marca"
                        value={values.name}
                        error={errors.name}
                        onChange={handleChange('name')}
                        autoComplete="name"
                        placeholder="Yuquita Ilustra"
                        data-autofocus
                      />
                    )}

                    <TextField
                      id="email"
                      label="Correo"
                      type="email"
                      value={values.email}
                      error={errors.email}
                      onChange={handleChange('email')}
                      autoComplete="email"
                      placeholder="hola@correo.com"
                      {...(mode === 'login' ? { 'data-autofocus': true } : {})}
                    />

                    {mode === 'signup' && (
                      <>
                        <div>
                          <label htmlFor="discipline" className="label">
                            ¿Qué haces?
                          </label>
                          <select
                            id="discipline"
                            name="discipline"
                            value={values.discipline}
                            onChange={handleChange('discipline')}
                            aria-invalid={errors.discipline ? 'true' : undefined}
                            aria-describedby={errors.discipline ? 'discipline-error' : undefined}
                            className={`field ${errors.discipline ? 'field-invalid' : ''}`}
                          >
                            <option value="">Elige una categoría</option>
                            {artistDisciplines.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                          {errors.discipline && (
                            <FieldError id="discipline-error">{errors.discipline}</FieldError>
                          )}
                        </div>

                        <TextField
                          id="portfolio"
                          label="Portafolio o redes"
                          type="url"
                          value={values.portfolio}
                          error={errors.portfolio}
                          onChange={handleChange('portfolio')}
                          autoComplete="url"
                          placeholder="https://instagram.com/tu_arte"
                          optional
                        />
                      </>
                    )}

                    {mode === 'login' && (
                      <TextField
                        id="password"
                        label="Contraseña"
                        type="password"
                        value={values.password}
                        error={errors.password}
                        onChange={handleChange('password')}
                        autoComplete="current-password"
                        placeholder="••••••••"
                      />
                    )}

                    <button type="submit" className="btn-primary btn-lg mt-1 w-full">
                      {mode === 'signup' ? 'Crear cuenta' : 'Entrar'}
                    </button>

                    <p className="text-center text-sm text-yuca-ink-soft">
                      {mode === 'signup' ? '¿Ya tienes cuenta?' : '¿Primera vez por aquí?'}{' '}
                      <button
                        type="button"
                        onClick={() => goToMode(mode === 'signup' ? 'login' : 'signup')}
                        className="rounded font-bold text-yuca-green-deep underline underline-offset-2 hover:text-yuca-green"
                      >
                        {mode === 'signup' ? 'Inicia sesión' : 'Crea tu cuenta'}
                      </button>
                    </p>
                  </form>
                )}
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
