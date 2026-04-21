// inc/install.js
// Gère l'installation PWA via le prompt du navigateur (beforeinstallprompt)
export default function installApp() {
    const $installBox = document.querySelector('.box-install');
    if (!$installBox) return; // rien à faire si la boîte n'existe pas

    // éléments internes
    const $installBtn = $installBox.querySelector('.install-btn');
    const $closeBtn = $installBox.querySelector('.cross.close');

    // Par défaut on laisse la boîte visible pour que l'utilisateur voie le bouton
    // (si vous préférez la cacher et ne l'afficher que sur beforeinstallprompt,
    // remettez la ligne ci-dessous)
    // $installBox.classList.add('hidden');

    let deferredPrompt = null;

    // 1) On écoute l'événement standard qui signale qu'on peut proposer l'installation
    window.addEventListener('beforeinstallprompt', (e) => {
        // Empêche l'affichage automatique du mini-infobulle natif
        e.preventDefault();
        deferredPrompt = e;

        // Affiche notre propre UI d'installation
        $installBox.classList.remove('hidden');
    });

    // 2) Clic sur notre bouton "Installer" -> déclenche le prompt natif
    if ($installBtn) {
        $installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                // Affiche la boîte native
                deferredPrompt.prompt();

                // Attend le choix de l'utilisateur
                const { outcome } = await deferredPrompt.userChoice;
                console.log('Install choice outcome:', outcome);

                // On cache notre boîte dans tous les cas
                $installBox.classList.add('hidden');

                // Ne réutilise pas l'événement
                deferredPrompt = null;
                return;
            }

            // Fallback : le navigateur n'a pas envoyé beforeinstallprompt
            // On propose des instructions génériques (ex: iOS manual) ou un message.
            // Vous pouvez remplacer alert() par un affichage UI plus élégant.
            alert("Ce navigateur ne propose pas de prompt d'installation automatique. Sur iOS, utilisez 'Partager' → 'Ajouter à l'écran d'accueil'.");
        });
    }

    // 3) Fermeture manuelle de la boîte
    if ($closeBtn) {
        $closeBtn.addEventListener('click', () => {
            $installBox.classList.add('hidden');
        });
    }

    // 4) Si l'application est installée, on masque l'UI
    window.addEventListener('appinstalled', () => {
        console.log('Application installed');
        $installBox.classList.add('hidden');
    });

    // Optionnel : si le navigateur ne fournira jamais beforeinstallprompt (ex: iOS),
    // on peut afficher un message différent ou laisser invisible la boîte.
}
