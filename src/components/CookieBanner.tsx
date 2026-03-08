import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie } from "lucide-react";
import { useI18n } from "../i18n";

const CONSENT_KEY = "text:legal-consent:v1";

type Props = {
  onOpenPolicy: () => void;
};

export default function CookieBanner({ onOpenPolicy }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(CONSENT_KEY);
      setOpen(v !== "1");
    } catch {
      setOpen(true);
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(CONSENT_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-[70] p-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="mx-auto w-[min(860px,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-zinc-950/80 p-3 shadow-2xl backdrop-blur-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="mt-0.5 grid h-10 w-10 flex-none place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/80">
                  <Cookie className="h-4 w-4" />
                </div>

                <div className="min-w-0 text-xs leading-relaxed text-white/70">
                  {t("cookie.bannerText")}{" "}
                  <button
                    type="button"
                    onClick={onOpenPolicy}
                    className="no-drag inline-flex items-center text-white/85 underline decoration-white/20 underline-offset-4 transition hover:text-white"
                  >
                    {t("editor.policyLink")}
                  </button>
                </div>
              </div>

              <div className="flex flex-none items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={accept}
                  className="no-drag h-10 rounded-2xl border border-white/10 bg-white/10 px-4 text-xs font-semibold text-white/90 transition hover:bg-white/15 hover:text-white"
                >
                  {t("cookie.ok")}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
