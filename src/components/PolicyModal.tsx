import { motion } from "framer-motion";
import { X } from "lucide-react";

type Props = {
  onClose: () => void;
};

const UPDATED_AT = "23/01/2026";

export default function PolicyModal({ onClose }: Props) {
  return (
    <motion.div
      className="fixed inset-0 z-[80]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Chiudi"
        className="absolute inset-0 cursor-default bg-black/70"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Cookie e Privacy Policy"
        className={
          "absolute left-1/2 top-1/2 w-[min(860px,calc(100vw-2rem))] " +
          "-translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl " +
          "border border-white/10 bg-zinc-950/90 shadow-2xl backdrop-blur-2xl"
        }
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <div className="text-base font-semibold text-white/90">Cookie &amp; Privacy Policy</div>
            <div className="mt-0.5 text-xs text-white/45">Ultimo aggiornamento: {UPDATED_AT}</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="no-drag inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Chiudi finestra"
            title="Chiudi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto px-5 py-5">
          <article className="prose prose-invert prose-zinc max-w-none prose-p:leading-relaxed">
            <p>
              Questa informativa descrive come (t)ext tratta i dati personali e come utilizza cookie o strumenti
              equivalenti durante l&apos;uso dell&apos;app. (t)ext è un editor di Markdown che funziona in locale: i contenuti
              restano sul tuo dispositivo.
            </p>

            <h2>Titolare del trattamento</h2>
            <p>
              Il titolare del trattamento è <strong>Matteo Caputo</strong> ("Titolare"). Puoi contattare il Titolare tramite
              il form di contatto presente su matteocaputo.dev.
            </p>

            <h2>Dati trattati</h2>
            <ul>
              <li>
                <strong>Contenuti e documenti</strong>: testo, titoli e note che crei nell&apos;editor.
              </li>
              <li>
                <strong>Dati tecnici</strong>: informazioni minime necessarie al funzionamento (ad esempio preferenze e stato
                dell&apos;app).
              </li>
            </ul>

            <h2>Dove vengono salvati i dati</h2>
            <p>
              (t)ext salva i documenti <strong>in locale</strong> sul tuo dispositivo utilizzando la memoria del browser
              (localStorage) o lo storage equivalente in Electron. Il Titolare <strong>non riceve</strong> né conserva i tuoi contenuti
              su server remoti.
            </p>
            <p>
              Se usi le funzioni di <strong>Import</strong> o <strong>Export</strong>, i file vengono letti/scritti sul tuo computer tramite i
              normali strumenti del sistema operativo (se stai usando la versione Electron) o tramite download/upload del
              browser.
            </p>

            <h2>Cookie e strumenti equivalenti</h2>
            <p>
              (t)ext non usa cookie di profilazione né strumenti di tracciamento. Vengono usati solo <strong>strumenti tecnici</strong>
              (come localStorage) per:
            </p>
            <ul>
              <li>memorizzare i documenti e l&apos;ultimo stato dell&apos;app;</li>
              <li>migliorare la stabilità dell&apos;esperienza (ad esempio evitare perdite di contenuto).</li>
            </ul>
            <p>
              Puoi cancellare questi dati in qualsiasi momento eliminando i dati del sito/app dalle impostazioni del tuo
              browser o del sistema.
            </p>

            <h2>Base giuridica</h2>
            <p>
              Il trattamento è basato sull&apos;esecuzione del servizio richiesto (fornire l&apos;editor e salvare in locale i
              documenti) e, ove applicabile, sul legittimo interesse del Titolare a garantire sicurezza e corretto
              funzionamento.
            </p>

            <h2>Condivisione e trasferimenti</h2>
            <p>
              Il Titolare non condivide i tuoi contenuti con terze parti perché non vengono inviati a server. Se utilizzi la
              versione web, il provider di hosting potrebbe raccogliere log tecnici (es. IP, user-agent) per motivi di
              sicurezza e prestazioni: tali dati sono gestiti dal provider secondo le proprie policy.
            </p>

            <h2>Conservazione</h2>
            <p>
              I documenti restano sul tuo dispositivo finché non li cancelli dall&apos;app o finché non elimini i dati del
              browser/app.
            </p>

            <h2>Diritti dell&apos;interessato</h2>
            <p>
              In base al GDPR, hai diritto di ottenere accesso, rettifica, cancellazione, limitazione, opposizione e
              portabilità dei dati, nei limiti applicabili. Per esercitare i diritti puoi contattare il Titolare tramite il
              form su matteocaputo.dev.
            </p>

            <h2>Aggiornamenti</h2>
            <p>
              Questa informativa può essere aggiornata. La data di "Ultimo aggiornamento" indica la versione più recente.
            </p>
          </article>
        </div>
      </motion.div>
    </motion.div>
  );
}
