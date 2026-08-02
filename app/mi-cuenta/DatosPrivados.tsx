'use client';

import { useState, useTransition } from 'react';
import { Lock, Pencil, ShieldAlert } from 'lucide-react';
import { DEPARTAMENTOS, GENEROS, type DatosPrivados as Datos } from '@/lib/types';
import { situacionEdad } from '@/lib/edad';
import { actualizarDatosPrivadosAction } from './acciones';

/** Fecha larga a partir de un `date` de Postgres (`2001-03-29`), sin zona horaria. */
function fechaLegible(iso: string): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString('es-BO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Datos personales, sólo para el equipo.
 *
 * Van aparte del perfil público para que quede explícito en la interfaz qué se
 * publica y qué no: son los datos con los que el staff identifica a quien pagó
 * una mesa, y no salen nunca a la web.
 */
export default function DatosPrivados({
  datos,
  tienePermiso,
}: {
  datos: Datos;
  tienePermiso: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [pendiente, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);
  // Se recalcula mientras escribe la fecha, para que los campos del tutor
  // aparezcan en el momento en que hacen falta y no después de guardar.
  const [nacimiento, setNacimiento] = useState(datos.birthDate ?? '');

  const situacion = situacionEdad(nacimiento);

  const enviar = (formData: FormData) => {
    startTransition(async () => {
      const resultado = await actualizarDatosPrivadosAction(formData);
      setMensaje(resultado.mensaje);
      if (resultado.ok) setEditando(false);
    });
  };

  const campos = [
    { label: 'Nombre completo', valor: datos.fullName },
    { label: 'Fecha de nacimiento', valor: datos.birthDate ? fechaLegible(datos.birthDate) : null },
    { label: 'Correo electrónico', valor: datos.contactEmail },
    { label: 'Teléfono', valor: datos.phone },
    { label: 'Género', valor: datos.gender },
    { label: 'Departamento', valor: datos.department },
    { label: 'Tutor', valor: datos.guardianName },
    { label: 'Contacto del tutor', valor: datos.guardianContact },
  ];

  const vacio = campos.every((campo) => !campo.valor);

  return (
    <section className="card p-6 sm:p-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-1.5 text-xl">
            <Lock size={17} className="text-yuca-ink-soft" aria-hidden="true" />
            Información personal
          </h2>
          <p className="text-sm text-yuca-ink-soft">
            Esto lo ve sólo el equipo de Proyecto Yuca, nunca aparece en la web.
          </p>
        </div>
        {!editando && (
          <button type="button" onClick={() => setEditando(true)} className="btn-ghost btn-sm shrink-0">
            <Pencil size={15} aria-hidden="true" />
            Editar
          </button>
        )}
      </div>

      {editando ? (
        <form action={enviar} className="flex flex-col gap-4">
          <div>
            <label htmlFor="fullName" className="label">
              Nombre completo
            </label>
            <input
              id="fullName"
              name="fullName"
              defaultValue={datos.fullName ?? ''}
              placeholder="Como figura en tu carnet"
              className="field"
            />
            <p className="mt-1 text-xs text-yuca-ink-soft">
              Sirve para cotejar tu transferencia; no se publica.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="birthDate" className="label">
                Fecha de nacimiento
              </label>
              <input
                id="birthDate"
                name="birthDate"
                type="date"
                value={nacimiento}
                onChange={(event) => setNacimiento(event.target.value)}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="phone" className="label">
                Teléfono
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={datos.phone ?? ''}
                placeholder="Tu WhatsApp"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="contactEmail" className="label">
                Correo electrónico
              </label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={datos.contactEmail ?? ''}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="department" className="label">
                Departamento
              </label>
              <select
                id="department"
                name="department"
                defaultValue={datos.department ?? ''}
                className="field"
              >
                <option value="">Sin especificar</option>
                {DEPARTAMENTOS.map((departamento) => (
                  <option key={departamento} value={departamento}>
                    {departamento}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="gender" className="label">
              Género
              <span className="ml-1 font-normal text-yuca-ink-soft">(opcional)</span>
            </label>
            <select id="gender" name="gender" defaultValue={datos.gender ?? ''} className="field">
              <option value="">Sin especificar</option>
              {GENEROS.map((genero) => (
                <option key={genero} value={genero}>
                  {genero}
                </option>
              ))}
            </select>
          </div>

          {situacion === 'menor' && (
            <p className="flex items-start gap-2 rounded-2xl bg-yuca-coral/10 p-3 text-sm text-yuca-ink">
              <ShieldAlert size={17} className="mt-0.5 shrink-0 text-yuca-coral-deep" aria-hidden="true" />
              Para tener mesa en la feria hay que tener 17 años cumplidos. Puedes dejar tus datos
              guardados, pero todavía no vas a poder apartar una.
            </p>
          )}

          {situacion === 'requiere-permiso' && (
            <fieldset className="rounded-2xl border border-yuca-mustard/40 bg-yuca-mustard/5 p-4">
              <legend className="px-1 text-sm font-extrabold text-yuca-ink">
                Permiso del tutor
              </legend>
              <p className="mb-3 text-sm text-yuca-ink-soft">
                Al tener 17 o 18 años necesitas el permiso de tu padre, madre o tutor legal. El
                equipo te va a pedir el papel firmado aparte.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="guardianName" className="label">
                    Nombre del tutor
                  </label>
                  <input
                    id="guardianName"
                    name="guardianName"
                    defaultValue={datos.guardianName ?? ''}
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor="guardianContact" className="label">
                    Su teléfono o correo
                  </label>
                  <input
                    id="guardianContact"
                    name="guardianContact"
                    defaultValue={datos.guardianContact ?? ''}
                    className="field"
                  />
                </div>
              </div>

              <label className="mt-3 flex items-start gap-2 text-sm text-yuca-ink">
                <input
                  type="checkbox"
                  name="declaraPermiso"
                  defaultChecked={tienePermiso}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-yuca-green"
                />
                Declaro que cuento con el permiso de mi tutor para participar como expositor.
              </label>
            </fieldset>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <button type="submit" disabled={pendiente} className="btn-primary btn-lg flex-1">
              {pendiente ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={() => setEditando(false)} className="btn-ghost btn-lg">
              Cancelar
            </button>
          </div>
        </form>
      ) : vacio ? (
        <p className="text-sm leading-relaxed text-yuca-ink-soft">
          Todavía no cargaste tus datos. El equipo los necesita para poder verificar tu perfil y
          cotejar tu pago.
        </p>
      ) : (
        <dl className="flex flex-col gap-2 text-sm">
          {campos.map((campo) => (
            <div key={campo.label} className="flex flex-wrap gap-x-2">
              <dt className="w-44 shrink-0 font-bold text-yuca-ink">{campo.label}</dt>
              <dd className="min-w-0 text-yuca-ink-soft">
                {campo.valor ?? <span className="italic">sin cargar</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {mensaje && (
        <p className="mt-4 rounded-2xl bg-yuca-cream/60 p-3 text-sm text-yuca-ink" role="status">
          {mensaje}
        </p>
      )}
    </section>
  );
}
