import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useI18n } from "../i18n";

type Props = {
  onClose: () => void;
};

const UPDATED_AT = "25/01/2026";

export default function PolicyModal({ onClose }: Props) {
  const { lang } = useI18n();

  const isIt = lang === "it";

  return createPortal(
    <motion.div
      // Center with flex (not translate) because Framer Motion animates `transform`
      // and would override Tailwind translate utilities.
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label={isIt ? "Chiudi" : "Close"}
        className="absolute inset-0 z-0 cursor-default bg-black/70"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Cookie & Privacy Policy"
        className={
          "relative z-10 w-full max-w-[860px] max-h-[calc(100vh-2rem)] overflow-hidden rounded-3xl " +
          "border border-white/10 bg-zinc-950/90 shadow-2xl backdrop-blur-2xl " +
          "flex flex-col"
        }
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <div className="text-base font-semibold text-white/90">Cookie &amp; Privacy Policy</div>
            <div className="mt-0.5 text-xs text-white/45">
              {isIt ? "Ultimo aggiornamento" : "Last updated"}: {UPDATED_AT}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="no-drag inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label={isIt ? "Chiudi finestra" : "Close dialog"}
            title={isIt ? "Chiudi" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
          <article className="prose prose-invert prose-zinc max-w-none prose-p:leading-relaxed">
            {isIt ? (
              <>
                <p>
                  Questa informativa descrive come (t)ext tratta i dati personali e come utilizza cookie o strumenti
                  equivalenti durante l&apos;uso dell&apos;app. (t)ext è un editor di Markdown che funziona in locale: i contenuti
                  restano sul tuo dispositivo.
                </p>

                <h2>Titolare del trattamento</h2>
                <p>
                  Il titolare del trattamento è <strong>Renato Caputo</strong> ("Titolare"). Puoi contattare il Titolare tramite
                  i contatti indicati nell'app o sul sito di riferimento.
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
                  (localStorage) o lo storage equivalente in Electron. Il Titolare <strong>non riceve</strong> né conserva i tuoi
                  contenuti su server remoti.
                </p>
                <p>
                  Se usi le funzioni di <strong>Import</strong> o <strong>Export</strong>, i file vengono letti/scritti sul tuo computer
                  tramite i normali strumenti del sistema operativo (se stai usando la versione Electron) o tramite download/upload
                  del browser.
                </p>

                <h2>Cookie e strumenti equivalenti</h2>
                <p>
                  (t)ext non usa cookie di profilazione né strumenti di tracciamento. Vengono usati solo <strong>strumenti tecnici</strong>{" "}
                  (come localStorage) per:
                </p>
                <ul>
                  <li>memorizzare i documenti e l&apos;ultimo stato dell&apos;app;</li>
                  <li>migliorare la stabilità dell&apos;esperienza (ad esempio evitare perdite di contenuto).</li>
                </ul>
<h3>Statistiche anonime (Umami)</h3>
<p>
  Nella <strong>versione web</strong>, (t)ext può utilizzare <strong>Umami Analytics</strong> per misurare in modo
  aggregato le visite e migliorare l&apos;esperienza. Umami è configurato in modalità privacy-friendly:
</p>
<ul>
  <li>non usa cookie di profilazione;</li>
  <li>non raccoglie dati personali identificabili;</li>
  <li>raccoglie solo statistiche aggregate (pagine viste, dispositivo/browser, durata indicativa della visita).</li>
</ul>
<p>
  Base giuridica: <strong>legittimo interesse</strong> del Titolare (art. 6 par. 1 lett. f GDPR). Se preferisci,
  puoi bloccare gli script di analytics tramite le impostazioni del browser o estensioni di privacy.
</p>
                <p>
                  Puoi cancellare questi dati in qualsiasi momento eliminando i dati del sito/app dalle impostazioni del tuo browser o del sistema.
                </p>

                <h2>Base giuridica</h2>
                <p>
                  Il trattamento è basato sull&apos;esecuzione del servizio richiesto (fornire l&apos;editor e salvare in locale i documenti) e,
                  ove applicabile, sul legittimo interesse del Titolare a garantire sicurezza e corretto funzionamento.
                </p>

                <h2>Condivisione e trasferimenti</h2>
                <p>
                  Il Titolare non condivide i tuoi contenuti con terze parti perché non vengono inviati a server. Se utilizzi la versione web,
                  il provider di hosting potrebbe raccogliere log tecnici (es. IP, user-agent) per motivi di sicurezza e prestazioni: tali dati
                  sono gestiti dal provider secondo le proprie policy.
                </p>

                <h2>Conservazione</h2>
                <p>
                  I documenti restano sul tuo dispositivo finché non li cancelli dall&apos;app o finché non elimini i dati del browser/app.
                </p>

                <h2>Diritti dell&apos;interessato</h2>
                <p>
                  In base al GDPR, hai diritto di ottenere accesso, rettifica, cancellazione, limitazione, opposizione e portabilità dei dati,
                  nei limiti applicabili. Per esercitare i diritti puoi contattare il Titolare tramite i contatti indicati nell'app o sul sito di riferimento.
                </p>

                <h2>Aggiornamenti</h2>
                <p>
                  Questa informativa può essere aggiornata. La data di "Ultimo aggiornamento" indica la versione più recente.
                </p>
              </>
            ) : (
              <>
                <p>
                  This notice describes how (t)ext processes personal data and how it uses cookies or equivalent tools during the use of the app.
                  (t)ext is a Markdown editor that works locally: your content stays on your device.
                </p>

                <h2>Data controller</h2>
                <p>
                  The data controller is <strong>Renato Caputo</strong> ("Controller"). You can contact the Controller using the contact details provided in the app or on the relevant website.
                </p>

                <h2>Data we process</h2>
                <ul>
                  <li>
                    <strong>Content and documents</strong>: text, titles and notes you create in the editor.
                  </li>
                  <li>
                    <strong>Technical data</strong>: minimal information required for the app to work (e.g. preferences and app state).
                  </li>
                </ul>

                <h2>Where data is stored</h2>
                <p>
                  (t)ext saves documents <strong>locally</strong> on your device using browser storage (localStorage) or the equivalent storage in Electron.
                  The Controller <strong>does not receive</strong> or store your content on remote servers.
                </p>
                <p>
                  If you use <strong>Import</strong> or <strong>Export</strong>, files are read/written on your computer through the operating system (Electron)
                  or via the browser&apos;s upload/download mechanisms.
                </p>

                <h2>Cookies and equivalent tools</h2>
                <p>
                  (t)ext does not use profiling cookies or tracking tools. It only uses <strong>technical storage</strong> (such as localStorage) to:
                </p>
                <ul>
                  <li>store documents and the last app state;</li>
                  <li>improve stability (for example, to prevent content loss).</li>
                </ul>
<h3>Anonymous analytics (Umami)</h3>
<p>
  In the <strong>web version</strong>, (t)ext may use <strong>Umami Analytics</strong> to measure visits in an
  aggregated way and improve the experience. Umami is configured with a privacy-first approach:
</p>
<ul>
  <li>no profiling cookies;</li>
  <li>no collection of directly identifiable personal data;</li>
  <li>only aggregated metrics (page views, device/browser, approximate visit duration).</li>
</ul>
<p>
  Legal basis: the Controller&apos;s <strong>legitimate interest</strong> (Art. 6(1)(f) GDPR). If you prefer, you can
  block analytics scripts through your browser settings or privacy extensions.
</p>
                <p>
                  You can delete this data at any time by clearing the site/app data from your browser or system settings.
                </p>

                <h2>Legal basis</h2>
                <p>
                  Processing is based on providing the requested service (running the editor and saving documents locally) and, where applicable,
                  the Controller&apos;s legitimate interest in ensuring security and proper operation.
                </p>

                <h2>Sharing and transfers</h2>
                <p>
                  The Controller does not share your content with third parties because it is not sent to servers. If you use the web version,
                  the hosting provider may collect technical logs (e.g. IP address, user agent) for security and performance; such data is handled by
                  the provider according to its own policies.
                </p>

                <h2>Retention</h2>
                <p>
                  Documents remain on your device until you delete them from the app or clear the browser/app data.
                </p>

                <h2>Your rights</h2>
                <p>
                  Under the GDPR, you may have the right to access, rectify, erase, restrict or object to processing, and to data portability, where applicable.
                  To exercise your rights, contact the Controller using the contact details provided in the app or on the relevant website.
                </p>

                <h2>Updates</h2>
                <p>
                  This notice may be updated. The "Last updated" date indicates the most recent version.
                </p>
              </>
            )}
          </article>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
